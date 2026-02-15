import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('overseer', {
  getProjectsDir: () => ipcRenderer.invoke('overseer:get-projects-dir'),
  scanProjects: (claudeDir?: string) => ipcRenderer.invoke('overseer:scan-projects', claudeDir),
  discoverSessions: (projectEncodedName: string, claudeDir?: string) =>
    ipcRenderer.invoke('overseer:discover-sessions', projectEncodedName, claudeDir),
  getMessages: (sessionFilePath: string) =>
    ipcRenderer.invoke('overseer:get-messages', sessionFilePath)
})
