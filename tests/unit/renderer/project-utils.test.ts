import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sortProjects, getActivityLevel, formatRelativeTime } from '@renderer/utils/project-utils'

function makeProject(overrides: Partial<{ name: string; encodedName: string; sessionCount: number; lastModified: number }> = {}) {
  return {
    name: overrides.name ?? 'test-project',
    encodedName: overrides.encodedName ?? 'test-project',
    sessionCount: overrides.sessionCount ?? 5,
    lastModified: overrides.lastModified ?? Date.now()
  }
}

describe('Project Utils', () => {
  describe('sortProjects', () => {
    const projects = [
      makeProject({ name: 'Charlie', encodedName: 'charlie', sessionCount: 3, lastModified: 1000 }),
      makeProject({ name: 'Alpha', encodedName: 'alpha', sessionCount: 10, lastModified: 3000 }),
      makeProject({ name: 'Bravo', encodedName: 'bravo', sessionCount: 1, lastModified: 2000 })
    ]

    it('sorts alphabetically by name', () => {
      const sorted = sortProjects(projects, 'alpha')
      expect(sorted.map(p => p.name)).toEqual(['Alpha', 'Bravo', 'Charlie'])
    })

    it('sorts by most recent first', () => {
      const sorted = sortProjects(projects, 'recent')
      expect(sorted.map(p => p.name)).toEqual(['Alpha', 'Bravo', 'Charlie'])
    })

    it('sorts by session count descending', () => {
      const sorted = sortProjects(projects, 'sessions')
      expect(sorted.map(p => p.name)).toEqual(['Alpha', 'Charlie', 'Bravo'])
    })

    it('does not mutate the original array', () => {
      const original = [...projects]
      sortProjects(projects, 'alpha')
      expect(projects).toEqual(original)
    })

    it('handles empty array', () => {
      expect(sortProjects([], 'alpha')).toEqual([])
    })

    it('handles single item', () => {
      const single = [makeProject({ name: 'Solo' })]
      expect(sortProjects(single, 'recent')).toHaveLength(1)
    })
  })

  describe('getActivityLevel', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-02-17T12:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns "active" for timestamps less than 1 minute old', () => {
      const recent = Date.now() - 30_000 // 30 seconds ago
      expect(getActivityLevel(recent)).toBe('active')
    })

    it('returns "recent" for timestamps 1-5 minutes old', () => {
      const twoMinAgo = Date.now() - 120_000 // 2 minutes ago
      expect(getActivityLevel(twoMinAgo)).toBe('recent')
    })

    it('returns "stale" for timestamps older than 5 minutes', () => {
      const tenMinAgo = Date.now() - 600_000 // 10 minutes ago
      expect(getActivityLevel(tenMinAgo)).toBe('stale')
    })

    it('returns "stale" for zero timestamp', () => {
      expect(getActivityLevel(0)).toBe('stale')
    })

    it('returns "active" at exactly now', () => {
      expect(getActivityLevel(Date.now())).toBe('active')
    })

    it('returns "recent" at exactly 1 minute boundary', () => {
      const oneMinAgo = Date.now() - 60_000
      expect(getActivityLevel(oneMinAgo)).toBe('recent')
    })

    it('returns "stale" at exactly 5 minute boundary', () => {
      const fiveMinAgo = Date.now() - 300_000
      expect(getActivityLevel(fiveMinAgo)).toBe('stale')
    })
  })

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-02-17T12:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns "Never" for zero timestamp', () => {
      expect(formatRelativeTime(0)).toBe('Never')
    })

    it('returns "Just now" for very recent timestamps', () => {
      expect(formatRelativeTime(Date.now() - 10_000)).toBe('Just now')
    })

    it('returns minutes for recent timestamps', () => {
      expect(formatRelativeTime(Date.now() - 180_000)).toBe('3m ago')
    })

    it('returns hours for older timestamps', () => {
      expect(formatRelativeTime(Date.now() - 7_200_000)).toBe('2h ago')
    })

    it('returns days for multi-day timestamps', () => {
      expect(formatRelativeTime(Date.now() - 172_800_000)).toBe('2d ago')
    })

    it('returns formatted date for timestamps older than a week', () => {
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000
      const result = formatRelativeTime(twoWeeksAgo)
      // Should contain a month and day
      expect(result).toMatch(/\d/)
      expect(result).not.toContain('ago')
    })
  })
})
