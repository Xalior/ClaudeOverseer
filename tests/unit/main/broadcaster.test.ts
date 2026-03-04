import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSend = vi.fn()
vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: () => [
      { webContents: { send: mockSend } },
      { webContents: { send: mockSend } }
    ]
  }
}))

describe('Broadcaster', () => {
  let Broadcaster: typeof import('../../../src/main/services/broadcaster').Broadcaster

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../../../src/main/services/broadcaster')
    Broadcaster = mod.Broadcaster
  })

  it('sends to all Electron windows', () => {
    const broadcaster = new Broadcaster()
    broadcaster.send('overseer:test-event', { foo: 'bar' })

    expect(mockSend).toHaveBeenCalledTimes(2)
    expect(mockSend).toHaveBeenCalledWith('overseer:test-event', { foo: 'bar' })
  })

  it('sends without data argument', () => {
    const broadcaster = new Broadcaster()
    broadcaster.send('overseer:cost-updated')

    expect(mockSend).toHaveBeenCalledTimes(2)
    expect(mockSend).toHaveBeenCalledWith('overseer:cost-updated')
  })

  it('sends to remote target when set', () => {
    const broadcaster = new Broadcaster()
    const mockRemote = { broadcast: vi.fn() }
    broadcaster.setRemoteTarget(mockRemote)

    broadcaster.send('overseer:test-event', { data: 123 })

    expect(mockRemote.broadcast).toHaveBeenCalledWith('overseer:test-event', { data: 123 })
  })

  it('does not send to remote target after clearing', () => {
    const broadcaster = new Broadcaster()
    const mockRemote = { broadcast: vi.fn() }
    broadcaster.setRemoteTarget(mockRemote)
    broadcaster.setRemoteTarget(null)

    broadcaster.send('overseer:test-event')

    expect(mockRemote.broadcast).not.toHaveBeenCalled()
  })

  it('handles window send errors gracefully', () => {
    const throwingSend = vi.fn(() => { throw new Error('not ready') })
    vi.mocked(mockSend).mockImplementationOnce(throwingSend as never)

    const broadcaster = new Broadcaster()
    // Should not throw
    expect(() => broadcaster.send('overseer:test-event')).not.toThrow()
  })
})
