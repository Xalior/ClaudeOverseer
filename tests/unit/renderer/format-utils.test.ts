import { describe, it, expect } from 'vitest'
import { formatNum, formatTokens } from '@renderer/utils/format-utils'

describe('Format Utils', () => {
  describe('formatNum', () => {
    it('formats small numbers with locale string', () => {
      expect(formatNum(42)).toBe('42')
    })

    it('formats thousands with k suffix', () => {
      expect(formatNum(1_500)).toBe('1.5k')
    })

    it('formats exact thousand', () => {
      expect(formatNum(1_000)).toBe('1.0k')
    })

    it('formats millions with M suffix', () => {
      expect(formatNum(2_500_000)).toBe('2.5M')
    })

    it('formats exact million', () => {
      expect(formatNum(1_000_000)).toBe('1.0M')
    })

    it('formats zero', () => {
      expect(formatNum(0)).toBe('0')
    })

    it('formats 999 without suffix', () => {
      expect(formatNum(999)).toBe('999')
    })

    it('formats large thousands', () => {
      expect(formatNum(150_000)).toBe('150.0k')
    })

    it('rounds to one decimal place for k', () => {
      expect(formatNum(1_234)).toBe('1.2k')
    })

    it('rounds to one decimal place for M', () => {
      expect(formatNum(1_234_567)).toBe('1.2M')
    })
  })

  describe('formatTokens', () => {
    it('formats small numbers as plain string', () => {
      expect(formatTokens(42)).toBe('42')
    })

    it('formats thousands with k suffix', () => {
      expect(formatTokens(1_500)).toBe('1.5k')
    })

    it('formats millions with M suffix', () => {
      expect(formatTokens(2_500_000)).toBe('2.5M')
    })

    it('formats zero', () => {
      expect(formatTokens(0)).toBe('0')
    })

    it('returns string type for small numbers', () => {
      const result = formatTokens(100)
      expect(typeof result).toBe('string')
      expect(result).toBe('100')
    })
  })
})
