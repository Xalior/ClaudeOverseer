import { ipcMain, BrowserWindow } from 'electron'
import { homedir } from 'os'
import { join } from 'path'
import { readFile } from 'fs/promises'
import { scanProjects } from './services/project-scanner'
import { discoverSessions } from './services/session-discovery'
import { parseJsonlFile } from './services/jsonl-parser'
import { formatMessages } from './services/message-formatter'
import { JsonlWatcher } from './services/jsonl-watcher'
import { DirectoryWatcher } from './services/directory-watcher'
import { encodePath } from './utils/path-encoder'

const DEFAULT_CLAUDE_DIR = join(homedir(), '.claude', 'projects')

// Active watchers keyed by file path
const activeWatchers = new Map<string, JsonlWatcher>()

// Directory watcher for the entire projects tree
let directoryWatcher: DirectoryWatcher | null = null

/**
 * Register all IPC handlers for the main process
 */
export function registerIpcHandlers(): void {
  // Get Claude projects directory from paths.txt or use default
  ipcMain.handle('overseer:get-projects-dir', async () => {
    try {
      // Check for test override first
      const pathsFile = process.env.PATHS_FILE || join(process.cwd(), 'paths.txt')
      const content = await readFile(pathsFile, 'utf-8')
      const match = content.match(/Claude Project Dir = (.+)/)
      if (match) {
        const dir = match[1].replace('~', homedir())
        return dir
      }
    } catch {
      // Fall through to default
    }
    return DEFAULT_CLAUDE_DIR
  })

  // Scan for projects
  ipcMain.handle('overseer:scan-projects', async (_event, claudeDir?: string) => {
    const dir = claudeDir || DEFAULT_CLAUDE_DIR
    return await scanProjects(dir)
  })

  // Discover sessions for a project
  ipcMain.handle('overseer:discover-sessions', async (_event, projectEncodedName: string, claudeDir?: string) => {
    const dir = claudeDir || DEFAULT_CLAUDE_DIR
    const projectPath = join(dir, projectEncodedName)
    return await discoverSessions(projectPath)
  })

  // Get formatted messages for a session
  ipcMain.handle('overseer:get-messages', async (_event, sessionFilePath: string) => {
    const parsed = await parseJsonlFile(sessionFilePath)
    return formatMessages(parsed)
  })

  // Watch a session file for new messages
  ipcMain.handle('overseer:watch-session', async (_event, sessionFilePath: string) => {
    // Stop any existing watcher for this file
    const existing = activeWatchers.get(sessionFilePath)
    if (existing) {
      await existing.stop()
    }

    const watcher = new JsonlWatcher(sessionFilePath, {
      onNewMessages: (messages) => {
        const formatted = formatMessages(messages)
        // Send to all renderer windows
        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send('overseer:new-messages', {
            filePath: sessionFilePath,
            messages: formatted.messages,
            usage: formatted.totalUsage
          })
        }
      },
      onError: (error) => {
        console.error('Watcher error:', error.message)
      }
    })

    activeWatchers.set(sessionFilePath, watcher)
    await watcher.start()
  })

  // Stop watching a session file
  ipcMain.handle('overseer:unwatch-session', async (_event, sessionFilePath: string) => {
    const watcher = activeWatchers.get(sessionFilePath)
    if (watcher) {
      await watcher.stop()
      activeWatchers.delete(sessionFilePath)
    }
  })

  // Start directory watcher for entire projects tree
  ipcMain.handle('overseer:start-directory-watch', async () => {
    // Stop existing watcher if running
    if (directoryWatcher) {
      await directoryWatcher.stop()
      directoryWatcher = null
    }

    // Determine projects directory (same logic as get-projects-dir handler)
    let projectsDir = DEFAULT_CLAUDE_DIR
    try {
      const pathsFile = process.env.PATHS_FILE || join(process.cwd(), 'paths.txt')
      const content = await readFile(pathsFile, 'utf-8')
      const match = content.match(/Claude Project Dir = (.+)/)
      if (match) {
        projectsDir = match[1].replace('~', homedir())
      }
    } catch {
      // Use default
    }

    // Create and start directory watcher
    directoryWatcher = new DirectoryWatcher(projectsDir, {
      onProjectsChanged: () => {
        // Broadcast to all windows
        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send('overseer:projects-changed')
        }
      },
      onSessionsChanged: (projectEncodedName) => {
        // Broadcast to all windows
        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send('overseer:sessions-changed', { projectEncodedName })
        }
      },
      onError: (error) => {
        console.error('Directory watcher error:', error.message)
      }
    })

    await directoryWatcher.start()
  })

  // Stop directory watcher
  ipcMain.handle('overseer:stop-directory-watch', async () => {
    if (directoryWatcher) {
      await directoryWatcher.stop()
      directoryWatcher = null
    }
  })
}
