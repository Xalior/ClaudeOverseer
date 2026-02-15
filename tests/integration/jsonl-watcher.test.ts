import { describe, it, expect, afterEach } from 'vitest'
import { JsonlWatcher } from '@main/services/jsonl-watcher'
import { writeFileSync, unlinkSync, appendFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import type { ParsedMessage } from '@main/types'

describe('JSONL Watcher', () => {
  const tempFiles: string[] = []
  const watchers: JsonlWatcher[] = []

  function createTempFile(content = ''): string {
    const filePath = join(tmpdir(), `test-watcher-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`)
    writeFileSync(filePath, content)
    tempFiles.push(filePath)
    return filePath
  }

  afterEach(async () => {
    // Stop all watchers
    for (const watcher of watchers) {
      await watcher.stop()
    }
    watchers.length = 0

    // Clean up temp files
    for (const file of tempFiles) {
      try {
        unlinkSync(file)
      } catch {
        // Ignore cleanup errors
      }
    }
    tempFiles.length = 0
  })

  it('detects new lines appended to a file', async () => {
    const filePath = createTempFile('{"type":"user","uuid":"msg-001","parentUuid":null,"timestamp":"2026-02-15T19:00:01.000Z","sessionId":"test","cwd":"/test","version":"2.0.80","message":{"role":"user","content":"Initial"}}\n')

    const received: ParsedMessage[][] = []

    const watcher = new JsonlWatcher(filePath, {
      onNewMessages: (messages) => {
        received.push(messages)
      },
      onError: (error) => {
        console.error('Watcher error:', error)
      }
    }, { stabilityThreshold: 50, pollInterval: 25 })
    watchers.push(watcher)

    await watcher.start()
    await sleep(200) // Let chokidar initialize

    // Append a new line
    const newLine = JSON.stringify({
      type: 'assistant',
      uuid: 'msg-002',
      parentUuid: 'msg-001',
      timestamp: '2026-02-15T19:00:02.000Z',
      sessionId: 'test',
      cwd: '/test',
      version: '2.0.80',
      message: {
        role: 'assistant',
        model: 'claude-opus-4-6',
        content: [{ type: 'text', text: 'New message!' }],
        usage: { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
        stop_reason: 'end_turn'
      }
    })

    appendFileSync(filePath, newLine + '\n')

    // Wait for the watcher to pick up the change
    await waitFor(() => received.length > 0, 5000)

    expect(received.length).toBeGreaterThan(0)
    expect(received[0][0].type).toBe('assistant')
    if (received[0][0].type === 'assistant') {
      expect(received[0][0].uuid).toBe('msg-002')
    }
  })

  it('handles multiple lines appended rapidly', async () => {
    const filePath = createTempFile('')

    const allMessages: ParsedMessage[] = []

    const watcher = new JsonlWatcher(filePath, {
      onNewMessages: (messages) => {
        allMessages.push(...messages)
      },
      onError: () => {}
    }, { stabilityThreshold: 50, pollInterval: 25 })
    watchers.push(watcher)

    await watcher.start()
    await sleep(200) // Let chokidar initialize

    // Append multiple lines
    const lines = [
      JSON.stringify({ type: 'user', uuid: 'msg-001', parentUuid: null, timestamp: '2026-02-15T19:00:01.000Z', sessionId: 'test', cwd: '/test', version: '2.0.80', message: { role: 'user', content: 'Line 1' } }),
      JSON.stringify({ type: 'user', uuid: 'msg-002', parentUuid: 'msg-001', timestamp: '2026-02-15T19:00:02.000Z', sessionId: 'test', cwd: '/test', version: '2.0.80', message: { role: 'user', content: 'Line 2' } }),
      JSON.stringify({ type: 'user', uuid: 'msg-003', parentUuid: 'msg-002', timestamp: '2026-02-15T19:00:03.000Z', sessionId: 'test', cwd: '/test', version: '2.0.80', message: { role: 'user', content: 'Line 3' } })
    ]

    appendFileSync(filePath, lines.join('\n') + '\n')

    await waitFor(() => allMessages.length >= 3, 5000)

    expect(allMessages.length).toBe(3)
    expect(allMessages[0].type).toBe('user')
    expect(allMessages[2].type).toBe('user')
  })

  it('stops watching after stop() is called', async () => {
    const filePath = createTempFile('')

    const received: ParsedMessage[][] = []

    const watcher = new JsonlWatcher(filePath, {
      onNewMessages: (messages) => {
        received.push(messages)
      },
      onError: () => {}
    }, { stabilityThreshold: 50, pollInterval: 25 })
    watchers.push(watcher)

    await watcher.start()
    await watcher.stop()

    // Append after stopping
    appendFileSync(filePath, JSON.stringify({
      type: 'user', uuid: 'msg-after-stop', parentUuid: null,
      timestamp: '2026-02-15T19:00:01.000Z', sessionId: 'test',
      cwd: '/test', version: '2.0.80',
      message: { role: 'user', content: 'Should not be received' }
    }) + '\n')

    // Wait a bit to make sure no event fires
    await sleep(500)

    expect(received.length).toBe(0)
  })

  it('handles file truncation gracefully', async () => {
    const initialContent = JSON.stringify({
      type: 'user', uuid: 'msg-001', parentUuid: null,
      timestamp: '2026-02-15T19:00:01.000Z', sessionId: 'test',
      cwd: '/test', version: '2.0.80',
      message: { role: 'user', content: 'Initial content that will be overwritten' }
    }) + '\n'

    const filePath = createTempFile(initialContent)

    const allMessages: ParsedMessage[] = []

    const watcher = new JsonlWatcher(filePath, {
      onNewMessages: (messages) => {
        allMessages.push(...messages)
      },
      onError: () => {}
    }, { stabilityThreshold: 50, pollInterval: 25 })
    watchers.push(watcher)

    await watcher.start()
    await sleep(200) // Let chokidar initialize

    // Truncate and write new content
    writeFileSync(filePath, JSON.stringify({
      type: 'user', uuid: 'msg-new', parentUuid: null,
      timestamp: '2026-02-15T19:00:02.000Z', sessionId: 'test',
      cwd: '/test', version: '2.0.80',
      message: { role: 'user', content: 'After truncation' }
    }) + '\n')

    await waitFor(() => allMessages.length > 0, 5000)

    expect(allMessages.length).toBeGreaterThan(0)
  })
})

async function waitFor(condition: () => boolean, timeoutMs: number): Promise<void> {
  const start = Date.now()
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`waitFor timed out after ${timeoutMs}ms`)
    }
    await sleep(50)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
