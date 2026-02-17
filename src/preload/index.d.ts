import type { Project, Session } from '../main/types'
import type { FormattedSession } from '../main/services/message-formatter'

export interface WindowState {
  x: number | undefined
  y: number | undefined
  width: number
  height: number
  isMaximized: boolean
}

export interface AppPreferences {
  selectedProject: string | null
  selectedSessionPath: string | null
  windowState: WindowState
  panelWidths: [number, number]
}

export interface NewMessagesData {
  filePath: string
  messages: FormattedSession['messages']
  usage: FormattedSession['totalUsage']
}

export interface OverseerAPI {
  getProjectsDir: () => Promise<string>
  scanProjects: (claudeDir?: string) => Promise<Project[]>
  discoverSessions: (projectEncodedName: string, claudeDir?: string) => Promise<Session[]>
  getMessages: (sessionFilePath: string) => Promise<FormattedSession>
  watchSession: (sessionFilePath: string) => Promise<void>
  unwatchSession: (sessionFilePath: string) => Promise<void>
  onNewMessages: (callback: (data: NewMessagesData) => void) => () => void
  startDirectoryWatch: () => Promise<void>
  stopDirectoryWatch: () => Promise<void>
  onProjectsChanged: (callback: () => void) => () => void
  onSessionsChanged: (callback: (data: { projectEncodedName: string }) => void) => () => void
  loadPreferences: () => Promise<AppPreferences>
  savePreferences: (prefs: Partial<AppPreferences>) => Promise<void>
}

declare global {
  interface Window {
    overseer: OverseerAPI
  }
}
