import type { Project, Session } from '../main/types'
import type { FormattedSession } from '../main/services/message-formatter'

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
}

declare global {
  interface Window {
    overseer: OverseerAPI
  }
}
