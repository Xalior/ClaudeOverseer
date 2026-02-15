import { Badge } from 'react-bootstrap'
import type { TokenUsage } from '../../../../main/types'

interface TokenUsageBarProps {
  usage: TokenUsage
}

export function TokenUsageBar({ usage }: TokenUsageBarProps) {
  const total = usage.input_tokens + usage.output_tokens

  return (
    <div
      className="d-flex justify-content-center align-items-center gap-3 py-2 px-3 border-top border-secondary"
      data-testid="token-usage-bar"
    >
      <small className="text-muted">
        📊 Tokens:
      </small>
      <Badge bg="info" className="fw-normal">
        {usage.input_tokens.toLocaleString()} in
      </Badge>
      <Badge bg="success" className="fw-normal">
        {usage.output_tokens.toLocaleString()} out
      </Badge>
      {usage.cache_read_input_tokens > 0 && (
        <Badge bg="secondary" className="fw-normal">
          {usage.cache_read_input_tokens.toLocaleString()} cached
        </Badge>
      )}
      <small className="text-muted">
        ({total.toLocaleString()} total)
      </small>
    </div>
  )
}
