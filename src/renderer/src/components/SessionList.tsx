import { useState, useEffect, useMemo } from 'react'
import { useSessions } from '../hooks/queries'
import { Badge } from './ui/badge'
import { Collapsible, CollapsibleContent } from './ui/collapsible'
import { getSessionStatus, getStatusBadge, formatDateTime } from '../utils/session-utils'

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
      <div className="panel-content">
        <h5 className="panel-title">📄 Sessions</h5>
        <p className="panel-muted">Select a project first</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="panel-content">
        <h5 className="panel-title">📄 Sessions</h5>
        <p className="panel-muted">Loading...</p>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="panel-content">
        <h5 className="panel-title">📄 Sessions</h5>
        <p className="panel-muted">No sessions found</p>
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
      <div
        key={session.id}
        className={`session-item ${session.id === selectedId ? 'session-item--active' : ''}`}
        data-testid={`session-${session.type}-${session.id}`}
        onClick={() => handleSelect(session)}
        style={{ paddingLeft: indent ? '2rem' : undefined }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleSelect(session)
          }
        }}
      >
        <div className="session-item__main">
          <div className="session-item__title">
            {indent ? '↳ ' : badge.icon + ' '}{getSessionTitle(session)}
          </div>
          {session.summary && (
            <div className="session-item__summary">
              {session.summary}
            </div>
          )}
          <small className="session-item__meta">
            {formatDateTime(session.lastModified)} · {session.type}
            {hasChildren && (
              <span
                role="button"
                onClick={(e) => toggleExpand(session.id, e)}
                className="session-item__sub-toggle"
              >
                {isExpanded ? '▼' : '▶'} {children.length} sub
              </span>
            )}
          </small>
        </div>
        <Badge variant={badge.variant} data-testid={`status-${session.id}`}>
          {status}
        </Badge>
      </div>
    )
  }

  return (
    <div className="panel-content">
      <h5 className="panel-title panel-title--spaced">📄 Sessions</h5>
      <div className="session-list" data-testid="session-list-items">
        {topLevel.map((session: Session) => {
          const children = subagentsByParent.get(session.id) || []
          const isExpanded = expandedParents.has(session.id)
          return (
            <div key={session.id}>
              {renderSessionItem(session)}
              {children.length > 0 && (
                <Collapsible open={isExpanded}>
                  <CollapsibleContent className="ui-collapsible-content">
                    {children.map(child => renderSessionItem(child, true))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
