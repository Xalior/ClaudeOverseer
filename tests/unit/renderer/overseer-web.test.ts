import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// --- Mock WebSocket ---

type WSHandler = ((ev: { data: string }) => void) | null

class MockWebSocket {
  static OPEN = 1
  static CONNECTING = 0
  static CLOSING = 2
  static CLOSED = 3

  static instances: MockWebSocket[] = []

  readyState = MockWebSocket.OPEN
  url: string
  onopen: (() => void) | null = null
  onmessage: WSHandler = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  sent: string[] = []

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
    // Auto-fire onopen in next tick
    setTimeout(() => this.onopen?.(), 0)
  }

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED
    setTimeout(() => this.onclose?.(), 0)
  }

  // Test helper: simulate receiving a message
  _receive(data: unknown): void {
    this.onmessage?.({ data: JSON.stringify(data) })
  }
}

// --- Mock fetch ---

const fetchResponses = new Map<string, unknown>()

function mockFetch(url: string): Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }> {
  const path = url.replace('http://localhost', '')
  const data = fetchResponses.get(path)
  if (data !== undefined) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data)
    })
  }
  return Promise.resolve({
    ok: false,
    status: 404,
    json: () => Promise.resolve({ error: 'Not found' })
  })
}

// --- Setup globals ---

