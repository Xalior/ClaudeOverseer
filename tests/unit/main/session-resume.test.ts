import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'events'

// Mock electron (still needed for Broadcaster)
const mockSend = vi.fn()
vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: () => [{ webContents: { send: mockSend } }]
  }
}))

// Mock child_process.spawn
const mockChild = new EventEmitter() as EventEmitter & { pid: number }
mockChild.pid = 12345

const mockSpawn = vi.fn(() => mockChild)
vi.mock('child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args)
}))

describe('session-resume', () => {
  let resumeSession: typeof import('../../../src/main/services/session-resume').resumeSession
  let isSessionResuming: typeof import('../../../src/main/services/session-resume').isSessionResuming
  let setResumeBroadcaster: typeof import('../../../src/main/services/session-resume').setResumeBroadcaster
  let Broadcaster: typeof import('../../../src/main/services/broadcaster').Broadcaster

  beforeEach(async () => {
    vi.clearAllMocks()
    // Re-import to reset module state
    vi.resetModules()

    // Re-setup mocks after module reset
    vi.doMock('electron', () => ({
      BrowserWindow: {
        getAllWindows: () => [{ webContents: { send: mockSend } }]
      }
    }))

    const freshChild = new EventEmitter() as EventEmitter & { pid: number }
    freshChild.pid = 12345
    mockSpawn.mockReturnValue(freshChild)

    const mod = await import('../../../src/main/services/session-resume')
    const broadcasterMod = await import('../../../src/main/services/broadcaster')
    resumeSession = mod.resumeSession
    isSessionResuming = mod.isSessionResuming
    setResumeBroadcaster = mod.setResumeBroadcaster
    Broadcaster = broadcasterMod.Broadcaster

    // Set up broadcaster for the module
    const broadcaster = new Broadcaster()
    setResumeBroadcaster(broadcaster)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('spawns claude with correct arguments', () => {
    resumeSession({
      sessionId: 'session-abc123',
      projectPath: '/home/user/project',
      prompt: 'fix the bug'
    })

    expect(mockSpawn).toHaveBeenCalledWith(
      'claude',
      ['--resume', 'session-abc123', '-p', 'fix the bug'],
      expect.objectContaining({
        cwd: '/home/user/project',
        shell: true,
        stdio: 'ignore'
      })
    )
  })

  it('broadcasts running status on spawn', () => {
    resumeSession({
      sessionId: 'session-abc123',
      projectPath: '/home/user/project',
      prompt: 'hello'
    })

    expect(mockSend).toHaveBeenCalledWith('overseer:resume-status', {
      sessionId: 'session-abc123',
      status: 'running'
    })
  })

  it('broadcasts completed status on exit code 0', () => {
    const child = new EventEmitter()
    mockSpawn.mockReturnValue(child)

    resumeSession({
      sessionId: 'session-abc123',
      projectPath: '/home/user/project',
      prompt: 'hello'
    })

    mockSend.mockClear()
    child.emit('exit', 0)

    expect(mockSend).toHaveBeenCalledWith('overseer:resume-status', {
      sessionId: 'session-abc123',
      status: 'completed',
      exitCode: 0
    })
  })

  it('broadcasts error status on non-zero exit', () => {
    const child = new EventEmitter()
    mockSpawn.mockReturnValue(child)

    resumeSession({
      sessionId: 'session-abc123',
      projectPath: '/home/user/project',
      prompt: 'hello'
    })

    mockSend.mockClear()
    child.emit('exit', 1)

    expect(mockSend).toHaveBeenCalledWith('overseer:resume-status', {
      sessionId: 'session-abc123',
      status: 'error',
      exitCode: 1,
      error: 'Process exited with code 1'
    })
  })

  it('broadcasts error status on spawn error', () => {
    const child = new EventEmitter()
    mockSpawn.mockReturnValue(child)

    resumeSession({
      sessionId: 'session-abc123',
      projectPath: '/home/user/project',
      prompt: 'hello'
    })

    mockSend.mockClear()
    child.emit('error', new Error('ENOENT'))

    expect(mockSend).toHaveBeenCalledWith('overseer:resume-status', {
      sessionId: 'session-abc123',
      status: 'error',
      error: 'ENOENT'
    })
  })

  it('prevents double-spawning on the same session', () => {
    const child = new EventEmitter()
    mockSpawn.mockReturnValue(child)

    resumeSession({
      sessionId: 'session-abc123',
      projectPath: '/home/user/project',
      prompt: 'first'
    })

    mockSpawn.mockClear()
    mockSend.mockClear()

    resumeSession({
      sessionId: 'session-abc123',
      projectPath: '/home/user/project',
      prompt: 'second'
    })

    expect(mockSpawn).not.toHaveBeenCalled()
    expect(mockSend).toHaveBeenCalledWith('overseer:resume-status', {
      sessionId: 'session-abc123',
      status: 'error',
      error: 'Session is already being resumed'
    })
  })
})
