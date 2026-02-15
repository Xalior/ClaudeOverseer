import { readFile } from 'fs/promises'
import type { ParsedMessage } from '../types'

/**
 * Parse a single JSONL line into a typed message.
 * Returns null for malformed or empty lines.
 */
export function parseJsonlLine(line: string): ParsedMessage | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  try {
    const parsed = JSON.parse(trimmed)

    if (!parsed || typeof parsed !== 'object' || !parsed.type) {
      return null
    }

    if (parsed.type === 'queue-operation' || parsed.type === 'user' || parsed.type === 'assistant') {
      return parsed as ParsedMessage
    }

    return null
  } catch {
    return null
  }
}

/**
 * Parse all lines from a JSONL file into typed messages.
 * Skips malformed lines gracefully.
 */
export async function parseJsonlFile(filePath: string): Promise<ParsedMessage[]> {
  const content = await readFile(filePath, 'utf-8')
  return parseJsonlContent(content)
}

/**
 * Parse JSONL content string into typed messages.
 */
export function parseJsonlContent(content: string): ParsedMessage[] {
  const lines = content.split('\n')
  const messages: ParsedMessage[] = []

  for (const line of lines) {
    const parsed = parseJsonlLine(line)
    if (parsed) {
      messages.push(parsed)
    }
  }

  return messages
}
