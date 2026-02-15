export interface Project {
  name: string
  encodedName: string
  path: string
  sessionCount: number
}

export interface Session {
  id: string
  type: 'main' | 'subagent' | 'background'
  filePath: string
  lastModified: number
  parentSessionId?: string
}
