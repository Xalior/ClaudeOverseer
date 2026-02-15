import { describe, it, expect } from 'vitest'
import { discoverSessions } from '../../src/main/services/session-discovery'
import path from 'path'

describe('session-discovery integration', () => {
  const fixtureProjectDir = path.join(__dirname, '../fixtures/projects/-test-project')

  it('discovers all session files', async () => {
    const sessions = await discoverSessions(fixtureProjectDir)

    expect(sessions.length).toBeGreaterThan(0)
  })

  it('identifies main sessions correctly', async () => {
    const sessions = await discoverSessions(fixtureProjectDir)
    const mainSessions = sessions.filter(s => s.type === 'main')

    expect(mainSessions.length).toBeGreaterThan(0)
    mainSessions.forEach(session => {
      expect(session.id).not.toMatch(/^agent-/)
      expect(session.filePath).toMatch(/\.jsonl$/)
    })
  })

  it('identifies background agents correctly', async () => {
    const sessions = await discoverSessions(fixtureProjectDir)
    const agents = sessions.filter(s => s.type === 'background')

    agents.forEach(agent => {
      expect(agent.id).toMatch(/^agent-/)
      expect(agent.filePath).toMatch(/\.jsonl$/)
    })
  })

  it('discovers subagents in subdirectories', async () => {
    const sessions = await discoverSessions(fixtureProjectDir)
    const subagents = sessions.filter(s => s.type === 'subagent')

    expect(subagents.length).toBeGreaterThan(0)
    subagents.forEach(subagent => {
      expect(subagent.parentSessionId).toBeDefined()
      expect(subagent.filePath).toContain('subagents')
    })
  })

  it('sorts sessions by most recent first', async () => {
    const sessions = await discoverSessions(fixtureProjectDir)

    for (let i = 0; i < sessions.length - 1; i++) {
      expect(sessions[i].lastModified).toBeGreaterThanOrEqual(sessions[i + 1].lastModified)
    }
  })

  it('includes lastModified timestamp', async () => {
    const sessions = await discoverSessions(fixtureProjectDir)

    sessions.forEach(session => {
      expect(session.lastModified).toBeGreaterThan(0)
    })
  })

  it('returns empty array for non-existent directory', async () => {
    const sessions = await discoverSessions('/nonexistent/path')
    expect(sessions).toEqual([])
  })

  it('extracts slug from session metadata', async () => {
    const sessions = await discoverSessions(fixtureProjectDir)
    const sessionWithSlug = sessions.find(s => s.slug === 'happy-testing-penguin')

    expect(sessionWithSlug).toBeDefined()
    expect(sessionWithSlug!.slug).toBe('happy-testing-penguin')
  })

  it('extracts summary from first user message', async () => {
    const sessions = await discoverSessions(fixtureProjectDir)
    const sessionWithSummary = sessions.find(s => s.summary?.includes('login file'))

    expect(sessionWithSummary).toBeDefined()
    expect(sessionWithSummary!.summary).toContain('read the login file')
  })

  it('returns undefined slug and summary when not available', async () => {
    const sessions = await discoverSessions(fixtureProjectDir)
    // All sessions should have the fields (even if undefined)
    sessions.forEach(session => {
      expect('slug' in session).toBe(true)
      expect('summary' in session).toBe(true)
    })
  })
})
