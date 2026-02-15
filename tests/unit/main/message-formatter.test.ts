import { describe, it, expect } from 'vitest'
import { formatMessages } from '@main/services/message-formatter'
import type { ParsedMessage } from '@main/types'

function makeUserMsg(uuid: string, content: string | Array<{ type: string; tool_use_id: string; content: string }>): ParsedMessage {
  return {
    type: 'user',
    uuid,
    parentUuid: null,
    timestamp: '2026-02-15T19:00:01.000Z',
    sessionId: 'test-123',
    cwd: '/test',
    version: '2.0.80',
    message: { role: 'user', content: content as never }
  }
}

function makeAssistantMsg(
  uuid: string,
  content: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }>,
  usage = { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
): ParsedMessage {
  return {
    type: 'assistant',
    uuid,
    parentUuid: 'parent',
    timestamp: '2026-02-15T19:00:02.000Z',
    sessionId: 'test-123',
    cwd: '/test',
    version: '2.0.80',
    message: {
      role: 'assistant',
      model: 'claude-opus-4-6',
      content: content as never,
      usage,
      stop_reason: 'end_turn'
    }
  }
}

describe('Message Formatter', () => {
  it('formats user text messages', () => {
    const messages: ParsedMessage[] = [makeUserMsg('msg-001', 'Hello world')]
    const result = formatMessages(messages)
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].type).toBe('user')
    expect(result.messages[0].userText).toBe('Hello world')
  })

  it('formats assistant text messages', () => {
    const messages: ParsedMessage[] = [
      makeAssistantMsg('msg-002', [{ type: 'text', text: 'Hello!' }])
    ]
    const result = formatMessages(messages)
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].type).toBe('assistant')
    expect(result.messages[0].textContent).toBe('Hello!')
    expect(result.messages[0].model).toBe('claude-opus-4-6')
  })

  it('matches tool_use with tool_result', () => {
    const messages: ParsedMessage[] = [
      makeAssistantMsg('msg-002', [
        { type: 'text', text: 'Reading file.' },
        { type: 'tool_use', id: 'tool-001', name: 'Read', input: { file_path: '/foo.ts' } }
      ]),
      makeUserMsg('msg-003', [{ type: 'tool_result', tool_use_id: 'tool-001', content: 'file contents here' }])
    ]
    const result = formatMessages(messages)
    // User text messages and assistant messages (tool result user msg is skipped)
    expect(result.messages).toHaveLength(1)
    const assistantFormatted = result.messages[0]
    expect(assistantFormatted.toolPairs).toHaveLength(1)
    expect(assistantFormatted.toolPairs![0].toolUse.name).toBe('Read')
    expect(assistantFormatted.toolPairs![0].toolResult!.content).toBe('file contents here')
  })

  it('handles tool_use without matching tool_result', () => {
    const messages: ParsedMessage[] = [
      makeAssistantMsg('msg-002', [
        { type: 'tool_use', id: 'tool-orphan', name: 'Bash', input: { command: 'ls' } }
      ])
    ]
    const result = formatMessages(messages)
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].toolPairs![0].toolResult).toBeNull()
  })

  it('accumulates token usage across multiple assistant messages', () => {
    const messages: ParsedMessage[] = [
      makeAssistantMsg('msg-002', [{ type: 'text', text: 'First' }], {
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_input_tokens: 10,
        cache_read_input_tokens: 20
      }),
      makeAssistantMsg('msg-004', [{ type: 'text', text: 'Second' }], {
        input_tokens: 200,
        output_tokens: 75,
        cache_creation_input_tokens: 5,
        cache_read_input_tokens: 30
      })
    ]
    const result = formatMessages(messages)
    expect(result.totalUsage.input_tokens).toBe(300)
    expect(result.totalUsage.output_tokens).toBe(125)
    expect(result.totalUsage.cache_creation_input_tokens).toBe(15)
    expect(result.totalUsage.cache_read_input_tokens).toBe(50)
  })

  it('formats queue-operation messages', () => {
    const messages: ParsedMessage[] = [
      {
        type: 'queue-operation',
        operation: 'dequeue',
        timestamp: '2026-02-15T19:00:00.000Z',
        sessionId: 'test-123'
      }
    ]
    const result = formatMessages(messages)
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].type).toBe('queue-operation')
  })

  it('joins multiple text blocks in one assistant message', () => {
    const messages: ParsedMessage[] = [
      makeAssistantMsg('msg-002', [
        { type: 'text', text: 'Part one.' },
        { type: 'text', text: 'Part two.' }
      ])
    ]
    const result = formatMessages(messages)
    expect(result.messages[0].textContent).toBe('Part one.\n\nPart two.')
  })

  it('handles a full conversation flow', () => {
    const messages: ParsedMessage[] = [
      { type: 'queue-operation', operation: 'dequeue', timestamp: '2026-02-15T19:00:00.000Z', sessionId: 'test-123' },
      makeUserMsg('msg-001', 'Fix the bug'),
      makeAssistantMsg('msg-002', [
        { type: 'text', text: 'Looking at the code.' },
        { type: 'tool_use', id: 'tool-001', name: 'Read', input: { file_path: '/src/bug.ts' } }
      ]),
      makeUserMsg('msg-003', [{ type: 'tool_result', tool_use_id: 'tool-001', content: 'buggy code here' }]),
      makeAssistantMsg('msg-004', [{ type: 'text', text: 'Found and fixed the bug.' }])
    ]

    const result = formatMessages(messages)
    // queue-op + user text + assistant with tool + assistant text = 4
    expect(result.messages).toHaveLength(4)
    expect(result.messages[0].type).toBe('queue-operation')
    expect(result.messages[1].type).toBe('user')
    expect(result.messages[1].userText).toBe('Fix the bug')
    expect(result.messages[2].type).toBe('assistant')
    expect(result.messages[2].toolPairs).toHaveLength(1)
    expect(result.messages[3].type).toBe('assistant')
    expect(result.messages[3].textContent).toBe('Found and fixed the bug.')
  })

  it('preserves raw message on each formatted entry', () => {
    const original = makeUserMsg('msg-001', 'Hello')
    const result = formatMessages([original])
    expect(result.messages[0].raw).toEqual(original)
  })
})
