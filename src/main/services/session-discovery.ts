import { readdir, stat, readFile } from 'fs/promises'
import { join } from 'path'
import type { Session } from '../types'

/** Noise patterns that don't make useful session titles */
const NOISE_PATTERNS = [
  /^\[Request interrupted by user\]$/,
  /^clear$/i,
  /^\/\w+/,               // slash commands like /clear, /help
  /^Caveat:/i,
  /^commit$/i,
  /^y(es)?$/i,
  /^n(o)?$/i,
  /^ok$/i,
  /^continue$/i,
]

/**
 * Extract usable text from user message content.
 * Handles both string and array-of-blocks formats.
 */
function extractUserText(content: unknown): string | undefined {
  let raw: string | undefined
  if (typeof content === 'string') {
    raw = content
  } else if (Array.isArray(content)) {
    // Collect text from text blocks and tool_result blocks
    const parts: string[] = []
    for (const block of content) {
      if (block?.type === 'text' && typeof block.text === 'string') {
        parts.push(block.text)
      }
    }
    raw = parts.join(' ')
  }
  if (!raw) return undefined

  // Strip XML tags, collapse whitespace
  const clean = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[Request interrupted by user\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!clean) return undefined
  // Skip noise
  if (NOISE_PATTERNS.some(p => p.test(clean))) return undefined

  return clean.length > 100 ? clean.slice(0, 100) + '...' : clean
}

/**
 * Extract slug and first meaningful user message from a JSONL file.
 * Scans up to 60 lines to skip past command noise at the start.
 */
async function extractSessionMetadata(filePath: string): Promise<{ slug?: string; summary?: string }> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const lines = content.split('\n')
    let slug: string | undefined
    let summary: string | undefined

    for (let i = 0; i < Math.min(lines.length, 60); i++) {
      const line = lines[i]?.trim()
      if (!line) continue
      try {
        const obj = JSON.parse(line)
        if (!slug && obj.slug) {
          slug = obj.slug
        }
        if (!summary && obj.type === 'user' && obj.userType !== 'internal' && !obj.isMeta) {
          // Skip tool_result-only messages (automated responses)
          const msgContent = obj.message?.content
          if (Array.isArray(msgContent) && msgContent.every((b: { type: string }) => b?.type === 'tool_result')) {
            continue
          }
          const text = extractUserText(msgContent)
          if (text) {
            summary = text
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
