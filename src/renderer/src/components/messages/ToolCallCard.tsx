import { useState } from 'react'
import { Card, Badge, Collapse, Button } from 'react-bootstrap'

interface ToolCallCardProps {
  toolName: string
  toolInput: Record<string, unknown>
  toolResult: { content: string | Array<{ type: string; text: string }>; is_error?: boolean } | null
}

function extractToolResultText(content: string | Array<{ type: string; text: string }>): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.map(block => block.text || '').join('\n')
  }
  return String(content)
}

const TOOL_ICONS: Record<string, string> = {
  Read: '📄',
  Write: '✏️',
  Edit: '🔧',
  Bash: '💻',
  Grep: '🔍',
  Glob: '📁',
  WebSearch: '🌐',
  WebFetch: '🌐',
  Task: '📋',
  AskUserQuestion: '❓'
}

export function ToolCallCard({ toolName, toolInput, toolResult }: ToolCallCardProps) {
  const [showInput, setShowInput] = useState(false)
  const [showOutput, setShowOutput] = useState(false)
  const icon = TOOL_ICONS[toolName] || '🔧'

  const inputSummary = getInputSummary(toolName, toolInput)
  const resultText = toolResult ? extractToolResultText(toolResult.content) : ''
  const outputLines = resultText ? resultText.split('\n').length : 0

  return (
    <Card className="mb-2 border-secondary" data-testid="tool-call-card">
      <Card.Body className="py-2 px-3">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <Badge bg="secondary" className="me-2" data-testid="tool-name">
              {icon} {toolName}
            </Badge>
            {inputSummary && (
              <small className="text-muted" data-testid="tool-input-summary">{inputSummary}</small>
            )}
          </div>
          <div>
            <Button
              variant="link"
              size="sm"
              className="text-muted p-0 me-2"
              onClick={() => setShowInput(!showInput)}
              data-testid="tool-input-toggle"
            >
              {showInput ? '▼' : '▶'} Input
            </Button>
            {toolResult && (
              <Button
                variant="link"
                size="sm"
                className="text-muted p-0"
                onClick={() => setShowOutput(!showOutput)}
                data-testid="tool-output-toggle"
              >
                {showOutput ? '▼' : '▶'} Output ({outputLines} lines)
              </Button>
            )}
          </div>
        </div>

        <Collapse in={showInput}>
          <div>
            <pre className="mt-2 mb-0 p-2 bg-dark rounded small" data-testid="tool-input-content">
              <code>{JSON.stringify(toolInput, null, 2)}</code>
            </pre>
          </div>
        </Collapse>

        {toolResult && (
          <Collapse in={showOutput}>
            <div>
              <pre
                className={`mt-2 mb-0 p-2 rounded small ${toolResult.is_error ? 'bg-danger bg-opacity-25' : 'bg-dark'}`}
                data-testid="tool-output-content"
              >
                <code>{resultText}</code>
              </pre>
            </div>
          </Collapse>
        )}
      </Card.Body>
    </Card>
  )
}

function getInputSummary(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case 'Read':
      return (input.file_path as string) || ''
    case 'Write':
      return (input.file_path as string) || ''
    case 'Edit':
      return (input.file_path as string) || ''
    case 'Bash':
      return (input.command as string) || ''
    case 'Grep':
      return (input.pattern as string) || ''
    case 'Glob':
      return (input.pattern as string) || ''
    default:
      return ''
  }
}
