import { useState, useEffect, useMemo } from 'react'
import { ListGroup, Badge, Collapse } from 'react-bootstrap'
import { useSessions } from '../hooks/queries'

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
  const { data: sessions = [], isLoading: loading } = useSessions(projectEncodedName)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())

  const topLevel = useMemo(
    () => sessions.filter((s: Session) => s.type !== 'subagent'),
    [sessions]
  )

  const subagentsByParent = useMemo(() => {
    const map = new Map<string, Session[]>()
    for (const s of sessions) {
      if (s.type === 'subagent' && s.parentSessionId) {
        const list = map.get(s.parentSessionId) || []
        list.push(s)
        map.set(s.parentSessionId, list)
      }
    }
    return map
  }, [sessions])

  // Auto-expand parent of the selected session, or the active (most recent) parent
  useEffect(() => {
    if (selectedId) {
      const selectedSession = sessions.find((s: Session) => s.id === selectedId)
      if (selectedSession?.type === 'subagent' && selectedSession.parentSessionId) {
        setExpandedParents(prev => {
          const next = new Set(prev)
          next.add(selectedSession.parentSessionId!)
          return next
        })
      }
      if (selectedSession && subagentsByParent.has(selectedSession.id)) {
        setExpandedParents(prev => {
          const next = new Set(prev)
          next.add(selectedSession.id)
          return next
        })
      }
    } else {
      const activeParent = topLevel.find((s: Session) =>
        getSessionStatus(s.lastModified) === 'active' && subagentsByParent.has(s.id)
      )
      if (activeParent) {
        setExpandedParents(new Set([activeParent.id]))
      }
    }
  }, [selectedId, sessions])

  function handleSelect(session: Session) {
    setSelectedId(session.id)
    onSessionSelect?.(session.filePath)
  }

  function getSessionTitle(session: Session): string {
    if (session.slug) return session.slug
    if (session.summary) return session.summary
    return `${session.type}-${session.id}`
  }

  function toggleExpand(parentId: string, e: React.MouseEvent) {
    e.stopPropagation()
    setExpandedParents(prev => {
      const next = new Set(prev)
      if (next.has(parentId)) {
        next.delete(parentId)
      } else {
        next.add(parentId)
      }
      return next
    })
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

  function renderSessionItem(session: Session, indent: boolean = false) {
    const status = getSessionStatus(session.lastModified)
    const badge = getStatusBadge(status)
    const children = subagentsByParent.get(session.id) || []
    const hasChildren = children.length > 0
    const isExpanded = expandedParents.has(session.id)

    return (
      <ListGroup.Item
        key={session.id}
        action
        active={session.id === selectedId}
        className="d-flex justify-content-between align-items-start"
        data-testid={`session-${session.type}-${session.id}`}
        onClick={() => handleSelect(session)}
        style={{ cursor: 'pointer', paddingLeft: indent ? '2rem' : undefined }}
      >
        <div className="ms-2 me-auto" style={{ minWidth: 0 }}>
          <div className="fw-bold text-truncate">
            {indent ? '↳ ' : badge.icon + ' '}{getSessionTitle(session)}
          </div>
          {session.summary && (
            <div className="text-muted text-truncate" style={{ fontSize: '0.8rem' }}>
              {session.summary}
            </div>
          )}
          <small className="text-muted" style={{ fontSize: '0.75rem' }}>
            {formatDateTime(session.lastModified)} · {session.type}
            {hasChildren && (
              <span
                role="button"
                onClick={(e) => toggleExpand(session.id, e)}
                style={{ marginLeft: '0.5rem', userSelect: 'none' }}
              >
                {isExpanded ? '▼' : '▶'} {children.length} sub
              </span>
            )}
          </small>
        </div>
        <Badge bg={badge.variant} data-testid={`status-${session.id}`}>
          {status}
        </Badge>
      </ListGroup.Item>
    )
  }

  return (
    <div className="p-3">
      <h5 className="text-white mb-3">📄 Sessions</h5>
      <ListGroup data-testid="session-list-items">
        {topLevel.map((session: Session) => {
          const children = subagentsByParent.get(session.id) || []
          const isExpanded = expandedParents.has(session.id)
          return (
            <div key={session.id}>
              {renderSessionItem(session)}
              {children.length > 0 && (
                <Collapse in={isExpanded}>
                  <div>
                    {children.map(child => renderSessionItem(child, true))}
                  </div>
                </Collapse>
              )}
            </div>
          )
        })}
      </ListGroup>
    </div>
  )
}
