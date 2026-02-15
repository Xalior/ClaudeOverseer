import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import type { Session } from '../types'

/**
 * Discovers all JSONL session files in a project directory
 * Includes main sessions, background agents, and subagents
 */
export async function discoverSessions(projectDir: string): Promise<Session[]> {
  try {
    const sessions: Session[] = []
    const entries = await readdir(projectDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(projectDir, entry.name)

      if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        // Main session or background agent
        const stats = await stat(fullPath)
        const sessionId = entry.name.replace('.jsonl', '')

        sessions.push({
          id: sessionId,
          type: sessionId.startsWith('agent-') ? 'background' : 'main',
          filePath: fullPath,
          lastModified: stats.mtimeMs
        })
      } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
        // Check for subagents directory
        const subagentsDir = join(fullPath, 'subagents')
        try {
          const subagentEntries = await readdir(subagentsDir, { withFileTypes: true })

          for (const subEntry of subagentEntries) {
            if (subEntry.isFile() && subEntry.name.endsWith('.jsonl')) {
              const subPath = join(subagentsDir, subEntry.name)
              const stats = await stat(subPath)
              const agentId = subEntry.name.replace('.jsonl', '')

              sessions.push({
                id: agentId,
                type: 'subagent',
                filePath: subPath,
                lastModified: stats.mtimeMs,
                parentSessionId: entry.name
              })
            }
          }
        } catch {
          // No subagents directory, skip
        }
      }
    }

    // Sort by most recent first
    return sessions.sort((a, b) => b.lastModified - a.lastModified)
  } catch (error) {
    console.error('Failed to discover sessions:', error)
    return []
  }
}
