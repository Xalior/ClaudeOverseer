import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { ToolCallCard } from './ToolCallCard'
import type { ToolUseBlock, ToolResultContent, TokenUsage } from '../../../../main/types'
import { Card, CardContent, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'

interface ToolPair {
  toolUse: ToolUseBlock
  toolResult: ToolResultContent | null
}

interface AssistantMessageProps {
  model: string
  textContent?: string
  toolPairs?: ToolPair[]
  usage?: TokenUsage
  timestamp: string
}

export function AssistantMessage({ model, textContent, toolPairs, usage, timestamp }: AssistantMessageProps) {
  const modelShort = model.replace(/^claude-/, '').replace(/-\d{8}$/, '')
  const relativeTime = getRelativeTime(timestamp)

  return (
    <Card className="message-card message-card--assistant" data-testid="assistant-message">
      <CardContent>
        <div className="message-card__header">
          <div>
            <CardTitle className="message-card__title message-card__title--inline">
              <span className="message-card__title-icon">🤖</span>Claude
            </CardTitle>
            <Badge variant="success" className="message-card__model" data-testid="model-badge">{modelShort}</Badge>
          </div>
          <div className="message-card__meta">
            {usage && (
              <small className="panel-muted" data-testid="token-usage">
                {usage.input_tokens}↓ {usage.output_tokens}↑
              </small>
            )}
            <small className="panel-muted">{relativeTime}</small>
          </div>
        </div>

        {textContent && (
          <div className="message-card__body" data-testid="assistant-text-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {textContent}
            </ReactMarkdown>
          </div>
        )}

        {toolPairs && toolPairs.map((pair) => (
          <ToolCallCard
            key={pair.toolUse.id}
            toolName={pair.toolUse.name}
            toolInput={pair.toolUse.input}
            toolResult={pair.toolResult}
          />
        ))}
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
