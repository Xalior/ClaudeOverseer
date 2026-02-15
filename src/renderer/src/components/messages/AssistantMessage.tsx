import { Card, Badge } from 'react-bootstrap'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { ToolCallCard } from './ToolCallCard'
import type { ToolUseBlock, ToolResultContent, TokenUsage } from '../../../../main/types'

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
    <Card className="mb-3 border-success" data-testid="assistant-message">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div>
            <Card.Title className="mb-0 fs-6 d-inline">
              <span className="me-2">🤖</span>Claude
            </Card.Title>
            <Badge bg="success" className="ms-2" data-testid="model-badge">{modelShort}</Badge>
          </div>
          <div className="d-flex align-items-center gap-2">
            {usage && (
              <small className="text-muted" data-testid="token-usage">
                {usage.input_tokens}↓ {usage.output_tokens}↑
              </small>
            )}
            <small className="text-muted">{relativeTime}</small>
          </div>
        </div>

        {textContent && (
          <div className="mb-2" data-testid="assistant-text-content">
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
