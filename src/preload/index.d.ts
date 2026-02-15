import type { Project, Session } from '../main/types'
import type { FormattedSession } from '../main/services/message-formatter'

export interface OverseerAPI {
  getProjectsDir: () => Promise<string>
  scanProjects: (claudeDir?: string) => Promise<Project[]>
  discoverSessions: (projectEncodedName: string, claudeDir?: string) => Promise<Session[]>
  getMessages: (sessionFilePath: string) => Promise<FormattedSession>
}

declare global {
  interface Window {
    overseer: OverseerAPI
  }
}
