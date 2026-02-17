import type { TokenUsage } from '../../../../main/types'
import { Badge } from '../ui/badge'

interface TokenUsageBarProps {
  usage: TokenUsage
}

export function TokenUsageBar({ usage }: TokenUsageBarProps) {
  const total = usage.input_tokens + usage.output_tokens

  return (
    <div className="token-usage-bar" data-testid="token-usage-bar">
      <small className="panel-muted">
        📊 Tokens:
      </small>
      <Badge variant="info">
        {usage.input_tokens.toLocaleString()} in
      </Badge>
      <Badge variant="success">
        {usage.output_tokens.toLocaleString()} out
      </Badge>
      {usage.cache_read_input_tokens > 0 && (
        <Badge variant="secondary">
          {usage.cache_read_input_tokens.toLocaleString()} cached
        </Badge>
      )}
      <small className="panel-muted">
        ({total.toLocaleString()} total)
      </small>
    </div>
  )
}
