/**
 * Integration test: Remote monitoring server → browser client flow.
 *
 * Starts a real RemoteServer, makes real HTTP requests and WebSocket
 * connections against it — simulating what a browser client would do.
 * Tests the full path: Broadcaster → RemoteServer → WebSocket → client.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import WebSocket from 'ws'

// Mock electron (required by Broadcaster)
vi.mock('electron', () => ({
  BrowserWindow: { getAllWindows: () => [] }
}))

// Mock services with controllable return values
const mockScanProjects = vi.fn(async () => [
  { name: 'project-a', encodedName: '-project-a', path: '/home/user/project-a', pathVerified: true, sessionCount: 3, lastModified: 1700000000000 },
  { name: 'project-b', encodedName: '-project-b', path: '/home/user/project-b', pathVerified: true, sessionCount: 1, lastModified: 1700000001000 }
])

const mockDiscoverSessions = vi.fn(async () => [
  { id: 'session-001', type: 'main', filePath: '/home/user/project-a/session-001.jsonl', lastModified: 1700000000000 },
  { id: 'agent-bg1', type: 'background', filePath: '/home/user/project-a/agent-bg1.jsonl', lastModified: 1700000000500 }
])

const mockParseJsonlFile = vi.fn(async () => [
  { type: 'user', uuid: 'u1', message: { role: 'user', content: 'hello' } }
])

const mockFormatMessages = vi.fn(() => ({
  messages: [{ uuid: 'u1', type: 'user', userText: 'hello' }],
  totalUsage: { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
}))

const mockLoadPreferences = vi.fn(() => ({
  selectedProject: null,
  selectedSessionPath: null,
  windowState: { width: 1200, height: 800, isMaximized: false },
  panelWidths: [220, 280],
  projectsPanelCollapsed: false,
  pinnedProjects: [],
  hiddenProjects: [],
  projectSortOrder: 'recent',
  theme: 'dark',
  remoteServer: { enabled: true, port: 19280, bindAddress: '0.0.0.0' }
}))

const mockGetSessionCosts = vi.fn(() => ({
  '/home/user/project-a/session-001.jsonl': 2.45,
  '/home/user/project-a/agent-bg1.jsonl': 0.12
}))

const mockGetAllProjectCosts = vi.fn(() => ({
  '/home/user/project-a': { total: 2.57, byModel: { 'claude-opus-4-6': 2.57 } }
}))

vi.mock('../../src/main/services/project-scanner', () => ({
  scanProjects: (...args: unknown[]) => mockScanProjects(...args)
}))

vi.mock('../../src/main/services/session-discovery', () => ({
  discoverSessions: (...args: unknown[]) => mockDiscoverSessions(...args)
}))

vi.mock('../../src/main/services/jsonl-parser', () => ({
  parseJsonlFile: (...args: unknown[]) => mockParseJsonlFile(...args)
}))

vi.mock('../../src/main/services/message-formatter', () => ({
  formatMessages: (...args: unknown[]) => mockFormatMessages(...args)
}))

vi.mock('../../src/main/services/preferences', () => ({
  loadPreferences: () => mockLoadPreferences()
}))

vi.mock('../../src/main/services/jsonl-watcher', () => {
  const MockJsonlWatcher = vi.fn(function(this: Record<string, unknown>) {
    this.start = vi.fn()
    this.stop = vi.fn()
  })
  return { JsonlWatcher: MockJsonlWatcher }
})

const TEST_PORT = 19298
let server: InstanceType<typeof import('../../src/main/services/remote-server').RemoteServer>
let broadcaster: InstanceType<typeof import('../../src/main/services/broadcaster').Broadcaster>

beforeAll(async () => {
  const { RemoteServer } = await import('../../src/main/services/remote-server')
  const { Broadcaster } = await import('../../src/main/services/broadcaster')

  broadcaster = new Broadcaster()
  server = new RemoteServer({
    port: TEST_PORT,
    bindAddress: '127.0.0.1',
    costCache: {
      getSessionCosts: mockGetSessionCosts,
      getAllProjectCosts: mockGetAllProjectCosts
    } as never,
    broadcaster
  })
  await server.start()
})

afterAll(async () => {
  await server.stop()
})

beforeEach(() => {
  vi.clearAllMocks()
})

const BASE = `http://127.0.0.1:${TEST_PORT}`
const WS_URL = `ws://127.0.0.1:${TEST_PORT}/ws`

function connectWs(): Promise<WebSocket> {
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL)
    ws.on('open', () => resolve(ws))
  })
}

function waitForMessage(ws: WebSocket): Promise<{ event: string; data?: unknown }> {
  return new Promise((resolve) => {
    ws.once('message', (raw) => {
      resolve(JSON.parse(raw.toString()))
    })
  })
}

// ─── REST API ───

describe('Remote browser flow: REST API', () => {
  it('GET /api/projects-dir returns projects directory', async () => {
    const res = await fetch(`${BASE}/api/projects-dir`)
    expect(res.status).toBe(200)
    const dir = await res.json()
    expect(typeof dir).toBe('string')
  })

  it('GET /api/projects returns project list', async () => {
    const res = await fetch(`${BASE}/api/projects`)
    expect(res.status).toBe(200)
    const projects = await res.json()
    expect(projects).toHaveLength(2)
    expect(projects[0].name).toBe('project-a')
    expect(projects[1].encodedName).toBe('-project-b')
  })

  it('GET /api/sessions/:name returns sessions for project', async () => {
    const res = await fetch(`${BASE}/api/sessions/${encodeURIComponent('-project-a')}`)
    expect(res.status).toBe(200)
    const sessions = await res.json()
    expect(sessions).toHaveLength(2)
    expect(sessions[0].id).toBe('session-001')
    expect(sessions[1].type).toBe('background')
  })

  it('GET /api/messages?path= returns formatted messages', async () => {
    const path = '/home/user/project-a/session-001.jsonl'
    const res = await fetch(`${BASE}/api/messages?path=${encodeURIComponent(path)}`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.messages).toHaveLength(1)
    expect(data.messages[0].userText).toBe('hello')
    expect(data.totalUsage.input_tokens).toBe(100)
  })

  it('GET /api/messages without path returns 400', async () => {
    const res = await fetch(`${BASE}/api/messages`)
    expect(res.status).toBe(400)
  })

  it('GET /api/preferences returns read-only preferences', async () => {
    const res = await fetch(`${BASE}/api/preferences`)
    expect(res.status).toBe(200)
    const prefs = await res.json()
    expect(prefs.theme).toBe('dark')
    expect(prefs.remoteServer.enabled).toBe(true)
  })

  it('GET /api/session-costs?dir= returns costs', async () => {
    const dir = '/home/user/project-a'
    const res = await fetch(`${BASE}/api/session-costs?dir=${encodeURIComponent(dir)}`)
    expect(res.status).toBe(200)
    const costs = await res.json()
    expect(costs['/home/user/project-a/session-001.jsonl']).toBe(2.45)
  })

  it('GET /api/session-costs without dir returns 400', async () => {
    const res = await fetch(`${BASE}/api/session-costs`)
    expect(res.status).toBe(400)
  })

  it('GET /api/project-costs?dirs= returns aggregated costs', async () => {
    const dirs = ['/home/user/project-a']
    const res = await fetch(`${BASE}/api/project-costs?dirs=${encodeURIComponent(JSON.stringify(dirs))}`)
    expect(res.status).toBe(200)
    const costs = await res.json()
    expect(costs['/home/user/project-a'].total).toBe(2.57)
  })

  it('GET /api/project-costs without dirs returns 400', async () => {
    const res = await fetch(`${BASE}/api/project-costs`)
    expect(res.status).toBe(400)
  })

  it('CORS headers are set on API responses', async () => {
    const res = await fetch(`${BASE}/api/projects`)
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
  })
})

// ─── WebSocket: Broadcaster → client ───

describe('Remote browser flow: WebSocket broadcasts', () => {
  it('broadcasts new-messages to WS client when Broadcaster fires', async () => {
    const ws = await connectWs()
    const msgPromise = waitForMessage(ws)

    broadcaster.send('overseer:new-messages', {
      filePath: '/test.jsonl',
      messages: [{ uuid: 'x' }],
      usage: { input_tokens: 10 }
    })

    const msg = await msgPromise
    expect(msg.event).toBe('overseer:new-messages')
    expect(msg.data).toEqual({
      filePath: '/test.jsonl',
      messages: [{ uuid: 'x' }],
      usage: { input_tokens: 10 }
    })

    ws.close()
  })

  it('broadcasts projects-changed to WS client', async () => {
    const ws = await connectWs()
    const msgPromise = waitForMessage(ws)

    broadcaster.send('overseer:projects-changed')

    const msg = await msgPromise
    expect(msg.event).toBe('overseer:projects-changed')

    ws.close()
  })

  it('broadcasts sessions-changed to WS client', async () => {
    const ws = await connectWs()
    const msgPromise = waitForMessage(ws)

    broadcaster.send('overseer:sessions-changed', { projectEncodedName: '-test' })

    const msg = await msgPromise
    expect(msg.event).toBe('overseer:sessions-changed')
    expect(msg.data).toEqual({ projectEncodedName: '-test' })

    ws.close()
  })

  it('broadcasts cost-updated to WS client', async () => {
    const ws = await connectWs()
    const msgPromise = waitForMessage(ws)

    broadcaster.send('overseer:cost-updated')

    const msg = await msgPromise
    expect(msg.event).toBe('overseer:cost-updated')

    ws.close()
  })

  it('broadcasts resume-status to WS client', async () => {
    const ws = await connectWs()
    const msgPromise = waitForMessage(ws)

    broadcaster.send('overseer:resume-status', { sessionId: 'abc', status: 'running' })

    const msg = await msgPromise
    expect(msg.event).toBe('overseer:resume-status')
    expect(msg.data).toEqual({ sessionId: 'abc', status: 'running' })

    ws.close()
  })

  it('broadcasts to multiple clients simultaneously', async () => {
    const ws1 = await connectWs()
    const ws2 = await connectWs()

    const msg1 = waitForMessage(ws1)
    const msg2 = waitForMessage(ws2)

    broadcaster.send('overseer:cost-updated')

    const [r1, r2] = await Promise.all([msg1, msg2])
    expect(r1.event).toBe('overseer:cost-updated')
    expect(r2.event).toBe('overseer:cost-updated')

    ws1.close()
    ws2.close()
  })
})

// ─── WebSocket: watch/unwatch ───

describe('Remote browser flow: WebSocket watch/unwatch', () => {
  it('client sends watch message, server creates watcher', async () => {
    const { JsonlWatcher } = await import('../../src/main/services/jsonl-watcher')
    const ws = await connectWs()

    ws.send(JSON.stringify({ action: 'watch', path: '/tmp/session.jsonl' }))

    // Give server time to process the message
    await new Promise((r) => setTimeout(r, 50))

    expect(JsonlWatcher).toHaveBeenCalledWith(
      '/tmp/session.jsonl',
      expect.objectContaining({ onNewMessages: expect.any(Function) })
    )

    ws.close()
  })

  it('client sends unwatch after watch, watcher is stopped', async () => {
    const { JsonlWatcher } = await import('../../src/main/services/jsonl-watcher')
    const mockStop = vi.fn()
    vi.mocked(JsonlWatcher).mockImplementation(function(this: Record<string, unknown>) {
      this.start = vi.fn()
      this.stop = mockStop
    } as never)

    const ws = await connectWs()

    ws.send(JSON.stringify({ action: 'watch', path: '/tmp/session2.jsonl' }))
    await new Promise((r) => setTimeout(r, 50))

    ws.send(JSON.stringify({ action: 'unwatch', path: '/tmp/session2.jsonl' }))
    await new Promise((r) => setTimeout(r, 50))

    expect(mockStop).toHaveBeenCalled()

    ws.close()
  })

  it('watchers are cleaned up when client disconnects', async () => {
    const { JsonlWatcher } = await import('../../src/main/services/jsonl-watcher')
    const mockStop = vi.fn()
    vi.mocked(JsonlWatcher).mockImplementation(function(this: Record<string, unknown>) {
      this.start = vi.fn()
      this.stop = mockStop
    } as never)

    const ws = await connectWs()

    ws.send(JSON.stringify({ action: 'watch', path: '/tmp/disconnect-test.jsonl' }))
    await new Promise((r) => setTimeout(r, 50))

    ws.close()
    // Wait for close handler to run
    await new Promise((r) => setTimeout(r, 100))

    expect(mockStop).toHaveBeenCalled()
  })
})

// ─── Server status ───

describe('Remote browser flow: server status', () => {
  it('reports correct client count as clients connect and disconnect', async () => {
    const initial = server.getStatus()
    expect(initial.running).toBe(true)
    expect(initial.clientCount).toBe(0)

    const ws1 = await connectWs()
    expect(server.getStatus().clientCount).toBe(1)

    const ws2 = await connectWs()
    expect(server.getStatus().clientCount).toBe(2)

    ws1.close()
    await new Promise((r) => setTimeout(r, 100))
    expect(server.getStatus().clientCount).toBe(1)

    ws2.close()
    await new Promise((r) => setTimeout(r, 100))
    expect(server.getStatus().clientCount).toBe(0)
  })
})
