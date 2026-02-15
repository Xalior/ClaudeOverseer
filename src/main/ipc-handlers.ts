import { ipcMain, BrowserWindow } from 'electron'
import { scanProjects, getClaudeProjectsDir } from './services/project-scanner'
import { discoverSessions } from './services/session-discovery'
import { join } from 'path'
import { writeFile } from 'fs/promises'
import { tmpdir } from 'os'

/**
 * Register all IPC handlers for the main process
 */
export function registerIpcHandlers(): void {
  // Project discovery
  ipcMain.handle('overseer:get-projects', async () => {
    return await scanProjects()
  })

  // Session discovery
  ipcMain.handle('overseer:get-sessions', async (_event, projectEncodedName: string) => {
    const projectsDir = await getClaudeProjectsDir()
    const projectDir = join(projectsDir, projectEncodedName)
    return await discoverSessions(projectDir)
  })

  // Message loading (placeholder for Phase 3)
  ipcMain.handle('overseer:get-messages', async (_event, sessionFilePath: string) => {
    // TODO: Implement in Phase 3
    return []
  })

  // Team data (placeholder for Phase 5)
  ipcMain.handle('overseer:get-team-config', async (_event, teamName: string) => {
    // TODO: Implement in Phase 5
    return null
  })

  ipcMain.handle('overseer:get-team-tasks', async (_event, teamName: string) => {
    // TODO: Implement in Phase 5
    return []
  })

  // Screenshot capability for debugging
  ipcMain.handle('overseer:capture-screenshot', async () => {
    const window = BrowserWindow.getAllWindows()[0]
    if (!window) return null

    const image = await window.webContents.capturePage()
    const screenshotPath = join(tmpdir(), `overseer-screenshot-${Date.now()}.png`)
    await writeFile(screenshotPath, image.toPNG())

    console.log('Screenshot saved to:', screenshotPath)
    return screenshotPath
  })

  console.log('✓ IPC handlers registered')
}
