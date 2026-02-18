import { homedir } from 'os'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs'

export interface WindowState {
  x: number | undefined
  y: number | undefined
  width: number
  height: number
  isMaximized: boolean
}

export type ProjectSortOrder = 'alpha' | 'recent' | 'sessions'

export interface AppPreferences {
  selectedProject: string | null
  selectedSessionPath: string | null
  windowState: WindowState
  panelWidths: [number, number]
  pinnedProjects: string[]
  hiddenProjects: string[]
  projectSortOrder: ProjectSortOrder
}

const PREFS_DIR = join(homedir(), '.ClaudeOverseer')
const PREFS_FILE = join(PREFS_DIR, 'prefs.json')

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
  pinnedProjects: [],
  hiddenProjects: [],
  projectSortOrder: 'recent'
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
          : current.windowState
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
        : current.windowState
    }
    const tmpFile = PREFS_FILE + '.tmp'
    writeFileSync(tmpFile, JSON.stringify(merged, null, 2), 'utf-8')
    renameSync(tmpFile, PREFS_FILE)
  } catch (err) {
    console.error('Failed to save preferences:', err)
  }
}
