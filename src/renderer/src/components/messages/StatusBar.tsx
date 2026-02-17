import type { TokenUsage } from '../../../../main/types'
import { formatNum } from '../../utils/format-utils'

interface StatusBarProps {
  usage: TokenUsage
  messageCount: number
}

export function StatusBar({ usage, messageCount }: StatusBarProps) {
  // Claude API: input_tokens = non-cached, cache_read = cached reads, cache_creation = new cache writes
  // Total effective input = all three combined
  const totalInput = usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens
  const totalAll = totalInput + usage.output_tokens

  return (
    <div className="status-bar" data-testid="status-bar">
      {/* Message count */}
      <div className="status-bar__section">
        <span>💬</span>
        <span className="status-bar__value">{messageCount}</span>
        <span className="status-bar__label">msgs</span>
      </div>

      <div className="status-bar__divider" />

      {/* Token totals */}
      <div className="status-bar__section">
        <span>📊</span>
        <span className="status-bar__value status-bar__value--accent">{formatNum(totalInput)}</span>
        <span className="status-bar__label">in</span>
      </div>

      <div className="status-bar__section">
        <span className="status-bar__value status-bar__value--ok">{formatNum(usage.output_tokens)}</span>
        <span className="status-bar__label">out</span>
      </div>

      {usage.cache_read_input_tokens > 0 && (
        <>
          <div className="status-bar__divider" />
          <div className="status-bar__section">
            <span>♻️</span>
            <span className="status-bar__value">{formatNum(usage.cache_read_input_tokens)}</span>
            <span className="status-bar__label">cached</span>
          </div>
        </>
      )}

      <div className="status-bar__section">
        <span className="status-bar__label">Σ {formatNum(totalAll)}</span>
      </div>

      {/* Spacer */}
      <div className="status-bar__spacer" />

      {/* Keyboard shortcut hints */}
      <div className="status-bar__kbd">
        <kbd>⌘J</kbd>
        <span>raw</span>
      </div>
    </div>
  )
}
