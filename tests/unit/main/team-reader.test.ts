import { describe, it, expect } from 'vitest'
import { readTeamConfig, readTeamTasks, listTeams } from '@main/services/team-reader'
import path from 'path'

const FIXTURES_TEAMS = path.join(__dirname, '../../fixtures/teams')
const FIXTURES_TASKS = path.join(__dirname, '../../fixtures/tasks')

describe('Team Reader', () => {
  describe('readTeamConfig', () => {
    it('reads a valid team config', async () => {
      const config = await readTeamConfig('test-team', FIXTURES_TEAMS)
      expect(config).not.toBeNull()
      expect(config!.name).toBe('test-team')
      expect(config!.description).toBe('Test team for unit testing')
      expect(config!.members).toHaveLength(3)
    })

    it('parses team members correctly', async () => {
      const config = await readTeamConfig('test-team', FIXTURES_TEAMS)
      const lead = config!.members.find(m => m.name === 'team-lead')
      expect(lead).toBeDefined()
      expect(lead!.agentId).toBe('agent-lead-001')
      expect(lead!.agentType).toBe('general-purpose')

      const researcher = config!.members.find(m => m.name === 'researcher')
      expect(researcher).toBeDefined()
      expect(researcher!.agentType).toBe('Explore')
    })

    it('returns null for non-existent team', async () => {
      const config = await readTeamConfig('non-existent-team', FIXTURES_TEAMS)
      expect(config).toBeNull()
    })
  })

  describe('readTeamTasks', () => {
    it('reads all tasks for a team', async () => {
      const tasks = await readTeamTasks('test-team', FIXTURES_TASKS)
      expect(tasks).toHaveLength(3)
    })

    it('parses task fields correctly', async () => {
      const tasks = await readTeamTasks('test-team', FIXTURES_TASKS)
      const task1 = tasks.find(t => t.id === '1')
      expect(task1).toBeDefined()
      expect(task1!.subject).toBe('Research API design patterns')
      expect(task1!.status).toBe('completed')
      expect(task1!.owner).toBe('researcher')
    })

    it('parses blocked-by relationships', async () => {
      const tasks = await readTeamTasks('test-team', FIXTURES_TASKS)
      const task3 = tasks.find(t => t.id === '3')
      expect(task3).toBeDefined()
      expect(task3!.blockedBy).toEqual(['2'])
      expect(task3!.status).toBe('pending')
    })

    it('returns empty array for non-existent team', async () => {
      const tasks = await readTeamTasks('non-existent-team', FIXTURES_TASKS)
      expect(tasks).toHaveLength(0)
    })
  })

  describe('listTeams', () => {
    it('lists team directories', async () => {
      const teams = await listTeams(FIXTURES_TEAMS)
      expect(teams).toContain('test-team')
    })

    it('returns empty array for non-existent dir', async () => {
      const teams = await listTeams('/nonexistent/path')
      expect(teams).toHaveLength(0)
    })
  })
})
