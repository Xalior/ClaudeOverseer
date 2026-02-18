import { useState, useEffect, useRef } from 'react'
import { UserMessage } from './UserMessage'
import { AssistantMessage } from './AssistantMessage'
import { RawJsonView } from './RawJsonView'
import { StatusBar } from './StatusBar'
import { useSessionMessages } from '../../hooks/queries'
import type { FormattedMessage } from '../../../../main/services/message-formatter'
import { Switch } from '../ui/switch'

interface MessageStreamProps {
  sessionFilePath: string | null
}

export function MessageStream({ sessionFilePath }: MessageStreamProps) {
  const { data: session, isLoading: loading } = useSessionMessages(sessionFilePath)
  const [globalRaw, setGlobalRaw] = useState(false)
  const [rawToggles, setRawToggles] = useState<Set<string>>(new Set())
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)
  const isProgrammaticScrollRef = useRef(false)

  // Reset raw toggles and auto-scroll when session changes
  useEffect(() => {
    if (sessionFilePath) {
      shouldAutoScrollRef.current = true
      setRawToggles(new Set())
    }
  }, [sessionFilePath])

  // Auto-scroll to bottom only if user is already at the bottom
  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      isProgrammaticScrollRef.current = true
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })

      setTimeout(() => {
        isProgrammaticScrollRef.current = false
        const container = scrollContainerRef.current
        if (container) {
          const { scrollTop, scrollHeight, clientHeight } = container
          const distanceFromBottom = scrollHeight - scrollTop - clientHeight
          const isAtBottom = distanceFromBottom < 50
          shouldAutoScrollRef.current = isAtBottom
        }
      }, 300)
    }
  }, [session?.messages.length])

  // Track scroll position to determine if we should auto-scroll
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const checkScrollPosition = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      const isAtBottom = distanceFromBottom < 50
      shouldAutoScrollRef.current = isAtBottom
    }

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return
      checkScrollPosition()
    }

    // Initial check without checking isProgrammaticScrollRef flag
    checkScrollPosition()

    scrollContainer.addEventListener('scroll', handleScroll)
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [session])

  // Cmd+J keyboard shortcut to toggle raw mode
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault()
        setGlobalRaw(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function toggleRaw(uuid: string) {
    setRawToggles(prev => {
      const next = new Set(prev)
      if (next.has(uuid)) {
        next.delete(uuid)
      } else {
        next.add(uuid)
      }
      return next
    })
  }

  function isRaw(uuid: string): boolean {
    return globalRaw || rawToggles.has(uuid)
  }

  // Empty state: no session selected
  if (!sessionFilePath) {
    return (
      <div className="message-stream__empty">
        <span className="message-stream__empty-icon">💬</span>
        <h5 className="message-stream__empty-title">Message Stream</h5>
        <p className="message-stream__empty-hint">Select a session to view messages</p>
      </div>
    )
  }

  // Loading state
  if (loading && !session) {
    return (
      <div className="message-stream__empty">
        <span className="message-stream__empty-icon">⏳</span>
        <h5 className="message-stream__empty-title">Loading...</h5>
        <p className="message-stream__empty-hint">Fetching session messages</p>
      </div>
    )
  }

  // Empty session
  if (!session || session.messages.length === 0) {
    return (
      <div className="message-stream__empty">
        <span className="message-stream__empty-icon">📭</span>
        <h5 className="message-stream__empty-title">Empty Session</h5>
        <p className="message-stream__empty-hint">No messages in this session yet</p>
      </div>
    )
  }

  const messageCount = session.messages.length

  return (
    <div className="message-stream" data-testid="message-stream-content">
      {/* Toolbar */}
      <div className="message-stream__toolbar">
        <div className="message-stream__toolbar-left">
          <h6 className="message-stream__title">💬 Messages</h6>
          <span className="message-stream__msg-count">{messageCount}</span>
        </div>
        <div className="message-stream__toolbar-right">
          <label className="switch-field" htmlFor="raw-toggle">
            <span className="switch-field__label">Raw</span>
            <Switch
              id="raw-toggle"
              checked={globalRaw}
              onCheckedChange={setGlobalRaw}
              data-testid="global-raw-toggle"
            />
          </label>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="message-stream__list" data-testid="message-list">
        {session.messages.map((msg) => (
          <div key={msg.uuid} data-testid={`message-${msg.uuid}`}>
            {isRaw(msg.uuid) ? (
              <RawJsonView data={msg.raw} />
            ) : (
              renderMessage(msg)
            )}
            {!globalRaw && msg.type !== 'queue-operation' && (
              <div className="message-stream__raw-toggle-wrap">
                <button
                  className="message-stream__raw-toggle"
                  onClick={() => toggleRaw(msg.uuid)}
                  data-testid={`raw-toggle-${msg.uuid}`}
                >
                  {rawToggles.has(msg.uuid) ? '◀ formatted' : 'raw ▶'}
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Status Bar */}
      <StatusBar usage={session.totalUsage} messageCount={messageCount} messages={session.messages} />
    </div>
  )
}

function renderMessage(msg: FormattedMessage) {
  switch (msg.type) {
    case 'user':
      return (
        <UserMessage
          text={msg.userText || ''}
          images={msg.userImages}
          timestamp={msg.timestamp}
        />
      )
    case 'assistant':
      return (
        <AssistantMessage
          model={msg.model || 'unknown'}
          textContent={msg.textContent}
          toolPairs={msg.toolPairs}
          usage={msg.usage}
          timestamp={msg.timestamp}
        />
      )
    case 'queue-operation':
      return (
        <div className="queue-op" data-testid="queue-operation">
          ⚡ Session started
        </div>
      )
    default:
      return null
  }
}
