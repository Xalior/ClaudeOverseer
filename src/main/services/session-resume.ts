import { spawn, type ChildProcess } from 'child_process'
import type { Broadcaster } from './broadcaster'
import type { ResumeSessionRequest, ResumeSessionStatus } from '../types'

// Track active child processes by session ID
const activeProcesses = new Map<string, ChildProcess>()

let _broadcaster: Broadcaster | null = null

export function setResumeBroadcaster(broadcaster: Broadcaster): void {
  _broadcaster = broadcaster
}

function broadcastStatus(status: ResumeSessionStatus): void {
  if (_broadcaster) {
    _broadcaster.send('overseer:resume-status', status)
  }
}

export function isSessionResuming(sessionId: string): boolean {
  return activeProcesses.has(sessionId)
}

export function resumeSession(req: ResumeSessionRequest): void {
  const { sessionId, projectPath, prompt } = req

  if (activeProcesses.has(sessionId)) {
    broadcastStatus({ sessionId, status: 'error', error: 'Session is already being resumed' })
    return
  }

  const child = spawn('claude', ['--resume', sessionId, '-p', prompt], {
    cwd: projectPath,
    shell: true,
    stdio: 'ignore'
  })

  activeProcesses.set(sessionId, child)
  broadcastStatus({ sessionId, status: 'running' })

  child.on('error', (err) => {
    activeProcesses.delete(sessionId)
    broadcastStatus({ sessionId, status: 'error', error: err.message })
  })

  child.on('exit', (code) => {
    activeProcesses.delete(sessionId)
    if (code === 0) {
      broadcastStatus({ sessionId, status: 'completed', exitCode: code })
    } else {
      broadcastStatus({ sessionId, status: 'error', exitCode: code ?? undefined, error: `Process exited with code ${code}` })
    }
  })
}
