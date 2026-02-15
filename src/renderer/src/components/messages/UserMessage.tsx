import { Card } from 'react-bootstrap'

interface UserMessageProps {
  text: string
  timestamp: string
}

export function UserMessage({ text, timestamp }: UserMessageProps) {
  const relativeTime = getRelativeTime(timestamp)

  return (
    <Card className="mb-3 border-info" data-testid="user-message">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <Card.Title className="mb-0 fs-6">
            <span className="me-2">👤</span>User
          </Card.Title>
          <small className="text-muted" data-testid="message-timestamp">{relativeTime}</small>
        </div>
        <Card.Text className="mb-0" data-testid="user-message-text">{text}</Card.Text>
      </Card.Body>
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
