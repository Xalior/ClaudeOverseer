import { ListGroup, Badge } from 'react-bootstrap'
import { useAppStore } from '../store/useAppStore'

export function SessionList() {
  const { sessions, selectedSession, selectSession } = useAppStore()

  function getStatusBadge(lastModified: number) {
    const ageSeconds = (Date.now() - lastModified) / 1000

    if (ageSeconds < 60) {
      return <Badge bg="success">🟢 Active</Badge>
    }
    if (ageSeconds < 300) {
      return <Badge bg="primary">🔵 Recent</Badge>
    }
    return <Badge bg="secondary">⚪ Stale</Badge>
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'main':
        return '📄'
      case 'subagent':
        return '🔹'
      case 'background':
        return '🔵'
      default:
        return '📝'
    }
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center p-4">
        <div className="text-muted">
          <small>Select a project to view sessions</small>
        </div>
      </div>
    )
  }

  // Group sessions: main sessions first, then their subagents, then background agents
  const mainSessions = sessions.filter((s) => s.type === 'main')
  const backgroundAgents = sessions.filter((s) => s.type === 'background')
  const subagentsByParent = sessions
    .filter((s) => s.type === 'subagent')
    .reduce((acc, s) => {
      if (!s.parentId) return acc
      if (!acc[s.parentId]) acc[s.parentId] = []
      acc[s.parentId].push(s)
      return acc
    }, {} as Record<string, any[]>)

  return (
    <ListGroup variant="flush">
      {/* Main sessions with their subagents */}
      {mainSessions.map((session) => (
        <div key={session.id}>
          <ListGroup.Item
            active={selectedSession?.id === session.id}
            action
            onClick={() => selectSession(session)}
          >
            <div className="d-flex justify-content-between align-items-center">
              <span className="text-truncate">
                {getTypeIcon(session.type)} {session.id.substring(0, 8)}
              </span>
              {getStatusBadge(session.lastModified)}
            </div>
          </ListGroup.Item>

          {/* Subagents indented under parent */}
          {subagentsByParent[session.id]?.map((subagent) => (
            <ListGroup.Item
              key={subagent.id}
              active={selectedSession?.id === subagent.id}
              action
              onClick={() => selectSession(subagent)}
              className="ps-5"
            >
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-truncate">
                  {getTypeIcon(subagent.type)} {subagent.id}
                </span>
                {getStatusBadge(subagent.lastModified)}
              </div>
            </ListGroup.Item>
          ))}
        </div>
      ))}

      {/* Background agents */}
      {backgroundAgents.length > 0 && (
        <>
          <ListGroup.Item disabled className="bg-dark text-white-50">
            <small>Background Agents</small>
          </ListGroup.Item>
          {backgroundAgents.map((session) => (
            <ListGroup.Item
              key={session.id}
              active={selectedSession?.id === session.id}
              action
              onClick={() => selectSession(session)}
            >
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-truncate">
                  {getTypeIcon(session.type)} {session.id}
                </span>
                {getStatusBadge(session.lastModified)}
              </div>
            </ListGroup.Item>
          ))}
        </>
      )}
    </ListGroup>
  )
}
