import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getSessionStatus, getStatusBadge, formatDateTime } from '@renderer/utils/session-utils'

describe('Session Utils', () => {
  describe('getSessionStatus', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-02-17T12:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns "active" for < 1 minute old', () => {
      expect(getSessionStatus(Date.now() - 30_000)).toBe('active')
    })

    it('returns "recent" for 1-5 minutes old', () => {
      expect(getSessionStatus(Date.now() - 180_000)).toBe('recent')
    })

    it('returns "stale" for > 5 minutes old', () => {
      expect(getSessionStatus(Date.now() - 600_000)).toBe('stale')
    })

    it('returns "active" at exactly now', () => {
      expect(getSessionStatus(Date.now())).toBe('active')
    })

    it('returns "stale" for very old timestamps', () => {
      expect(getSessionStatus(Date.now() - 86_400_000)).toBe('stale')
    })
  })

  describe('getStatusBadge', () => {
    it('returns green for active', () => {
      const badge = getStatusBadge('active')
      expect(badge.icon).toBe('🟢')
      expect(badge.variant).toBe('success')
    })

    it('returns blue for recent', () => {
      const badge = getStatusBadge('recent')
      expect(badge.icon).toBe('🔵')
      expect(badge.variant).toBe('info')
    })

    it('returns gray for stale', () => {
      const badge = getStatusBadge('stale')
      expect(badge.icon).toBe('⚪')
      expect(badge.variant).toBe('secondary')
    })
  })

  describe('formatDateTime', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-02-17T12:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('shows "Today" for timestamps from today', () => {
      const today = Date.now() - 3600_000 // 1 hour ago
      expect(formatDateTime(today)).toMatch(/^Today/)
    })

    it('shows "Yesterday" for timestamps from yesterday', () => {
      const yesterday = Date.now() - 86_400_000 // 24 hours ago
      expect(formatDateTime(yesterday)).toMatch(/^Yesterday/)
    })

    it('shows month and day for older timestamps', () => {
      const oldDate = new Date('2026-02-10T10:00:00.000Z').getTime()
      const result = formatDateTime(oldDate)
      expect(result).toMatch(/Feb/)
    })

    it('includes time component', () => {
      const result = formatDateTime(Date.now())
      // Time should contain digits and colon (e.g., "12:00")
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })
  })
})
