import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock electron (needed for Broadcaster)
const mockSend = vi.fn()
vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: () => [{ webContents: { send: mockSend } }]
  }
}))

// Mock the SDK query function
const mockQuery = vi.fn()
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

// Mock fs/promises for .mcp.json loading
const mockReadFile = vi.fn()
vi.mock('fs/promises', () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args)
}))

describe('session-resume', () => {
  let resumeSession: typeof import('../../../src/main/services/session-resume').resumeSession
  let isSessionResuming: typeof import('../../../src/main/services/session-resume').isSessionResuming
  let setResumeBroadcaster: typeof import('../../../src/main/services/session-resume').setResumeBroadcaster
  let Broadcaster: typeof import('../../../src/main/services/broadcaster').Broadcaster

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()

    vi.doMock('electron', () => ({
      BrowserWindow: {
        getAllWindows: () => [{ webContents: { send: mockSend } }]
      }
    }))

    // Default: query returns an empty async generator (successful completion)
    mockQuery.mockReturnValue((async function* () {})())

    // Default: no .mcp.json found
    mockReadFile.mockRejectedValue(new Error('ENOENT'))

    const mod = await import('../../../src/main/services/session-resume')
    const broadcasterMod = await import('../../../src/main/services/broadcaster')
    resumeSession = mod.resumeSession
    isSessionResuming = mod.isSessionResuming
    setResumeBroadcaster = mod.setResumeBroadcaster
    Broadcaster = broadcasterMod.Broadcaster

    const broadcaster = new Broadcaster()
    setResumeBroadcaster(broadcaster)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls SDK query with correct options', async () => {
    await resumeSession({
      sessionId: 'session-abc123',
      projectPath: '/home/user/project',
      prompt: 'fix the bug'
    })

    expect(mockQuery).toHaveBeenCalledWith({
      prompt: 'fix the bug',
      options: expect.objectContaining({
        resume: 'session-abc123',
        cwd: '/home/user/project',
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        settingSources: ['user', 'project', 'local'],
        mcpServers: {}
      })
    })
  })

  it('passes an AbortController in options', async () => {
    await resumeSession({
      sessionId: 'session-abc123',
      projectPath: '/home/user/project',
      prompt: 'hello'
    })

    const callArgs = mockQuery.mock.calls[0][0]
    expect(callArgs.options.abortController).toBeInstanceOf(AbortController)
  })

  it('loads MCP servers from .mcp.json in project path', async () => {
    const mcpConfig = {
      mcpServers: {
        'chrome-devtools': {
          command: 'npx',
          args: ['-y', 'chrome-devtools-mcp@latest', '--browserUrl', 'http://127.0.0.1:19222']
        }
      }
    }
    mockReadFile.mockResolvedValue(JSON.stringify(mcpConfig))

    await resumeSession({
      sessionId: 'session-abc123',
      projectPath: '/home/user/project',
      prompt: 'hello'
    })

    expect(mockReadFile).toHaveBeenCalledWith('/home/user/project/.mcp.json', 'utf-8')
    const callArgs = mockQuery.mock.calls[0][0]
    expect(callArgs.options.mcpServers).toEqual(mcpConfig.mcpServers)
  })

  it('passes empty mcpServers when .mcp.json is missing', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'))

    await resumeSession({
      sessionId: 'session-abc123',
      projectPath: '/home/user/project',
      prompt: 'hello'
    })

    const callArgs = mockQuery.mock.calls[0][0]
    expect(callArgs.options.mcpServers).toEqual({})
  })

  it('broadcasts running status on start', async () => {
    await resumeSession({
      sessionId: 'session-abc123',
      projectPath: '/home/user/project',
      prompt: 'hello'
    })

    expect(mockSend).toHaveBeenCalledWith('overseer:resume-status', {
      sessionId: 'session-abc123',
      status: 'running'
    })
  })

  it('broadcasts completed status on successful completion', async () => {
    await resumeSession({
      sessionId: 'session-abc123',
      projectPath: '/home/user/project',
      prompt: 'hello'
    })

    expect(mockSend).toHaveBeenCalledWith('overseer:resume-status', {
      sessionId: 'session-abc123',
      status: 'completed'
    })
  })

  it('broadcasts error status when SDK throws', async () => {
    mockQuery.mockReturnValue((async function* () {
      throw new Error('API key invalid')
    })())

    await resumeSession({
      sessionId: 'session-abc123',
      projectPath: '/home/user/project',
      prompt: 'hello'
    })

    expect(mockSend).toHaveBeenCalledWith('overseer:resume-status', {
      sessionId: 'session-abc123',
      status: 'error',
      error: 'API key invalid'
    })
  })

  it('broadcasts error status for non-Error throws', async () => {
    mockQuery.mockReturnValue((async function* () {
      throw 'something went wrong'
    })())

    await resumeSession({
      sessionId: 'session-abc123',
      projectPath: '/home/user/project',
      prompt: 'hello'
    })

    expect(mockSend).toHaveBeenCalledWith('overseer:resume-status', {
      sessionId: 'session-abc123',
      status: 'error',
      error: 'something went wrong'
    })
  })

  it('prevents double-resume on the same session', async () => {
    // Make query hang (never resolves) to simulate in-progress
    mockQuery.mockReturnValue((async function* () {
      await new Promise(() => {}) // never resolves
    })())

    // Start first resume (don't await — it won't finish)
    const first = resumeSession({
      sessionId: 'session-abc123',
      projectPath: '/home/user/project',
      prompt: 'first'
    })

    // Wait a tick for the first call to register
    await new Promise((r) => setTimeout(r, 10))

    mockQuery.mockClear()
    mockSend.mockClear()

    // Try second resume on same session
    await resumeSession({
      sessionId: 'session-abc123',
      projectPath: '/home/user/project',
      prompt: 'second'
    })

    expect(mockQuery).not.toHaveBeenCalled()
    expect(mockSend).toHaveBeenCalledWith('overseer:resume-status', {
      sessionId: 'session-abc123',
      status: 'error',
      error: 'Session is already being resumed'
    })

    // Clean up the hanging promise (suppress unhandled rejection)
    first.catch(() => {})
  })

  it('clears active state after completion', async () => {
    await resumeSession({
      sessionId: 'session-abc123',
      projectPath: '/home/user/project',
      prompt: 'hello'
    })

    expect(isSessionResuming('session-abc123')).toBe(false)
  })

  it('clears active state after error', async () => {
    mockQuery.mockReturnValue((async function* () {
      throw new Error('fail')
    })())

    await resumeSession({
      sessionId: 'session-abc123',
      projectPath: '/home/user/project',
      prompt: 'hello'
    })

    expect(isSessionResuming('session-abc123')).toBe(false)
  })
})
