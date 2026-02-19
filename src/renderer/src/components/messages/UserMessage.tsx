import { useMemo } from 'react'
import { Card, CardContent } from '../ui/card'
import { TaskNotificationCard, parseTaskNotificationXml } from './TaskNotificationCard'

interface UserImage {
  mediaType: string
  data: string
}

interface UserMessageProps {
  text: string
  images?: UserImage[]
  timestamp: string
}

/** Known system XML tags and how to present them */
const SYSTEM_TAGS: Record<string, { label: string; icon: string }> = {
  'local-command-caveat': { label: 'System', icon: '⚙️' },
  'local-command-stdout': { label: 'Output', icon: '📟' },
  'command-name': { label: 'Message', icon: '💬' },
  'command-message': { label: 'Command', icon: '⌨️' },
  'command-args': { label: 'Args', icon: '⚡' },
}

interface ParsedSegment {
  type: 'text' | 'system' | 'task-notification'
  content: string
  tag?: string
}

/**
 * Parse user text into segments: plain text vs system XML blocks.
 * System blocks get rendered as compact notices instead of raw XML.
 */
function parseUserText(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = []

  // First pass: extract task-notification blocks, leaving placeholders
  const taskNotifRe = /<task-notification>([\s\S]*?)<\/task-notification>/g
  const taskNotifs: { index: number; end: number; content: string }[] = []
  let tnMatch: RegExpExecArray | null
  while ((tnMatch = taskNotifRe.exec(text)) !== null) {
    taskNotifs.push({ index: tnMatch.index, end: taskNotifRe.lastIndex, content: tnMatch[1] })
  }

  // Split text into chunks around task-notification blocks
  const chunks: { type: 'raw' | 'task-notification'; content: string }[] = []
  let cursor = 0
  for (const tn of taskNotifs) {
    if (tn.index > cursor) {
      chunks.push({ type: 'raw', content: text.slice(cursor, tn.index) })
    }
    chunks.push({ type: 'task-notification', content: tn.content })
    cursor = tn.end
  }
  if (cursor < text.length) {
    chunks.push({ type: 'raw', content: text.slice(cursor) })
  }
  // If no task notifications, process normally
  if (taskNotifs.length === 0) {
    chunks.length = 0
    chunks.push({ type: 'raw', content: text })
  }

  // Second pass: parse system tags within raw chunks
  const tagNames = Object.keys(SYSTEM_TAGS).join('|')
  const re = new RegExp(
    `<(${tagNames})>([\\s\\S]*?)</\\1>|<(${tagNames})\\s*/>`,
    'g'
  )

  for (const chunk of chunks) {
    if (chunk.type === 'task-notification') {
      segments.push({ type: 'task-notification', content: chunk.content })
      continue
    }

    re.lastIndex = 0
    let lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = re.exec(chunk.content)) !== null) {
      if (match.index > lastIndex) {
        const before = chunk.content.slice(lastIndex, match.index).trim()
        if (before) segments.push({ type: 'text', content: before })
      }
      const tag = match[1] || match[3]
      const inner = (match[2] || '').trim()
      segments.push({ type: 'system', content: inner, tag })
      lastIndex = re.lastIndex
    }
    if (lastIndex < chunk.content.length) {
      const rest = chunk.content.slice(lastIndex).trim()
      if (rest) segments.push({ type: 'text', content: rest })
    }
  }

  return segments
}

export function UserMessage({ text, images, timestamp }: UserMessageProps) {
  const relativeTime = getRelativeTime(timestamp)
  const hasSystemTags = text && /<(?:local-command-caveat|local-command-stdout|command-name|command-message|command-args)[>\s/]/.test(text)
  const hasTaskNotifs = text && /<task-notification>/.test(text)

  const segments = useMemo(() => {
    if (!hasSystemTags && !hasTaskNotifs) return null
    // Filter out empty segments (e.g. <local-command-stdout></local-command-stdout>)
    const filtered = parseUserText(text).filter(s => s.content)
    return filtered.length > 0 ? filtered : null
  }, [text, hasSystemTags, hasTaskNotifs])

  // If it's entirely system segments with no real text, render compact
  const isAllSystem = segments !== null && segments.every(s => s.type === 'system')

  return (
    <Card
      className={`message-card message-card--user ${isAllSystem ? 'message-card--system' : ''}`}
      data-testid="user-message"
    >
      <CardContent>
        <div className="message-card__header">
          <div className="message-card__title">
            <span className="message-card__title-icon">{isAllSystem ? '⚙️' : '👤'}</span>
            <span className="message-card__role">{isAllSystem ? 'System' : 'User'}</span>
          </div>
          <span className="message-card__time" data-testid="message-timestamp">{relativeTime}</span>
        </div>
        {segments ? (
          <div className="message-card__text" data-testid="user-message-text">
            {segments.map((seg, i) => {
              if (seg.type === 'task-notification') {
                return <TaskNotificationCard key={i} data={parseTaskNotificationXml(seg.content)} />
              }
              if (seg.type === 'system') {
                const info = SYSTEM_TAGS[seg.tag || ''] || { label: 'System', icon: '⚙️' }
                if (!seg.content) return null
                return (
                  <div key={i} className="message-card__system-block">
                    <span className="message-card__system-label">{info.icon} {info.label}</span>
                    <span className="message-card__system-content">{seg.content}</span>
                  </div>
                )
              }
              return <p key={i}>{seg.content}</p>
            })}
          </div>
        ) : text ? (
          <p className="message-card__text" data-testid="user-message-text">{text}</p>
        ) : null}
        {images && images.length > 0 && (
          <div className="message-card__images">
            {images.map((img, i) => (
              <img
                key={i}
                src={`data:${img.mediaType};base64,${img.data}`}
                alt="User attachment"
                style={{
                  maxWidth: '100%',
                  maxHeight: '400px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-0)',
                  marginBottom: i < images.length - 1 ? '6px' : 0
                }}
                data-testid="user-image"
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function getRelativeTime(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diff = now - then
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}
