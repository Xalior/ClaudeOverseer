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
  },
  startDirectoryWatch: () => ipcRenderer.invoke('overseer:start-directory-watch'),
  stopDirectoryWatch: () => ipcRenderer.invoke('overseer:stop-directory-watch'),
  onProjectsChanged: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('overseer:projects-changed', handler)
    return () => {
      ipcRenderer.removeListener('overseer:projects-changed', handler)
    }
  },
  onSessionsChanged: (callback: (data: { projectEncodedName: string }) => void) => {
    const handler = (_event: unknown, data: { projectEncodedName: string }) => callback(data)
    ipcRenderer.on('overseer:sessions-changed', handler)
    return () => {
      ipcRenderer.removeListener('overseer:sessions-changed', handler)
    }
  },
  loadPreferences: () => ipcRenderer.invoke('overseer:load-preferences'),
  savePreferences: (prefs: Record<string, unknown>) =>
    ipcRenderer.invoke('overseer:save-preferences', prefs),
  getSessionCosts: (projectDir: string) =>
    ipcRenderer.invoke('overseer:get-session-costs', projectDir),
  getAllProjectCosts: (projectDirs: string[]) =>
    ipcRenderer.invoke('overseer:get-all-project-costs', projectDirs),
  onCostUpdated: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('overseer:cost-updated', handler)
    return () => {
      ipcRenderer.removeListener('overseer:cost-updated', handler)
    }
  }
})
