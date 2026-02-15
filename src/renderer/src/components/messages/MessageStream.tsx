import { useState, useEffect, useRef } from 'react'
import { Form } from 'react-bootstrap'
import { UserMessage } from './UserMessage'
import { AssistantMessage } from './AssistantMessage'
import { RawJsonView } from './RawJsonView'
import { TokenUsageBar } from './TokenUsageBar'
import type { FormattedMessage, FormattedSession } from '../../../../../main/services/message-formatter'

interface MessageStreamProps {
  sessionFilePath: string | null
}

export function MessageStream({ sessionFilePath }: MessageStreamProps) {
  const [session, setSession] = useState<FormattedSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [globalRaw, setGlobalRaw] = useState(false)
  const [rawToggles, setRawToggles] = useState<Set<string>>(new Set())
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (sessionFilePath) {
      loadMessages(sessionFilePath)
    } else {
      setSession(null)
    }
  }, [sessionFilePath])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [session])

  async function loadMessages(filePath: string) {
    setLoading(true)
    try {
      const result = await window.overseer.getMessages(filePath)
      setSession(result)
      setRawToggles(new Set())
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setLoading(false)
    }
  }

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

  if (loading) {
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
      <div className="flex-grow-1 overflow-auto p-3" data-testid="message-list">
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
