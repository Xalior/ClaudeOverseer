import { describe, it, expect } from 'vitest'
import { scanProjects } from '../../src/main/services/project-scanner'
import { discoverSessions } from '../../src/main/services/session-discovery'
import path from 'path'

/**
 * Tests the IPC contract by calling the underlying services directly
 * This verifies the contract without needing a full Electron context
 */
describe('IPC contract integration', () => {
  const fixturesDir = path.join(__dirname, '../fixtures/projects')

  describe('overseer:scan-projects contract', () => {
    it('returns array of Project objects with correct shape', async () => {
      const projects = await scanProjects(fixturesDir)

      expect(Array.isArray(projects)).toBe(true)
      projects.forEach(project => {
        expect(project).toHaveProperty('name')
        expect(project).toHaveProperty('encodedName')
        expect(project).toHaveProperty('path')
        expect(project).toHaveProperty('sessionCount')

        expect(typeof project.name).toBe('string')
        expect(typeof project.encodedName).toBe('string')
        expect(typeof project.path).toBe('string')
        expect(typeof project.sessionCount).toBe('number')
      })
    })
  })

  describe('overseer:discover-sessions contract', () => {
    it('returns array of Session objects with correct shape', async () => {
      const projectDir = path.join(fixturesDir, '-test-project')
      const sessions = await discoverSessions(projectDir)

      expect(Array.isArray(sessions)).toBe(true)
      sessions.forEach(session => {
        expect(session).toHaveProperty('id')
        expect(session).toHaveProperty('type')
        expect(session).toHaveProperty('filePath')
        expect(session).toHaveProperty('lastModified')

        expect(typeof session.id).toBe('string')
        expect(['main', 'subagent', 'background']).toContain(session.type)
        expect(typeof session.filePath).toBe('string')
        expect(typeof session.lastModified).toBe('number')

        if (session.type === 'subagent') {
          expect(session).toHaveProperty('parentSessionId')
          expect(typeof session.parentSessionId).toBe('string')
        }
      })
    })
  })

  describe('data flow integrity', () => {
    it('can scan projects then discover their sessions', async () => {
      // Simulate the full workflow
      const projects = await scanProjects(fixturesDir)
      expect(projects.length).toBeGreaterThan(0)

      const firstProject = projects[0]
      const projectDir = path.join(fixturesDir, firstProject.encodedName)
      const sessions = await discoverSessions(projectDir)

      // sessionCount only counts top-level .jsonl files, not subagents
      // discoverSessions finds all sessions including subagents
      expect(sessions.length).toBeGreaterThanOrEqual(firstProject.sessionCount)
    })
  })
})
