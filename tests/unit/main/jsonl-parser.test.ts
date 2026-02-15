import { describe, it, expect } from 'vitest'
import { parseJsonlLine, parseJsonlContent } from '@main/services/jsonl-parser'

describe('JSONL Parser', () => {
  describe('parseJsonlLine', () => {
    it('parses a queue-operation message', () => {
      const line = '{"type":"queue-operation","operation":"dequeue","timestamp":"2026-02-15T19:00:00.000Z","sessionId":"test-123"}'
      const parsed = parseJsonlLine(line)
      expect(parsed).not.toBeNull()
      expect(parsed!.type).toBe('queue-operation')
      if (parsed!.type === 'queue-operation') {
        expect(parsed!.operation).toBe('dequeue')
        expect(parsed!.sessionId).toBe('test-123')
      }
    })

    it('parses a user message with string content', () => {
      const line = JSON.stringify({
        type: 'user',
        uuid: 'msg-001',
        parentUuid: null,
        timestamp: '2026-02-15T19:00:01.000Z',
        sessionId: 'test-123',
        cwd: '/test/project',
        version: '2.0.80',
        message: { role: 'user', content: 'Hello test' }
      })
      const parsed = parseJsonlLine(line)
      expect(parsed).not.toBeNull()
      expect(parsed!.type).toBe('user')
      if (parsed!.type === 'user') {
        expect(parsed!.message.content).toBe('Hello test')
        expect(parsed!.uuid).toBe('msg-001')
      }
    })

    it('parses a user message with tool_result content', () => {
      const line = JSON.stringify({
        type: 'user',
        uuid: 'msg-003',
        parentUuid: 'msg-002',
        timestamp: '2026-02-15T19:00:03.000Z',
        sessionId: 'test-123',
        cwd: '/test/project',
        version: '2.0.80',
        message: {
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: 'tool-001',
            content: 'File contents here'
          }]
        }
      })
      const parsed = parseJsonlLine(line)
      expect(parsed).not.toBeNull()
      expect(parsed!.type).toBe('user')
      if (parsed!.type === 'user') {
        expect(Array.isArray(parsed!.message.content)).toBe(true)
        const content = parsed!.message.content as Array<{ type: string; tool_use_id: string }>
        expect(content[0].type).toBe('tool_result')
        expect(content[0].tool_use_id).toBe('tool-001')
      }
    })

    it('parses an assistant message with text content', () => {
      const line = JSON.stringify({
        type: 'assistant',
        uuid: 'msg-002',
        parentUuid: 'msg-001',
        timestamp: '2026-02-15T19:00:02.000Z',
        sessionId: 'test-123',
        cwd: '/test/project',
        version: '2.0.80',
        message: {
          role: 'assistant',
          model: 'claude-opus-4-6',
          content: [{ type: 'text', text: 'Hello! This is a test response.' }],
          usage: { input_tokens: 10, output_tokens: 8, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
          stop_reason: 'end_turn'
        }
      })
      const parsed = parseJsonlLine(line)
      expect(parsed).not.toBeNull()
      expect(parsed!.type).toBe('assistant')
      if (parsed!.type === 'assistant') {
        expect(parsed!.message.model).toBe('claude-opus-4-6')
        expect(parsed!.message.content[0]).toEqual({ type: 'text', text: 'Hello! This is a test response.' })
        expect(parsed!.message.usage.input_tokens).toBe(10)
      }
    })

    it('parses an assistant message with tool_use blocks', () => {
      const line = JSON.stringify({
        type: 'assistant',
        uuid: 'msg-004',
        parentUuid: 'msg-003',
        timestamp: '2026-02-15T19:00:04.000Z',
        sessionId: 'test-123',
        cwd: '/test/project',
        version: '2.0.80',
        message: {
          role: 'assistant',
          model: 'claude-opus-4-6',
          content: [
            { type: 'text', text: 'Let me read that file.' },
            { type: 'tool_use', id: 'tool-001', name: 'Read', input: { file_path: '/foo/bar.ts' } }
          ],
          usage: { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
          stop_reason: 'tool_use'
        }
      })
      const parsed = parseJsonlLine(line)
      expect(parsed).not.toBeNull()
      if (parsed!.type === 'assistant') {
        expect(parsed!.message.content).toHaveLength(2)
        expect(parsed!.message.content[1]).toEqual({
          type: 'tool_use',
          id: 'tool-001',
          name: 'Read',
          input: { file_path: '/foo/bar.ts' }
        })
      }
    })

    it('preserves mermaid code blocks in content', () => {
      const mermaidText = 'Here is a diagram:\n\n```mermaid\ngraph TD\n    A --> B\n```\n\nDone.'
      const line = JSON.stringify({
        type: 'assistant',
        uuid: 'msg-mermaid',
        parentUuid: 'msg-001',
        timestamp: '2026-02-15T19:00:02.000Z',
        sessionId: 'test-123',
        cwd: '/test/project',
        version: '2.0.80',
        message: {
          role: 'assistant',
          model: 'claude-opus-4-6',
          content: [{ type: 'text', text: mermaidText }],
          usage: { input_tokens: 10, output_tokens: 8, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
          stop_reason: 'end_turn'
        }
      })
      const parsed = parseJsonlLine(line)
      expect(parsed).not.toBeNull()
      if (parsed!.type === 'assistant') {
        const textBlock = parsed!.message.content[0]
        if (textBlock.type === 'text') {
          expect(textBlock.text).toContain('```mermaid')
          expect(textBlock.text).toContain('graph TD')
        }
      }
    })

    it('returns null for malformed JSON', () => {
      expect(parseJsonlLine('{invalid json}')).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(parseJsonlLine('')).toBeNull()
    })

    it('returns null for whitespace-only string', () => {
      expect(parseJsonlLine('   \t  ')).toBeNull()
    })

    it('returns null for JSON without type field', () => {
      expect(parseJsonlLine('{"foo":"bar"}')).toBeNull()
    })

    it('returns null for unknown type', () => {
      expect(parseJsonlLine('{"type":"unknown_type","data":"test"}')).toBeNull()
    })
  })

  describe('parseJsonlContent', () => {
    it('parses multiple lines', () => {
      const content = [
        '{"type":"queue-operation","operation":"dequeue","timestamp":"2026-02-15T19:00:00.000Z","sessionId":"test-123"}',
        '{"type":"user","uuid":"msg-001","parentUuid":null,"timestamp":"2026-02-15T19:00:01.000Z","sessionId":"test-123","cwd":"/test","version":"2.0.80","message":{"role":"user","content":"Hello"}}',
        '{"type":"assistant","uuid":"msg-002","parentUuid":"msg-001","timestamp":"2026-02-15T19:00:02.000Z","sessionId":"test-123","cwd":"/test","version":"2.0.80","message":{"role":"assistant","model":"claude-opus-4-6","content":[{"type":"text","text":"Hi!"}],"usage":{"input_tokens":10,"output_tokens":5,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"stop_reason":"end_turn"}}'
      ].join('\n')

      const messages = parseJsonlContent(content)
      expect(messages).toHaveLength(3)
      expect(messages[0].type).toBe('queue-operation')
      expect(messages[1].type).toBe('user')
      expect(messages[2].type).toBe('assistant')
    })

    it('skips empty lines gracefully', () => {
      const content = '{"type":"user","uuid":"msg-001","parentUuid":null,"timestamp":"2026-02-15T19:00:01.000Z","sessionId":"test-123","cwd":"/test","version":"2.0.80","message":{"role":"user","content":"Hello"}}\n\n\n'
      const messages = parseJsonlContent(content)
      expect(messages).toHaveLength(1)
    })

    it('skips malformed lines without crashing', () => {
      const content = [
        '{"type":"user","uuid":"msg-001","parentUuid":null,"timestamp":"2026-02-15T19:00:01.000Z","sessionId":"test-123","cwd":"/test","version":"2.0.80","message":{"role":"user","content":"Hello"}}',
        '{broken line}',
        '{"type":"assistant","uuid":"msg-002","parentUuid":"msg-001","timestamp":"2026-02-15T19:00:02.000Z","sessionId":"test-123","cwd":"/test","version":"2.0.80","message":{"role":"assistant","model":"claude-opus-4-6","content":[{"type":"text","text":"Hi!"}],"usage":{"input_tokens":10,"output_tokens":5,"cache_creation_input_tokens":0,"cache_read_input_tokens":0},"stop_reason":"end_turn"}}'
      ].join('\n')

      const messages = parseJsonlContent(content)
      expect(messages).toHaveLength(2)
    })

    it('handles empty content', () => {
      expect(parseJsonlContent('')).toHaveLength(0)
    })
  })
})
