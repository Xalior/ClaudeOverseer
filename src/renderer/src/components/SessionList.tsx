import { useState, useEffect, useMemo } from 'react'
import { useSessions, useSessionCosts } from '../hooks/queries'
import { Badge } from './ui/badge'
import { Collapsible, CollapsibleContent } from './ui/collapsible'
import { getSessionStatus, getStatusBadge, formatDateTime } from '../utils/session-utils'
import { formatCost } from '../utils/pricing'

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
  projectDir: string | null
  onSessionSelect?: (filePath: string) => void
}

export function SessionList({ projectEncodedName, projectDir, onSessionSelect }: SessionListProps) {
  const { data: sessions = [], isLoading: loading } = useSessions(projectEncodedName)
  const { data: sessionCosts = {} } = useSessionCosts(projectDir)
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
    if (session.summary) return session.summary
    if (session.slug) return session.slug
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

  function renderSubagentRow(session: Session, isLast: boolean) {
    const status = getSessionStatus(session.lastModified)
    const cost = sessionCosts[session.filePath]
    const isSelected = session.id === selectedId

    return (
      <div
        key={session.id}
        className={`session-sub ${isSelected ? 'session-sub--active' : ''}`}
        data-testid={`session-${session.type}-${session.id}`}
        onClick={() => handleSelect(session)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleSelect(session)
          }
        }}
      >
        <div className="session-sub__connector">
          <div className={`session-sub__line ${isLast ? 'session-sub__line--last' : ''}`} />
          <div className="session-sub__branch" />
        </div>
        <div className="session-sub__content">
          <div className="session-sub__title">{getSessionTitle(session)}</div>
          <div className="session-sub__meta">
            {formatDateTime(session.lastModified)}
            {cost != null && cost > 0 && (
              <span className="session-sub__cost">{formatCost(cost)}</span>
            )}
          </div>
        </div>
        <div className={`session-sub__dot session-sub__dot--${status}`} />
      </div>
    )
  }

  function renderSessionGroup(session: Session) {
    const status = getSessionStatus(session.lastModified)
    const badge = getStatusBadge(status)
    const children = subagentsByParent.get(session.id) || []
    const hasChildren = children.length > 0
    const isExpanded = expandedParents.has(session.id)
    const cost = sessionCosts[session.filePath]

    return (
      <div
        key={session.id}
        className={`session-group ${hasChildren ? 'session-group--has-children' : ''} ${isExpanded ? 'session-group--expanded' : ''}`}
      >
        <div
          className={`session-item ${session.id === selectedId ? 'session-item--active' : ''} ${hasChildren ? 'session-item--parent' : ''}`}
          data-testid={`session-${session.type}-${session.id}`}
          onClick={() => handleSelect(session)}
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
              {badge.icon + ' '}{getSessionTitle(session)}
            </div>
            {session.summary && session.slug && (
              <div className="session-item__summary">
                {session.slug}
              </div>
            )}
            <small className="session-item__meta">
              {formatDateTime(session.lastModified)} · {session.type}
              {cost != null && cost > 0 && (
                <span className="session-item__cost">{formatCost(cost)}</span>
              )}
              {hasChildren && (
                <span
                  role="button"
                  onClick={(e) => toggleExpand(session.id, e)}
                  className="session-item__sub-toggle"
                >
                  <svg
                    className={`session-item__chevron ${isExpanded ? 'session-item__chevron--open' : ''}`}
                    width="10" height="10" viewBox="0 0 10 10" fill="none"
                  >
                    <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {children.length} sub
                </span>
              )}
            </small>
          </div>
          <Badge variant={badge.variant} data-testid={`status-${session.id}`}>
            {status}
          </Badge>
        </div>
        {hasChildren && (
          <Collapsible open={isExpanded}>
            <CollapsibleContent className="ui-collapsible-content">
              <div className="session-group__children">
                {children.map((child, i) => renderSubagentRow(child, i === children.length - 1))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    )
  }

  return (
    <div className="panel-content">
      <h5 className="panel-title panel-title--spaced">📄 Sessions</h5>
      <div className="session-list" data-testid="session-list-items">
        {topLevel.map((session: Session) => renderSessionGroup(session))}
      </div>
    </div>
  )
}
