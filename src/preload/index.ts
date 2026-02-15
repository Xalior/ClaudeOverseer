import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Project discovery
  getProjects: () => ipcRenderer.invoke('overseer:get-projects'),
  getSessions: (projectDir: string) => ipcRenderer.invoke('overseer:get-sessions', projectDir),

  // Message loading
  getMessages: (sessionFilePath: string) => ipcRenderer.invoke('overseer:get-messages', sessionFilePath),

  // Live watching
  watchSession: (sessionFilePath: string) => ipcRenderer.send('overseer:watch-session', sessionFilePath),
  unwatchSession: (sessionFilePath: string) => ipcRenderer.send('overseer:unwatch-session', sessionFilePath),
  onNewMessages: (callback: (messages: any[]) => void) => {
    const subscription = (_event: any, messages: any[]) => callback(messages)
    ipcRenderer.on('overseer:new-messages', subscription)
    return () => ipcRenderer.removeListener('overseer:new-messages', subscription)
  },

  // Team data
  getTeamConfig: (teamName: string) => ipcRenderer.invoke('overseer:get-team-config', teamName),
  getTeamTasks: (teamName: string) => ipcRenderer.invoke('overseer:get-team-tasks', teamName),

  // Session status
  onSessionStatusChanged: (callback: (statuses: any[]) => void) => {
    const subscription = (_event: any, statuses: any[]) => callback(statuses)
    ipcRenderer.on('overseer:session-status-changed', subscription)
    return () => ipcRenderer.removeListener('overseer:session-status-changed', subscription)
  },

  // Screenshot for debugging
  captureScreenshot: () => ipcRenderer.invoke('overseer:capture-screenshot')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('overseer', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.overseer = api
}
