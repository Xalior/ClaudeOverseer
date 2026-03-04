import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { UserMessage } from './UserMessage'
import { AssistantMessage } from './AssistantMessage'
import { RawJsonView } from './RawJsonView'
import { StatusBar } from './StatusBar'
import { useSessionMessages } from '../../hooks/queries'
import type { FormattedMessage } from '../../../../main/services/message-formatter'
import { Switch } from '../ui/switch'

/** Tags that mark system/command XML in user messages */
const SYSTEM_TAG_RE = /^<(?:local-command-caveat|local-command-stdout|command-name|command-message|command-args|task-notification)[>\s/]/

/** Check if a user message is purely empty system XML (nothing visible to render) */
function isEmptySystemMessage(msg: FormattedMessage): boolean {
  if (msg.type !== 'user' || !msg.userText) return false
  const text = msg.userText.trim()
  if (!SYSTEM_TAG_RE.test(text)) return false
  // Extract all content from inside system tags
  const TAG_NAMES = 'local-command-caveat|local-command-stdout|command-name|command-message|command-args|task-notification'
  const contentRe = new RegExp(`<(${TAG_NAMES})[^>]*>([\\s\\S]*?)<\\/\\1>`, 'g')
  let hasContent = false
  let match: RegExpExecArray | null
  while ((match = contentRe.exec(text)) !== null) {
    if (match[2].trim()) { hasContent = true; break }
  }
  // Also check for any text outside the tags
  const outsideTags = text
    .replace(new RegExp(`<(?:${TAG_NAMES})[^>]*>[\\s\\S]*?<\\/(?:${TAG_NAMES})>`, 'g'), '')
    .replace(new RegExp(`<(?:${TAG_NAMES})\\s*/>`, 'g'), '')
    .trim()
  if (outsideTags) hasContent = true
  return !hasContent
}

interface ResumeInputProps {
  sessionFilePath: string
  projectPath: string | null
}

function ResumeInput({ sessionFilePath, projectPath }: ResumeInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [isResuming, setIsResuming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Extract session ID from file path (basename without .jsonl)
  const sessionId = useMemo(() => {
    const basename = sessionFilePath.split('/').pop() ?? ''
    return basename.replace(/\.jsonl$/, '')
  }, [sessionFilePath])

  // Listen for resume status updates
  useEffect(() => {
    const unsub = window.overseer.onResumeStatus((status) => {
      if (status.sessionId !== sessionId) return
      if (status.status === 'running') {
        setIsResuming(true)
        setError(null)
      } else if (status.status === 'completed') {
        setIsResuming(false)
        setError(null)
      } else if (status.status === 'error') {
        setIsResuming(false)
        setError(status.error ?? 'Unknown error')
      }
    })
    return unsub
  }, [sessionId])

  // Reset state when session changes
  useEffect(() => {
    setIsResuming(false)
    setError(null)
    setInputValue('')
  }, [sessionFilePath])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const prompt = inputValue.trim()
    if (!prompt || !projectPath || isResuming) return
    setError(null)
    setInputValue('')
    await window.overseer.resumeSession(sessionId, projectPath, prompt)
  }

  return (
    <form className="resume-input" onSubmit={handleSubmit} data-testid="resume-input">
      <input
        ref={inputRef}
        className="resume-input__field"
        type="text"
        placeholder={isResuming ? 'Resuming session...' : 'Send a prompt to resume this session...'}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        disabled={isResuming || !projectPath}
        data-testid="resume-input-field"
      />
      <button
        className="resume-input__btn"
        type="submit"
        disabled={isResuming || !inputValue.trim() || !projectPath}
        data-testid="resume-input-submit"
      >
        {isResuming ? '⏳' : '▶'}
      </button>
      {error && <span className="resume-input__error" data-testid="resume-input-error">{error}</span>}
    </form>
  )
}

interface MessageStreamProps {
  sessionFilePath: string | null
  projectPath?: string | null
}

export function MessageStream({ sessionFilePath, projectPath }: MessageStreamProps) {
  const { data: session, isLoading: loading } = useSessionMessages(sessionFilePath)
  const [globalRaw, setGlobalRaw] = useState(false)
  const [rawToggles, setRawToggles] = useState<Set<string>>(new Set())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)
  const isProgrammaticScrollRef = useRef(false)

  // Filter out user messages that are purely empty system XML
  const messages = useMemo(
    () => session?.messages.filter(m => !isEmptySystemMessage(m)) ?? [],
    [session?.messages]
  )
  const messageCount = messages.length

  const virtualizer = useVirtualizer({
    count: messageCount,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 150,
    overscan: 5,
  })

  // Reset raw toggles and auto-scroll when session changes
  useEffect(() => {
    if (sessionFilePath) {
      shouldAutoScrollRef.current = true
      setRawToggles(new Set())
    }
  }, [sessionFilePath])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!shouldAutoScrollRef.current || messageCount === 0) return

    isProgrammaticScrollRef.current = true
    virtualizer.scrollToIndex(messageCount - 1, { align: 'end' })

    setTimeout(() => {
      isProgrammaticScrollRef.current = false
      const container = scrollContainerRef.current
      if (container) {
        const { scrollTop, scrollHeight, clientHeight } = container
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight
        shouldAutoScrollRef.current = distanceFromBottom < 50
      }
    }, 300)
  }, [messageCount, virtualizer])

  // Track scroll position to determine if we should auto-scroll
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const checkScrollPosition = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      shouldAutoScrollRef.current = distanceFromBottom < 50
    }

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return
      checkScrollPosition()
    }

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

  const toggleRaw = useCallback((uuid: string) => {
    setRawToggles(prev => {
      const next = new Set(prev)
      if (next.has(uuid)) {
        next.delete(uuid)
      } else {
        next.add(uuid)
      }
      return next
    })
  }, [])

  function isRaw(uuid: string): boolean {
    return globalRaw || rawToggles.has(uuid)
  }

  // Empty state: no session selected
  if (!sessionFilePath) {
    return (
      <div className="message-stream__empty">
        <span className="message-stream__empty-icon">💬</span>
        <h5 className="message-stream__empty-title">Message Stream</h5>
        <p className="message-stream__empty-hint">Select a thread to view messages</p>
      </div>
    )
  }

  // Loading state
  if (loading && !session) {
    return (
      <div className="message-stream__empty">
        <span className="message-stream__empty-icon">⏳</span>
        <h5 className="message-stream__empty-title">Loading...</h5>
        <p className="message-stream__empty-hint">Fetching thread messages</p>
      </div>
    )
  }

  // Empty session
  if (!session || session.messages.length === 0) {
    return (
      <div className="message-stream__empty">
        <span className="message-stream__empty-icon">📭</span>
        <h5 className="message-stream__empty-title">Empty Thread</h5>
        <p className="message-stream__empty-hint">No messages in this thread yet</p>
      </div>
    )
  }

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

      {/* Virtualized Messages */}
      <div ref={scrollContainerRef} className="message-stream__list" data-testid="message-list">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const msg = messages[virtualRow.index]
            return (
              <div
                key={msg.uuid}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                data-testid={`message-${msg.uuid}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
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
            )
          })}
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar usage={session.totalUsage} messageCount={messageCount} messages={session.messages} />

      {/* Resume Input (hidden for remote clients) */}
      {!window.__REMOTE_CLIENT__ && (
        <ResumeInput sessionFilePath={sessionFilePath} projectPath={projectPath ?? null} />
      )}
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
