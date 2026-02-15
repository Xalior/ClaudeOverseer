import { ipcMain } from 'electron'
import { homedir } from 'os'
import { join } from 'path'
import { readFile } from 'fs/promises'
import { scanProjects } from './services/project-scanner'
import { discoverSessions } from './services/session-discovery'
import { encodePath } from './utils/path-encoder'

const DEFAULT_CLAUDE_DIR = join(homedir(), '.claude', 'projects')

/**
 * Register all IPC handlers for the main process
 */
export function registerIpcHandlers(): void {
  // Get Claude projects directory from paths.txt or use default
  ipcMain.handle('overseer:get-projects-dir', async () => {
    try {
      const pathsFile = join(process.cwd(), 'paths.txt')
      const content = await readFile(pathsFile, 'utf-8')
      const match = content.match(/Claude Project Dir = (.+)/)
      if (match) {
        return match[1].replace('~', homedir())
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
}
