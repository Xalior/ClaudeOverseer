import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc-handlers'
import { loadPreferences, savePreferences } from './services/preferences'
import { CostCache } from './services/cost-cache'

// Enable remote debugging on port 9222 for agent debugging (dev only)
if (process.env.NODE_ENV === 'development') {
  app.commandLine.appendSwitch('remote-debugging-port', '19222')
}

function createWindow(): void {
  const prefs = loadPreferences()
  const { windowState } = prefs

  const mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (windowState.isMaximized) {
    mainWindow.maximize()
  }

  // Track window state changes
  function saveWindowState(): void {
    if (mainWindow.isMaximized()) {
      savePreferences({ windowState: { ...prefs.windowState, isMaximized: true } })
    } else {
      const bounds = mainWindow.getBounds()
      savePreferences({
        windowState: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          isMaximized: false
        }
      })
    }
  }

  mainWindow.on('resize', saveWindowState)
  mainWindow.on('move', saveWindowState)
  mainWindow.on('maximize', saveWindowState)
  mainWindow.on('unmaximize', saveWindowState)

  // Load the renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const costCache = new CostCache()
costCache.loadFromDisk()

app.whenReady().then(() => {
  registerIpcHandlers(costCache)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
