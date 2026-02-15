import { describe, it, expect } from 'vitest'
import { encodePath, decodePath } from '../../../src/main/utils/path-encoder'

describe('path-encoder', () => {
  describe('encodePath', () => {
    it('converts simple path to dash-encoded format', () => {
      expect(encodePath('/home/user')).toBe('-home-user')
    })

    it('converts complex path with multiple levels', () => {
      expect(encodePath('/var/projects/myapp')).toBe('-var-projects-myapp')
    })

    it('handles path without leading slash', () => {
      expect(encodePath('home/user')).toBe('home-user')
    })

    it('handles root path', () => {
      expect(encodePath('/')).toBe('-')
    })

    it('all slashes become dashes', () => {
      expect(encodePath('/a/b/c/d')).toBe('-a-b-c-d')
    })
  })

  describe('decodePath', () => {
    it('converts dash-encoded format back to path', () => {
      expect(decodePath('-home-user')).toBe('/home/user')
    })

    it('converts complex encoded path back to filesystem path', () => {
      expect(decodePath('-var-projects-myapp')).toBe('/var/projects/myapp')
    })

    it('handles encoded path without leading dash', () => {
      // No leading dash means no leading slash after decode
      expect(decodePath('home-user')).toBe('home/user')
    })

    it('all dashes become slashes', () => {
      expect(decodePath('-a-b-c-d')).toBe('/a/b/c/d')
    })
  })

  describe('round-trip', () => {
    it('encodes and decodes back to original (no dashes in dir names)', () => {
      const original = '/opt/apps/testproject'
      expect(decodePath(encodePath(original))).toBe(original)
    })

    it('works with various paths (no dashes in dir names)', () => {
      const paths = [
        '/home/user',
        '/mnt/external/projects/test',
        '/opt/code/example',
      ]

      paths.forEach(path => {
        expect(decodePath(encodePath(path))).toBe(path)
      })
    })

    it('is lossy with dashes in directory names', () => {
      // Dashes in dir names become slashes when decoded (matches Claude behavior)
      const original = '/home/myproject'
      const withDash = '/home/my-project'

      // Both encode to same thing
      expect(encodePath(withDash)).toBe('-home-my-project')

      // But decode gives /home/my/project (dash became slash)
      expect(decodePath('-home-my-project')).toBe('/home/my/project')

      // So it doesn't round-trip
      expect(decodePath(encodePath(withDash))).not.toBe(withDash)
    })
  })

  describe('real Claude examples', () => {
    it('matches actual Claude encoding for test fixture', () => {
      const encoded = '-test-project'
      expect(decodePath(encoded)).toBe('/test/project')
    })

    it('matches actual Claude encoding format', () => {
      // Real example from ~/.claude/projects/
      const path = '/home/code/app'
      const encoded = encodePath(path)
      expect(encoded).toBe('-home-code-app')
    })
  })
})
