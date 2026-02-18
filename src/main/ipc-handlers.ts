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
import { loadPreferences, savePreferencesSync } from './services/preferences'
import type { AppPreferences } from './services/preferences'
import type { CostCache } from './services/cost-cache'

const DEFAULT_CLAUDE_DIR = join(homedir(), '.claude', 'projects')

// Active watchers keyed by file path
const activeWatchers = new Map<string, JsonlWatcher>()

// Directory watcher for the entire projects tree
let directoryWatcher: DirectoryWatcher | null = null

/**
 * Register all IPC handlers for the main process
 */
export function registerIpcHandlers(costCache: CostCache): void {
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
        // Recompute cost for this session
        costCache.recomputeSession(sessionFilePath).then(() => {
          costCache.broadcastCostUpdate()
        })
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
          try { win.webContents.send('overseer:projects-changed') } catch { /* frame not ready */ }
        }
      },
      onSessionsChanged: (projectEncodedName) => {
        // Broadcast to all windows
        for (const win of BrowserWindow.getAllWindows()) {
          try { win.webContents.send('overseer:sessions-changed', { projectEncodedName }) } catch { /* frame not ready */ }
        }
        // Recompute costs for this project's sessions
        const projectPath = join(projectsDir, projectEncodedName)
        discoverSessions(projectPath).then((sessions) => {
          const paths = sessions.map((s) => s.filePath)
          costCache.recomputeAllStale(paths).then(() => {
            costCache.broadcastCostUpdate()
          })
        }).catch(() => {})
      },
      onError: (error) => {
        console.error('Directory watcher error:', error.message)
      }
    })

    await directoryWatcher.start()

    // Background scan: recompute costs for all sessions
    setImmediate(async () => {
      try {
        const projects = await scanProjects(projectsDir)
        const allPaths: string[] = []
        for (const project of projects) {
          const sessions = await discoverSessions(join(projectsDir, project.encodedName))
          for (const s of sessions) allPaths.push(s.filePath)
        }
        await costCache.recomputeAllStale(allPaths)
        costCache.broadcastCostUpdate()
      } catch (err) {
        console.error('Background cost scan failed:', err)
      }
    })
  })

  // Stop directory watcher
  ipcMain.handle('overseer:stop-directory-watch', async () => {
    if (directoryWatcher) {
      await directoryWatcher.stop()
      directoryWatcher = null
    }
  })

  // Load preferences
  ipcMain.handle('overseer:load-preferences', async () => {
    return loadPreferences()
  })

  // Save preferences (partial merge)
  ipcMain.handle('overseer:save-preferences', async (_event, prefs: Partial<AppPreferences>) => {
    savePreferencesSync(prefs)
  })

  // Get session costs for a project directory
  ipcMain.handle('overseer:get-session-costs', async (_event, projectDir: string) => {
    return costCache.getSessionCosts(projectDir)
  })

  // Get aggregated costs for multiple project directories
  ipcMain.handle('overseer:get-all-project-costs', async (_event, projectDirs: string[]) => {
    return costCache.getAllProjectCosts(projectDirs)
  })
}
