import { useState, useEffect } from 'react'
import { ListGroup, Badge } from 'react-bootstrap'

interface Session {
  id: string
  type: 'main' | 'subagent' | 'background'
  filePath: string
  lastModified: number
  parentSessionId?: string
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

  function getSessionLabel(session: Session): string {
    if (session.type === 'subagent') {
      return `${session.id} (subagent)`
    }
    return session.id
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
              <div className="ms-2 me-auto">
                <div className="fw-bold">
                  {badge.icon} {getSessionLabel(session)}
                </div>
                <small className="text-muted">{session.type}</small>
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
