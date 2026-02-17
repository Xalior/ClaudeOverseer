import { Card, CardContent, CardTitle } from '../ui/card'

interface UserImage {
  mediaType: string
  data: string
}

interface UserMessageProps {
  text: string
  images?: UserImage[]
  timestamp: string
}

export function UserMessage({ text, images, timestamp }: UserMessageProps) {
  const relativeTime = getRelativeTime(timestamp)

  return (
    <Card className="message-card message-card--user" data-testid="user-message">
      <CardContent>
        <div className="message-card__header">
          <CardTitle className="message-card__title">
            <span className="message-card__title-icon">👤</span>User
          </CardTitle>
          <small className="panel-muted" data-testid="message-timestamp">{relativeTime}</small>
        </div>
        {text && (
          <p className="message-card__text" data-testid="user-message-text">{text}</p>
        )}
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
                  border: '1px solid #30363d',
                  marginBottom: i < images.length - 1 ? '8px' : 0
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