beforeEach(() => {
  MockWebSocket.instances = []
  fetchResponses.clear()

  // Stub browser globals (vitest runs in Node, no window by default)
  vi.stubGlobal('window', {
    location: { protocol: 'http:', host: 'localhost' }
  })
  vi.stubGlobal('WebSocket', MockWebSocket)
  vi.stubGlobal('fetch', mockFetch)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// Dynamic import so globals are set before module executes
async function createAPI() {
  // Reset module cache so each test gets a fresh adapter
  vi.resetModules()
  const { createWebOverseerAPI } = await import('../../../src/renderer/src/overseer-web')
  return createWebOverseerAPI()
}

describe('overseer-web adapter', () => {
  describe('fetch-based API methods', () => {
    it('getProjectsDir fetches /api/projects-dir', async () => {
      fetchResponses.set('/api/projects-dir', '/home/user/.claude/projects')
      const api = await createAPI()
      const dir = await api.getProjectsDir()
      expect(dir).toBe('/home/user/.claude/projects')
    })

    it('scanProjects fetches /api/projects', async () => {
      const projects = [{ name: 'test', encodedName: '-test' }]
      fetchResponses.set('/api/projects', projects)
      const api = await createAPI()
      const result = await api.scanProjects()
      expect(result).toEqual(projects)
    })

    it('discoverSessions encodes project name in URL', async () => {
      const sessions = [{ id: 'sess-1', type: 'main' }]
      fetchResponses.set('/api/sessions/-my-project', sessions)
      const api = await createAPI()
      const result = await api.discoverSessions('-my-project')
      expect(result).toEqual(sessions)
    })

    it('getMessages passes path as query param', async () => {
      const formatted = { messages: [], totalUsage: {} }
      fetchResponses.set('/api/messages?path=%2Ftmp%2Fsession.jsonl', formatted)
      const api = await createAPI()
      const result = await api.getMessages('/tmp/session.jsonl')
      expect(result).toEqual(formatted)
    })

    it('loadPreferences fetches /api/preferences', async () => {
      const prefs = { theme: 'dark', projectSortOrder: 'recent' }
      fetchResponses.set('/api/preferences', prefs)
      const api = await createAPI()
      const result = await api.loadPreferences()
      expect(result).toEqual(prefs)
    })

    it('getSessionCosts passes dir as query param', async () => {
      const costs = { '/tmp/s.jsonl': 1.5 }
      fetchResponses.set('/api/session-costs?dir=%2Ftmp%2Fproject', costs)
      const api = await createAPI()
      const result = await api.getSessionCosts('/tmp/project')
      expect(result).toEqual(costs)
    })

    it('getAllProjectCosts passes dirs as JSON query param', async () => {
      const costs = { '/tmp/p1': { total: 2.0, byModel: {} } }
      const dirs = ['/tmp/p1']
      fetchResponses.set(`/api/project-costs?dirs=${encodeURIComponent(JSON.stringify(dirs))}`, costs)
      const api = await createAPI()
      const result = await api.getAllProjectCosts(dirs)
      expect(result).toEqual(costs)
    })

    it('throws on non-OK fetch response', async () => {
      // No response registered = 404
      const api = await createAPI()
      await expect(api.getProjectsDir()).rejects.toThrow('HTTP 404')
    })
  })

  describe('WebSocket event routing', () => {
    it('routes WebSocket messages to event subscribers', async () => {
      const api = await createAPI()
      // Wait for WS connection
      await new Promise((r) => setTimeout(r, 10))

      const received: unknown[] = []
      api.onNewMessages((data) => received.push(data))

      const ws = MockWebSocket.instances[0]
      ws._receive({ event: 'overseer:new-messages', data: { filePath: '/test.jsonl', messages: [] } })

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual({ filePath: '/test.jsonl', messages: [] })
    })

    it('routes projects-changed events', async () => {
      const api = await createAPI()
      await new Promise((r) => setTimeout(r, 10))

      let called = false
      api.onProjectsChanged(() => { called = true })

      MockWebSocket.instances[0]._receive({ event: 'overseer:projects-changed' })
      expect(called).toBe(true)
    })

    it('routes sessions-changed events with data', async () => {
      const api = await createAPI()
      await new Promise((r) => setTimeout(r, 10))

      let receivedData: unknown = null
      api.onSessionsChanged((data) => { receivedData = data })

      MockWebSocket.instances[0]._receive({
        event: 'overseer:sessions-changed',
        data: { projectEncodedName: '-test' }
      })
      expect(receivedData).toEqual({ projectEncodedName: '-test' })
    })

    it('routes cost-updated events', async () => {
      const api = await createAPI()
      await new Promise((r) => setTimeout(r, 10))

      let called = false
      api.onCostUpdated(() => { called = true })

      MockWebSocket.instances[0]._receive({ event: 'overseer:cost-updated' })
      expect(called).toBe(true)
    })

    it('routes resume-status events', async () => {
      const api = await createAPI()
      await new Promise((r) => setTimeout(r, 10))

      let receivedStatus: unknown = null
      api.onResumeStatus((status) => { receivedStatus = status })

      MockWebSocket.instances[0]._receive({
        event: 'overseer:resume-status',
        data: { sessionId: 'abc', status: 'completed' }
      })
      expect(receivedStatus).toEqual({ sessionId: 'abc', status: 'completed' })
    })

    it('unsubscribe function removes listener', async () => {
      const api = await createAPI()
      await new Promise((r) => setTimeout(r, 10))

      let count = 0
      const unsub = api.onCostUpdated(() => { count++ })

      const ws = MockWebSocket.instances[0]
      ws._receive({ event: 'overseer:cost-updated' })
      expect(count).toBe(1)

      unsub()
      ws._receive({ event: 'overseer:cost-updated' })
      expect(count).toBe(1) // no increment after unsub
    })
  })

  describe('WebSocket watch/unwatch', () => {
    it('watchSession sends watch action over WS', async () => {
      const api = await createAPI()
      await new Promise((r) => setTimeout(r, 10))

      await api.watchSession('/tmp/session.jsonl')

      const ws = MockWebSocket.instances[0]
      expect(ws.sent).toHaveLength(1)
      expect(JSON.parse(ws.sent[0])).toEqual({ action: 'watch', path: '/tmp/session.jsonl' })
    })

    it('unwatchSession sends unwatch action over WS', async () => {
      const api = await createAPI()
      await new Promise((r) => setTimeout(r, 10))

      await api.unwatchSession('/tmp/session.jsonl')

      const ws = MockWebSocket.instances[0]
      expect(ws.sent).toHaveLength(1)
      expect(JSON.parse(ws.sent[0])).toEqual({ action: 'unwatch', path: '/tmp/session.jsonl' })
    })

    it('watchSession is no-op when WS not connected', async () => {
      const api = await createAPI()
      await new Promise((r) => setTimeout(r, 10))

      const ws = MockWebSocket.instances[0]
      ws.readyState = MockWebSocket.CLOSED

      await api.watchSession('/tmp/session.jsonl')
      expect(ws.sent).toHaveLength(0)
    })
  })

  describe('read-only no-ops', () => {
    it('savePreferences is a no-op', async () => {
      const api = await createAPI()
      // Should not throw, should not make any fetch call
      await api.savePreferences({ theme: 'dark' })
    })

    it('resumeSession is a no-op', async () => {
      const api = await createAPI()
      await api.resumeSession('id', '/path', 'prompt')
    })

    it('startDirectoryWatch is a no-op', async () => {
      const api = await createAPI()
      await api.startDirectoryWatch()
    })

    it('stopDirectoryWatch is a no-op', async () => {
      const api = await createAPI()
      await api.stopDirectoryWatch()
    })

    it('startRemoteServer is a no-op', async () => {
      const api = await createAPI()
      await api.startRemoteServer()
    })

    it('stopRemoteServer is a no-op', async () => {
      const api = await createAPI()
      await api.stopRemoteServer()
    })

    it('getRemoteServerStatus returns not-running stub', async () => {
      const api = await createAPI()
      const status = await api.getRemoteServerStatus()
      expect(status).toEqual({ running: false, port: 0, address: '', clientCount: 0 })
    })
  })
})
