import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { ToolCallCard } from './ToolCallCard'
import type { ToolUseBlock, ToolResultContent, TokenUsage } from '../../../../main/types'
import { Card, CardContent } from '../ui/card'
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
          <div className="message-card__title">
            <span className="message-card__title-icon">🤖</span>
            <span className="message-card__role">Claude</span>
            <Badge variant="success" className="message-card__model" data-testid="model-badge">{modelShort}</Badge>
          </div>
          <div className="message-card__meta">
            {usage && (
              <span className="message-card__tokens" data-testid="token-usage">
                {formatTokens(usage.input_tokens + (usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0))}↓ {formatTokens(usage.output_tokens)}↑
              </span>
            )}
            <span className="message-card__time">{relativeTime}</span>
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

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
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
