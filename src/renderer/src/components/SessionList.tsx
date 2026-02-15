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
}

export function SessionList({ projectEncodedName }: SessionListProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (projectEncodedName) {
      loadSessions(projectEncodedName)
    } else {
      setSessions([])
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

  function getSessionIcon(session: Session): string {
    if (session.type === 'subagent') return '👥'
    if (session.type === 'background') return '🔵'
    return '🟢'
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
        {sessions.map(session => (
          <ListGroup.Item
            key={session.id}
            className="d-flex justify-content-between align-items-start"
            data-testid={`session-${session.type}-${session.id}`}
          >
            <div className="ms-2 me-auto">
              <div className="fw-bold">
                {getSessionIcon(session)} {getSessionLabel(session)}
              </div>
              <small className="text-muted">{session.type}</small>
            </div>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </div>
  )
}
