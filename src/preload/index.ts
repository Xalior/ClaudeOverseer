import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('overseer', {
  getProjectsDir: () => ipcRenderer.invoke('overseer:get-projects-dir'),
  scanProjects: (claudeDir?: string) => ipcRenderer.invoke('overseer:scan-projects', claudeDir),
  discoverSessions: (projectEncodedName: string, claudeDir?: string) =>
    ipcRenderer.invoke('overseer:discover-sessions', projectEncodedName, claudeDir)
})
