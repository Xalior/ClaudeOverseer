import { homedir } from 'os'
import { join, dirname } from 'path'
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs'

export interface WindowState {
  x: number | undefined
  y: number | undefined
  width: number
  height: number
  isMaximized: boolean
}

export type ProjectSortOrder = 'alpha' | 'recent' | 'sessions'
export type ThemeMode = 'light' | 'dark' | 'system'

export interface RemoteServerConfig {
  enabled: boolean
  port: number
  bindAddress: string
}

export interface AppPreferences {
  selectedProject: string | null
  selectedSessionPath: string | null
  windowState: WindowState
  panelWidths: [number, number]
  projectsPanelCollapsed: boolean
  pinnedProjects: string[]
  hiddenProjects: string[]
  projectSortOrder: ProjectSortOrder
  theme: ThemeMode
  remoteServer: RemoteServerConfig
}

const PREFS_FILE = process.env.PREFS_FILE || join(homedir(), '.ClaudeOverseer', 'prefs.json')
const PREFS_DIR = dirname(PREFS_FILE)

const DEFAULT_PREFERENCES: AppPreferences = {
  selectedProject: null,
  selectedSessionPath: null,
  windowState: {
    x: undefined,
    y: undefined,
    width: 1200,
    height: 800,
    isMaximized: false
  },
  panelWidths: [220, 280],
  projectsPanelCollapsed: false,
  pinnedProjects: [],
  hiddenProjects: [],
  projectSortOrder: 'recent',
  theme: 'system',
  remoteServer: {
    enabled: false,
    port: 19280,
    bindAddress: '0.0.0.0'
  }
}

function isValidPreferences(obj: unknown): obj is Partial<AppPreferences> {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj)
}

export function loadPreferences(): AppPreferences {
  try {
    const content = readFileSync(PREFS_FILE, 'utf-8')
    const parsed = JSON.parse(content)
    if (!isValidPreferences(parsed)) return { ...DEFAULT_PREFERENCES }
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      windowState: {
        ...DEFAULT_PREFERENCES.windowState,
        ...(parsed.windowState || {})
      },
      remoteServer: {
        ...DEFAULT_PREFERENCES.remoteServer,
        ...(parsed.remoteServer || {})
      }
    }
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

export function savePreferences(partial: Partial<AppPreferences>): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    try {
      mkdirSync(PREFS_DIR, { recursive: true })
      const current = loadPreferences()
      const merged: AppPreferences = {
        ...current,
        ...partial,
        windowState: partial.windowState
          ? { ...current.windowState, ...partial.windowState }
          : current.windowState,
        remoteServer: partial.remoteServer
          ? { ...current.remoteServer, ...partial.remoteServer }
          : current.remoteServer
      }
      const tmpFile = PREFS_FILE + '.tmp'
      writeFileSync(tmpFile, JSON.stringify(merged, null, 2), 'utf-8')
      renameSync(tmpFile, PREFS_FILE)
    } catch (err) {
      console.error('Failed to save preferences:', err)
    }
  }, 300)
}

export function savePreferencesSync(partial: Partial<AppPreferences>): void {
  try {
    mkdirSync(PREFS_DIR, { recursive: true })
    const current = loadPreferences()
    const merged: AppPreferences = {
      ...current,
      ...partial,
      windowState: partial.windowState
        ? { ...current.windowState, ...partial.windowState }
        : current.windowState,
      remoteServer: partial.remoteServer
        ? { ...current.remoteServer, ...partial.remoteServer }
        : current.remoteServer
    }
    const tmpFile = PREFS_FILE + '.tmp'
    writeFileSync(tmpFile, JSON.stringify(merged, null, 2), 'utf-8')
    renameSync(tmpFile, PREFS_FILE)
  } catch (err) {
    console.error('Failed to save preferences:', err)
  }
}
