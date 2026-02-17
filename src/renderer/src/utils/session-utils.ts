/**
 * Pure utility functions for session status detection.
 * Extracted from SessionList for testability.
 */

export type SessionStatus = 'active' | 'recent' | 'stale'

export function getSessionStatus(lastModified: number): SessionStatus {
  const now = Date.now()
  const diff = now - lastModified
  if (diff < 60 * 1000) return 'active'
  if (diff < 5 * 60 * 1000) return 'recent'
  return 'stale'
}

export function getStatusBadge(status: SessionStatus): { icon: string; variant: 'success' | 'info' | 'secondary' } {
  switch (status) {
    case 'active': return { icon: '🟢', variant: 'success' }
    case 'recent': return { icon: '🔵', variant: 'info' }
    case 'stale': return { icon: '⚪', variant: 'secondary' }
  }
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (isToday) return `Today ${time}`
  if (isYesterday) return `Yesterday ${time}`
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` ${time}`
}
