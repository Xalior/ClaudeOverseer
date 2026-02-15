import { describe, it, expect } from 'vitest'
import { scanProjects } from '../../src/main/services/project-scanner'
import path from 'path'

describe('project-scanner integration', () => {
  const fixturesDir = path.join(__dirname, '../fixtures/projects')

  it('discovers projects from fixtures directory', async () => {
    const projects = await scanProjects(fixturesDir)

    expect(projects).toHaveLength(1)
    expect(projects[0].encodedName).toBe('-test-project')
    expect(projects[0].name).toBe('project')
    expect(projects[0].path).toBe('/test/project')
  })

  it('counts sessions correctly', async () => {
    const projects = await scanProjects(fixturesDir)

    expect(projects[0].sessionCount).toBeGreaterThan(0)
  })

  it('returns empty array for non-existent directory', async () => {
    const projects = await scanProjects('/nonexistent/path')
    expect(projects).toEqual([])
  })

  it('skips memory directory and hidden files', async () => {
    const projects = await scanProjects(fixturesDir)

    // Should not include 'memory' or any .dotfiles
    projects.forEach(project => {
      expect(project.encodedName).not.toBe('memory')
      expect(project.encodedName).not.toMatch(/^\./)
    })
  })
})
