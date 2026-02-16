import { useState, useEffect, useRef } from 'react'
import { Form } from 'react-bootstrap'
import { UserMessage } from './UserMessage'
import { AssistantMessage } from './AssistantMessage'
import { RawJsonView } from './RawJsonView'
import { TokenUsageBar } from './TokenUsageBar'
import { useSessionMessages } from '../../hooks/queries'
import type { FormattedMessage } from '../../../../../main/services/message-formatter'

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

  if (!sessionFilePath) {
    return (
      <div className="p-3">
        <h5 className="text-white">💬 Message Stream</h5>
        <p className="text-muted small">Select a session to view messages</p>
      </div>
    )
  }

  if (loading && !session) {
    return (
      <div className="p-3">
        <h5 className="text-white">💬 Message Stream</h5>
        <p className="text-muted small">Loading messages...</p>
      </div>
    )
  }

  if (!session || session.messages.length === 0) {
    return (
      <div className="p-3">
        <h5 className="text-white">💬 Message Stream</h5>
        <p className="text-muted small">No messages in this session</p>
      </div>
    )
  }

  return (
    <div className="d-flex flex-column h-100" data-testid="message-stream-content">
      {/* Toolbar */}
      <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom border-secondary">
        <h6 className="text-white mb-0">💬 Message Stream</h6>
        <Form.Check
          type="switch"
          id="raw-toggle"
          label="Raw JSON"
          className="text-muted"
          checked={globalRaw}
          onChange={() => setGlobalRaw(!globalRaw)}
          data-testid="global-raw-toggle"
        />
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-grow-1 overflow-auto p-3" data-testid="message-list">
        {session.messages.map((msg) => (
          <div key={msg.uuid} data-testid={`message-${msg.uuid}`}>
            {isRaw(msg.uuid) ? (
              <RawJsonView data={msg.raw} />
            ) : (
              renderMessage(msg)
            )}
            {!globalRaw && msg.type !== 'queue-operation' && (
              <div className="text-end mb-2">
                <button
                  className="btn btn-link btn-sm text-muted p-0"
                  onClick={() => toggleRaw(msg.uuid)}
                  data-testid={`raw-toggle-${msg.uuid}`}
                >
                  [{rawToggles.has(msg.uuid) ? 'Formatted' : 'Raw'}]
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Token usage bar */}
      <TokenUsageBar usage={session.totalUsage} />
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
        <div className="text-center text-muted small my-2" data-testid="queue-operation">
          ⏳ Session started
        </div>
      )
    default:
      return null
  }
}
