import { readFile } from 'fs/promises'
import { join } from 'path'
import type { Broadcaster } from './broadcaster'
import type { ResumeSessionRequest, ResumeSessionStatus } from '../types'

// Track active resume operations by session ID
const activeProcesses = new Map<string, AbortController>()

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

async function loadMcpServers(projectPath: string): Promise<Record<string, unknown>> {
  try {
    const mcpPath = join(projectPath, '.mcp.json')
    const content = await readFile(mcpPath, 'utf-8')
    const config = JSON.parse(content)
    return config.mcpServers ?? {}
  } catch {
    return {}
  }
}

export async function resumeSession(req: ResumeSessionRequest): Promise<void> {
  const { sessionId, projectPath, prompt } = req

  if (activeProcesses.has(sessionId)) {
    broadcastStatus({ sessionId, status: 'error', error: 'Session is already being resumed' })
    return
  }

  const abortController = new AbortController()
  activeProcesses.set(sessionId, abortController)
  broadcastStatus({ sessionId, status: 'running' })

  try {
    const { query } = await import('@anthropic-ai/claude-agent-sdk')
    const mcpServers = await loadMcpServers(projectPath)

    const response = query({
      prompt,
      options: {
        resume: sessionId,
        cwd: projectPath,
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        settingSources: ['user', 'project', 'local'],
        mcpServers,
        abortController
      }
    })

    // Consume the async generator to completion
    // The JSONL file watcher already picks up new messages for the UI
    for await (const _message of response) {
      // Messages are written to the session file by the SDK
      // and picked up by our existing file watcher
    }

    activeProcesses.delete(sessionId)
    broadcastStatus({ sessionId, status: 'completed' })
  } catch (err) {
    activeProcesses.delete(sessionId)
    broadcastStatus({
      sessionId,
      status: 'error',
      error: err instanceof Error ? err.message : String(err)
    })
  }
}
