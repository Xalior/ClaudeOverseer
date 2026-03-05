import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { mkdirSync, writeFileSync, rmSync } from 'fs'

// The preferences module uses join(homedir(), '.ClaudeOverseer') for PREFS_DIR
// We mock homedir so PREFS_DIR resolves to our temp location
const FAKE_HOME = join(tmpdir(), `co-prefs-test-${Date.now()}`)
const FAKE_PREFS_DIR = join(FAKE_HOME, '.ClaudeOverseer')
const FAKE_PREFS_FILE = join(FAKE_PREFS_DIR, 'prefs.json')

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os')
  return {
    ...actual,
    homedir: () => FAKE_HOME
  }
})

describe('Preferences service', () => {
  beforeEach(() => {
    vi.resetModules()
    mkdirSync(FAKE_PREFS_DIR, { recursive: true })
  })

  afterEach(() => {
    try { rmSync(FAKE_HOME, { recursive: true, force: true }) } catch {}
  })

  it('defaults include projectsPanelCollapsed as false', async () => {
    const { loadPreferences } = await import('../../../src/main/services/preferences')
    const prefs = loadPreferences()

    expect(prefs.projectsPanelCollapsed).toBe(false)
  })

  it('preserves projectsPanelCollapsed when loading from disk', async () => {
    writeFileSync(FAKE_PREFS_FILE, JSON.stringify({ projectsPanelCollapsed: true }))

    const { loadPreferences } = await import('../../../src/main/services/preferences')
    const prefs = loadPreferences()

    expect(prefs.projectsPanelCollapsed).toBe(true)
  })

  it('defaults projectsPanelCollapsed when absent from saved prefs', async () => {
    writeFileSync(FAKE_PREFS_FILE, JSON.stringify({ theme: 'dark' }))

    const { loadPreferences } = await import('../../../src/main/services/preferences')
    const prefs = loadPreferences()

    expect(prefs.projectsPanelCollapsed).toBe(false)
    expect(prefs.theme).toBe('dark')
  })

  it('saves projectsPanelCollapsed via savePreferencesSync', async () => {
    const { savePreferencesSync, loadPreferences } = await import('../../../src/main/services/preferences')

    savePreferencesSync({ projectsPanelCollapsed: true })
    const prefs = loadPreferences()

    expect(prefs.projectsPanelCollapsed).toBe(true)
  })
})
