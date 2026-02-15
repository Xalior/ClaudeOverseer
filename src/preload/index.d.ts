import type { Project, Session } from '../main/types'

export interface OverseerAPI {
  getProjectsDir: () => Promise<string>
  scanProjects: (claudeDir?: string) => Promise<Project[]>
  discoverSessions: (projectEncodedName: string, claudeDir?: string) => Promise<Session[]>
}

declare global {
  interface Window {
    overseer: OverseerAPI
  }
}
