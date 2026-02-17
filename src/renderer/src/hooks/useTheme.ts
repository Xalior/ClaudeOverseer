import { useState, useEffect, useCallback } from 'react'
import type { ThemeMode } from '../../../preload/index.d'

type ResolvedTheme = 'light' | 'dark'

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? getSystemTheme() : mode
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>('system')
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme('system'))
  const [loaded, setLoaded] = useState(false)

  // Load saved preference
  useEffect(() => {
    window.overseer.loadPreferences().then((prefs) => {
      const saved = prefs.theme || 'system'
      setMode(saved)
      setResolved(resolveTheme(saved))
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  // Listen for OS theme changes when in system mode
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (mode === 'system') {
        setResolved(getSystemTheme())
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  // Apply data-theme attribute to documentElement
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved)
  }, [resolved])

  const setTheme = useCallback((newMode: ThemeMode) => {
    setMode(newMode)
    setResolved(resolveTheme(newMode))
    window.overseer.savePreferences({ theme: newMode })
  }, [])

  return { mode, resolved, setTheme, loaded }
}
