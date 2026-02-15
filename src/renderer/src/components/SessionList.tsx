import { useState, useEffect } from 'react'
import { ListGroup, Badge } from 'react-bootstrap'

interface Session {
  id: string
  type: 'main' | 'subagent' | 'background'
  filePath: string
  lastModified: number
  parentSessionId?: string
  slug?: string
  summary?: string
}

interface SessionListProps {
  projectEncodedName: string | null
  onSessionSelect?: (filePath: string) => void
}

type SessionStatus = 'active' | 'recent' | 'stale'

function getSessionStatus(lastModified: number): SessionStatus {
  const now = Date.now()
  const diff = now - lastModified
  if (diff < 60 * 1000) return 'active'
  if (diff < 5 * 60 * 1000) return 'recent'
  return 'stale'
}

function getStatusBadge(status: SessionStatus): { icon: string; variant: string } {
  switch (status) {
    case 'active': return { icon: '🟢', variant: 'success' }
    case 'recent': return { icon: '🔵', variant: 'primary' }
    case 'stale': return { icon: '⚪', variant: 'secondary' }
  }
}

function formatDateTime(timestamp: number): string {
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

export function SessionList({ projectEncodedName, onSessionSelect }: SessionListProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (projectEncodedName) {
      loadSessions(projectEncodedName)
    } else {
      setSessions([])
      setSelectedId(null)
    }
  }, [projectEncodedName])

  async function loadSessions(encodedName: string) {
    setLoading(true)
    try {
      const projectsDir = await window.overseer.getProjectsDir()
      const discovered = await window.overseer.discoverSessions(encodedName, projectsDir)
      setSessions(discovered)
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(session: Session) {
    setSelectedId(session.id)
    onSessionSelect?.(session.filePath)
  }

  function getSessionTitle(session: Session): string {
    if (session.slug) return session.slug
    if (session.summary) return session.summary
    return `${session.type}-${session.id.slice(0, 8)}`
  }

  if (!projectEncodedName) {
    return (
      <div className="p-3">
        <h5 className="text-white">📄 Sessions</h5>
        <p className="text-muted small">Select a project first</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-3">
        <h5 className="text-white">📄 Sessions</h5>
        <p className="text-muted small">Loading...</p>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="p-3">
        <h5 className="text-white">📄 Sessions</h5>
        <p className="text-muted small">No sessions found</p>
      </div>
    )
  }

  return (
    <div className="p-3">
      <h5 className="text-white mb-3">📄 Sessions</h5>
      <ListGroup data-testid="session-list-items">
        {sessions.map(session => {
          const status = getSessionStatus(session.lastModified)
          const badge = getStatusBadge(status)
          return (
            <ListGroup.Item
              key={session.id}
              action
              active={session.id === selectedId}
              className="d-flex justify-content-between align-items-start"
              data-testid={`session-${session.type}-${session.id}`}
              onClick={() => handleSelect(session)}
              style={{ cursor: 'pointer' }}
            >
              <div className="ms-2 me-auto" style={{ minWidth: 0 }}>
                <div className="fw-bold text-truncate">
                  {badge.icon} {getSessionTitle(session)}
                </div>
                {session.summary && (
                  <div className="text-muted text-truncate" style={{ fontSize: '0.8rem' }}>
                    {session.summary}
                  </div>
                )}
                <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                  {formatDateTime(session.lastModified)} · {session.type}
                </small>
              </div>
              <Badge bg={badge.variant} data-testid={`status-${session.id}`}>
                {status}
              </Badge>
            </ListGroup.Item>
          )
        })}
      </ListGroup>
    </div>
  )
}
