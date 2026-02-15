import { readdir, stat, readFile } from 'fs/promises'
import { join } from 'path'
import type { Session } from '../types'

/**
 * Extract slug and first user message from a JSONL file.
 * Only reads the first ~20 lines for performance.
 */
async function extractSessionMetadata(filePath: string): Promise<{ slug?: string; summary?: string }> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const lines = content.split('\n')
    let slug: string | undefined
    let summary: string | undefined

    for (let i = 0; i < Math.min(lines.length, 30); i++) {
      const line = lines[i]?.trim()
      if (!line) continue
      try {
        const obj = JSON.parse(line)
        if (!slug && obj.slug) {
          slug = obj.slug
        }
        if (!summary && obj.type === 'user') {
          const content = obj.message?.content
          if (typeof content === 'string') {
            // Strip XML tags and trim to get a clean summary
            const clean = content.replace(/<[^>]+>/g, '').trim()
            if (clean) {
              summary = clean.length > 80 ? clean.slice(0, 80) + '...' : clean
            }
          }
        }
        if (slug && summary) break
      } catch {
        continue
      }
    }

    return { slug, summary }
  } catch {
    return {}
  }
}

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
        const metadata = await extractSessionMetadata(fullPath)

        sessions.push({
          id: sessionId,
          type: sessionId.startsWith('agent-') ? 'background' : 'main',
          filePath: fullPath,
          lastModified: stats.mtimeMs,
          slug: metadata.slug,
          summary: metadata.summary
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
              const metadata = await extractSessionMetadata(subPath)

              sessions.push({
                id: agentId,
                type: 'subagent',
                filePath: subPath,
                lastModified: stats.mtimeMs,
                parentSessionId: entry.name,
                slug: metadata.slug,
                summary: metadata.summary
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
