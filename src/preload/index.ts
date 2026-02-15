import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('overseer', {
  getProjectsDir: () => ipcRenderer.invoke('overseer:get-projects-dir'),
  scanProjects: (claudeDir?: string) => ipcRenderer.invoke('overseer:scan-projects', claudeDir),
  discoverSessions: (projectEncodedName: string, claudeDir?: string) =>
    ipcRenderer.invoke('overseer:discover-sessions', projectEncodedName, claudeDir),
  getMessages: (sessionFilePath: string) =>
    ipcRenderer.invoke('overseer:get-messages', sessionFilePath),
  watchSession: (sessionFilePath: string) =>
    ipcRenderer.invoke('overseer:watch-session', sessionFilePath),
  unwatchSession: (sessionFilePath: string) =>
    ipcRenderer.invoke('overseer:unwatch-session', sessionFilePath),
  onNewMessages: (callback: (data: unknown) => void) => {
    const handler = (_event: unknown, data: unknown) => callback(data)
    ipcRenderer.on('overseer:new-messages', handler)
    return () => {
      ipcRenderer.removeListener('overseer:new-messages', handler)
    }
  }
})
