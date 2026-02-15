import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import type { Session } from '../types'

/**
 * Discover all sessions (main, subagent, background) for a project
 */
export async function discoverSessions(projectDir: string): Promise<Session[]> {
  const sessions: Session[] = []

  try {
    const entries = await readdir(projectDir, { withFileTypes: true })

    for (const entry of entries) {
      // Main sessions and background agents: *.jsonl files at root
      if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        const filePath = join(projectDir, entry.name)
        const stats = await stat(filePath)
        const sessionId = entry.name.replace('.jsonl', '')

        // Determine type: background agents start with "agent-"
        const type = sessionId.startsWith('agent-') ? 'background' : 'main'

        sessions.push({
          id: sessionId,
          type,
          filePath,
          lastModified: stats.mtimeMs
        })
      }

      // Subagents: {sessionId}/subagents/*.jsonl
      if (entry.isDirectory()) {
        const sessionId = entry.name
        const subagentsDir = join(projectDir, sessionId, 'subagents')

        try {
          const subagentFiles = await readdir(subagentsDir)

          for (const subFile of subagentFiles) {
            if (!subFile.endsWith('.jsonl')) continue

            const filePath = join(subagentsDir, subFile)
            const stats = await stat(filePath)
            const subagentId = subFile.replace('.jsonl', '')

            sessions.push({
              id: subagentId,
              type: 'subagent',
              filePath,
              lastModified: stats.mtimeMs,
              parentId: sessionId
            })
          }
        } catch {
          // No subagents directory for this session
        }
      }
    }

    // Sort by most recent activity
    return sessions.sort((a, b) => b.lastModified - a.lastModified)
  } catch (error) {
    console.error('Error discovering sessions:', error)
    return []
  }
}

/**
 * Get session status based on last modified time
 */
export function getSessionStatus(lastModified: number): 'active' | 'recent' | 'stale' {
  const now = Date.now()
  const ageSeconds = (now - lastModified) / 1000

  if (ageSeconds < 60) return 'active'      // Modified in last 60 seconds
  if (ageSeconds < 300) return 'recent'     // Modified in last 5 minutes
  return 'stale'
}
