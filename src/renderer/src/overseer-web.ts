/**
 * Drop-in replacement for window.overseer that uses fetch + WebSocket
 * instead of Electron IPC. Used when the app is loaded in a regular browser
 * via the remote monitoring server.
 */

import type { OverseerAPI } from '../../preload/index.d'

type EventCallback = (...args: unknown[]) => void

export function createWebOverseerAPI(): OverseerAPI {
  const baseUrl = `${window.location.protocol}//${window.location.host}`
  const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`

  // Event subscriptions
  const listeners = new Map<string, Set<EventCallback>>()

  function on(event: string, cb: EventCallback): () => void {
    if (!listeners.has(event)) listeners.set(event, new Set())
    listeners.get(event)!.add(cb)
    return () => {
      listeners.get(event)?.delete(cb)
    }
  }

  function emit(event: string, ...args: unknown[]): void {
    const cbs = listeners.get(event)
    if (cbs) {
      for (const cb of cbs) cb(...args)
    }
  }

  // WebSocket with auto-reconnect
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  function connectWs(): void {
    try {
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('[overseer-web] WebSocket connected')
      }

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as { event: string; data?: unknown }
          emit(msg.event, msg.data)
        } catch { /* invalid message */ }
      }

      ws.onclose = () => {
        ws = null
        scheduleReconnect()
      }

      ws.onerror = () => {
        ws?.close()
      }
    } catch {
      scheduleReconnect()
    }
  }

  function scheduleReconnect(): void {
    if (reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connectWs()
    }, 3000)
  }

  // Start connecting
  connectWs()

  async function fetchJson<T>(path: string): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }

  const api: OverseerAPI = {
    getProjectsDir: () => fetchJson('/api/projects-dir'),
    scanProjects: () => fetchJson('/api/projects'),
    discoverSessions: (name) => fetchJson(`/api/sessions/${encodeURIComponent(name)}`),
    getMessages: (path) => fetchJson(`/api/messages?path=${encodeURIComponent(path)}`),

    watchSession: async (path) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'watch', path }))
      }
    },

    unwatchSession: async (path) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'unwatch', path }))
      }
    },

    onNewMessages: (cb) => on('overseer:new-messages', cb as EventCallback),
    startDirectoryWatch: async () => { /* no-op for remote */ },
    stopDirectoryWatch: async () => { /* no-op for remote */ },
    onProjectsChanged: (cb) => on('overseer:projects-changed', cb as EventCallback),
    onSessionsChanged: (cb) => on('overseer:sessions-changed', cb as EventCallback),

    loadPreferences: () => fetchJson('/api/preferences'),
    savePreferences: async () => { /* read-only for remote clients */ },

    getSessionCosts: (dir) => fetchJson(`/api/session-costs?dir=${encodeURIComponent(dir)}`),
    getAllProjectCosts: (dirs) => fetchJson(`/api/project-costs?dirs=${encodeURIComponent(JSON.stringify(dirs))}`),
    onCostUpdated: (cb) => on('overseer:cost-updated', cb as EventCallback),

    resumeSession: async () => { /* read-only for remote clients */ },
    onResumeStatus: (cb) => on('overseer:resume-status', cb as EventCallback),

    onOpenPreferences: (cb) => on('overseer:open-preferences', cb as EventCallback),
    startRemoteServer: async () => { /* no-op for remote clients */ },
    stopRemoteServer: async () => { /* no-op for remote clients */ },
    getRemoteServerStatus: async () => ({ running: false, port: 0, address: '', clientCount: 0 })
  }

  return api
}
