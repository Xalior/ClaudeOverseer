import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import http from 'http'
import WebSocket from 'ws'

// Mock electron
vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: () => []
  }
}))

// Mock services that remote-server depends on
vi.mock('../../../src/main/services/project-scanner', () => ({
  scanProjects: vi.fn(async () => [
    { name: 'test-project', encodedName: '-test-project', path: '/test', pathVerified: true, sessionCount: 1, lastModified: Date.now() }
  ])
}))

vi.mock('../../../src/main/services/session-discovery', () => ({
  discoverSessions: vi.fn(async () => [
    { id: 'session-1', type: 'main', filePath: '/test/session.jsonl', lastModified: Date.now() }
  ])
}))

vi.mock('../../../src/main/services/jsonl-parser', () => ({
  parseJsonlFile: vi.fn(async () => [])
}))

vi.mock('../../../src/main/services/message-formatter', () => ({
  formatMessages: vi.fn(() => ({ messages: [], totalUsage: { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } }))
}))

vi.mock('../../../src/main/services/preferences', () => ({
  loadPreferences: vi.fn(() => ({
    selectedProject: null,
    selectedSessionPath: null,
    windowState: { width: 1200, height: 800, isMaximized: false },
    panelWidths: [220, 280],
    pinnedProjects: [],
    hiddenProjects: [],
    projectSortOrder: 'recent',
    theme: 'system',
    remoteServer: { enabled: false, port: 19280, bindAddress: '0.0.0.0' }
  }))
}))

vi.mock('../../../src/main/services/jsonl-watcher', () => ({
  JsonlWatcher: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn()
  }))
}))

describe('RemoteServer', () => {
  let RemoteServer: typeof import('../../../src/main/services/remote-server').RemoteServer
  let Broadcaster: typeof import('../../../src/main/services/broadcaster').Broadcaster
  let server: InstanceType<typeof import('../../../src/main/services/remote-server').RemoteServer>
  let broadcaster: InstanceType<typeof import('../../../src/main/services/broadcaster').Broadcaster>
  const TEST_PORT = 19299

  beforeEach(async () => {
    vi.clearAllMocks()
    const remoteServerMod = await import('../../../src/main/services/remote-server')
    const broadcasterMod = await import('../../../src/main/services/broadcaster')
    RemoteServer = remoteServerMod.RemoteServer
    Broadcaster = broadcasterMod.Broadcaster

    broadcaster = new Broadcaster()
    const mockCostCache = {
      getSessionCosts: vi.fn(() => ({})),
      getAllProjectCosts: vi.fn(() => ({}))
    }

    server = new RemoteServer({
      port: TEST_PORT,
      bindAddress: '127.0.0.1',
      costCache: mockCostCache as never,
      broadcaster
    })
  })

  afterEach(async () => {
    await server.stop()
  })

  it('starts and stops without error', async () => {
    await server.start()
    const status = server.getStatus()
    expect(status.running).toBe(true)
    expect(status.port).toBe(TEST_PORT)

    await server.stop()
    const stopped = server.getStatus()
    expect(stopped.running).toBe(false)
  })

  it('serves API routes', async () => {
    await server.start()

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/projects`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data[0].name).toBe('test-project')
  })

  it('returns 404 for unknown API routes', async () => {
    await server.start()
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/nonexistent`)
    expect(res.status).toBe(404)
  })

  it('returns 405 for unsupported methods', async () => {
    await server.start()
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/projects`, { method: 'PUT' })
    expect(res.status).toBe(405)
  })

  it('returns 404 for unknown POST routes', async () => {
    await server.start()
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/projects`, { method: 'POST' })
    expect(res.status).toBe(404)
  })

  it('broadcasts events to connected WebSocket clients', async () => {
    await server.start()

    const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/ws`)

    await new Promise<void>((resolve) => {
      ws.on('open', resolve)
    })

    const messagePromise = new Promise<{ event: string; data?: unknown }>((resolve) => {
      ws.on('message', (data) => {
        resolve(JSON.parse(data.toString()))
      })
    })

    // Broadcast via the server's RemoteTarget interface
    server.broadcast('overseer:test-event', { hello: 'world' })

    const msg = await messagePromise
    expect(msg.event).toBe('overseer:test-event')
    expect(msg.data).toEqual({ hello: 'world' })

    ws.close()
  })

  it('tracks client count', async () => {
    await server.start()

    expect(server.getStatus().clientCount).toBe(0)

    const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/ws`)
    await new Promise<void>((resolve) => ws.on('open', resolve))

    expect(server.getStatus().clientCount).toBe(1)

    ws.close()
    // Wait for close event to propagate
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(server.getStatus().clientCount).toBe(0)
  })
})
