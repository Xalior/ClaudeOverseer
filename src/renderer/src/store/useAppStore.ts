import { create } from 'zustand'

interface Project {
  name: string
  path: string
  encodedDirName: string
  sessionCount: number
}

interface Session {
  id: string
  type: 'main' | 'subagent' | 'background'
  filePath: string
  lastModified: number
  parentId?: string
}

interface AppState {
  // Data
  projects: Project[]
  sessions: Session[]
  selectedProject: Project | null
  selectedSession: Session | null

  // Actions
  setProjects: (projects: Project[]) => void
  setSessions: (sessions: Session[]) => void
  selectProject: (project: Project) => void
  selectSession: (session: Session) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  projects: [],
  sessions: [],
  selectedProject: null,
  selectedSession: null,

  // Actions
  setProjects: (projects) => set({ projects }),
  setSessions: (sessions) => set({ sessions }),
  selectProject: (project) => set({ selectedProject: project }),
  selectSession: (session) => set({ selectedSession: session })
}))
