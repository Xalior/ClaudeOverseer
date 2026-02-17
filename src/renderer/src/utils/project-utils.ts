/**
 * Pure utility functions for project sorting and activity levels.
 * Extracted from ProjectList for testability.
 */

export type ProjectSortOrder = 'alpha' | 'recent' | 'sessions'

export interface ProjectData {
  name: string
  encodedName: string
  sessionCount: number
  lastModified: number
}

export function sortProjects<T extends ProjectData>(projects: T[], order: ProjectSortOrder): T[] {
  const sorted = [...projects]
  switch (order) {
    case 'alpha':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'recent':
      return sorted.sort((a, b) => b.lastModified - a.lastModified)
    case 'sessions':
      return sorted.sort((a, b) => b.sessionCount - a.sessionCount)
  }
}

export function getActivityLevel(timestamp: number): 'active' | 'recent' | 'stale' {
  if (!timestamp) return 'stale'
  const diff = Date.now() - timestamp
  if (diff < 60_000) return 'active'
  if (diff < 300_000) return 'recent'
  return 'stale'
}

export function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return 'Never'
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const date = new Date(timestamp)
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })
}
