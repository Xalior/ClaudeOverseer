import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    overseer: {
      getProjects: () => Promise<any[]>
      getSessions: (projectDir: string) => Promise<any[]>
      getMessages: (sessionFilePath: string) => Promise<any[]>
      watchSession: (sessionFilePath: string) => void
      unwatchSession: (sessionFilePath: string) => void
      onNewMessages: (callback: (messages: any[]) => void) => () => void
      getTeamConfig: (teamName: string) => Promise<any>
      getTeamTasks: (teamName: string) => Promise<any[]>
      onSessionStatusChanged: (callback: (statuses: any[]) => void) => () => void
    }
  }
}
