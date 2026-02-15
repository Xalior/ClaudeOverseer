import { contextBridge } from 'electron'

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('overseer', {
  // IPC methods will be added here as we implement them
})
