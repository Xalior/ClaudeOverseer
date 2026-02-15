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
  AskUserQuestion: '❓',
  NotebookEdit: '📓',
  TodoWrite: '✅'
}

const terminalStyle: React.CSSProperties = {
  backgroundColor: '#1a1a2e',
  color: '#e0e0e0',
  fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace",
  fontSize: '0.85rem',
  borderRadius: '6px',
  padding: '12px',
  margin: '8px 0 0 0',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  lineHeight: 1.5
}

const codeBlockStyle: React.CSSProperties = {
  backgroundColor: '#0d1117',
  color: '#c9d1d9',
  fontFamily: "'SF Mono', 'Fira Code', Menlo, Monaco, monospace",
  fontSize: '0.85rem',
  borderRadius: '6px',
  padding: '12px',
  margin: '8px 0 0 0',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  lineHeight: 1.4
}

/** Bash: render like a terminal */
function BashPrettyPrint({ input, result, isError }: {
  input: Record<string, unknown>
  result: string
  isError: boolean
}) {
  const [showOutput, setShowOutput] = useState(true)
  const command = (input.command as string) || ''
  const outputLines = result ? result.split('\n').length : 0

  return (
    <div style={{ ...terminalStyle, border: '1px solid #30363d' }} data-testid="tool-input-content">
      {/* Terminal title bar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', gap: '6px' }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ff5f57', display: 'inline-block' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#febc2e', display: 'inline-block' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#28c840', display: 'inline-block' }} />
        <span style={{ color: '#8b949e', fontSize: '0.75rem', marginLeft: '8px' }}>bash</span>
      </div>
      {/* Command */}
      <div>
        <span style={{ color: '#7ee787' }}>$ </span>
        <span style={{ color: '#f0f6fc' }}>{command}</span>
      </div>
      {/* Output */}
      {result && (
        <>
          <div style={{ marginTop: '4px' }}>
            <Button
              variant="link"
              size="sm"
              className="p-0"
              style={{ color: '#8b949e', fontSize: '0.75rem', textDecoration: 'none' }}
              onClick={() => setShowOutput(!showOutput)}
            >
              {showOutput ? '▼' : '▶'} output ({outputLines} lines)
            </Button>
          </div>
          <Collapse in={showOutput}>
            <div data-testid="tool-output-content" style={{
              color: isError ? '#f85149' : '#e0e0e0',
              marginTop: '4px',
              borderTop: '1px solid #30363d',
              paddingTop: '8px'
            }}>
              {result}
            </div>
          </Collapse>
        </>
      )}
    </div>
  )
}

/** Read/Write/Edit: render with file path header and content */
function FilePrettyPrint({ toolName, input, result, isError }: {
  toolName: string
  input: Record<string, unknown>
  result: string
  isError: boolean
}) {
  const [showContent, setShowContent] = useState(true)
  const filePath = (input.file_path as string) || ''
  const fileName = filePath.split('/').pop() || filePath
  const outputLines = result ? result.split('\n').length : 0

  // For Edit, show old_string -> new_string
  const isEdit = toolName === 'Edit'
  const oldStr = isEdit ? (input.old_string as string) : null
  const newStr = isEdit ? (input.new_string as string) : null

  return (
    <div style={{ ...codeBlockStyle, border: '1px solid #30363d' }} data-testid="tool-input-content">
      {/* File header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #30363d', paddingBottom: '6px' }}>
        <div>
          <span style={{ color: '#8b949e', marginRight: '6px' }}>{TOOL_ICONS[toolName]}</span>
          <span style={{ color: '#79c0ff', fontWeight: 500 }}>{fileName}</span>
          <span style={{ color: '#484f58', fontSize: '0.75rem', marginLeft: '8px' }}>{filePath}</span>
        </div>
        {result && (
          <Button
            variant="link"
            size="sm"
            className="p-0"
            style={{ color: '#8b949e', fontSize: '0.75rem', textDecoration: 'none' }}
            onClick={() => setShowContent(!showContent)}
          >
            {showContent ? '▼' : '▶'} {outputLines} lines
          </Button>
        )}
      </div>

      {/* Edit diff view */}
      {isEdit && oldStr && newStr && (
        <div style={{ marginBottom: '8px' }}>
          <div style={{ backgroundColor: '#3d1f1f', padding: '6px 8px', borderRadius: '4px', marginBottom: '4px' }}>
            <span style={{ color: '#f85149', fontWeight: 600 }}>- </span>
            <span style={{ color: '#ffa198' }}>{oldStr.length > 200 ? oldStr.slice(0, 200) + '...' : oldStr}</span>
          </div>
          <div style={{ backgroundColor: '#1f3d1f', padding: '6px 8px', borderRadius: '4px' }}>
            <span style={{ color: '#3fb950', fontWeight: 600 }}>+ </span>
            <span style={{ color: '#7ee787' }}>{newStr.length > 200 ? newStr.slice(0, 200) + '...' : newStr}</span>
          </div>
        </div>
      )}

      {/* File content / result */}
      {result && (
        <Collapse in={showContent}>
          <div data-testid="tool-output-content" style={{ color: isError ? '#f85149' : '#c9d1d9' }}>
            {result}
          </div>
        </Collapse>
      )}
    </div>
  )
}

/** Grep/Glob: render search-style */
function SearchPrettyPrint({ toolName, input, result, isError }: {
  toolName: string
  input: Record<string, unknown>
  result: string
  isError: boolean
}) {
  const [showResults, setShowResults] = useState(true)
  const pattern = (input.pattern as string) || ''
  const path = (input.path as string) || (input.file_path as string) || ''
  const resultLines = result ? result.split('\n').filter(l => l.trim()).length : 0

  return (
    <div style={{ ...codeBlockStyle, border: '1px solid #30363d' }} data-testid="tool-input-content">
      <div style={{ marginBottom: '8px' }}>
        <span style={{ color: '#8b949e' }}>{TOOL_ICONS[toolName]} </span>
        <span style={{ color: '#d2a8ff', fontWeight: 500 }}>{pattern}</span>
        {path && <span style={{ color: '#484f58', marginLeft: '8px' }}>in {path}</span>}
        {resultLines > 0 && (
          <span style={{ color: '#7ee787', marginLeft: '8px', fontSize: '0.8rem' }}>({resultLines} matches)</span>
        )}
      </div>

      {result && (
        <>
          <Button
            variant="link"
            size="sm"
            className="p-0"
            style={{ color: '#8b949e', fontSize: '0.75rem', textDecoration: 'none', marginBottom: '4px' }}
            onClick={() => setShowResults(!showResults)}
          >
            {showResults ? '▼' : '▶'} results
          </Button>
          <Collapse in={showResults}>
            <div data-testid="tool-output-content" style={{
              color: isError ? '#f85149' : '#c9d1d9',
              borderTop: '1px solid #30363d',
              paddingTop: '8px',
              marginTop: '4px'
            }}>
              {result}
            </div>
          </Collapse>
        </>
      )}
    </div>
  )
}

/** Generic fallback for unknown tools */
function GenericPrettyPrint({ toolName, input, result, isError }: {
  toolName: string
  input: Record<string, unknown>
  result: string
  isError: boolean
}) {
  const [showInput, setShowInput] = useState(false)
  const [showOutput, setShowOutput] = useState(true)

  return (
    <div style={{ ...codeBlockStyle, border: '1px solid #30363d' }} data-testid="tool-input-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#c9d1d9' }}>{TOOL_ICONS[toolName] || '🔧'} {toolName}</span>
        <div>
          <Button
            variant="link"
            size="sm"
            className="p-0 me-2"
            style={{ color: '#8b949e', fontSize: '0.75rem', textDecoration: 'none' }}
            onClick={() => setShowInput(!showInput)}
          >
            {showInput ? '▼' : '▶'} input
          </Button>
          {result && (
            <Button
              variant="link"
              size="sm"
              className="p-0"
              style={{ color: '#8b949e', fontSize: '0.75rem', textDecoration: 'none' }}
              onClick={() => setShowOutput(!showOutput)}
            >
              {showOutput ? '▼' : '▶'} output
            </Button>
          )}
        </div>
      </div>
      <Collapse in={showInput}>
        <pre style={{ color: '#c9d1d9', margin: '8px 0 0 0', fontSize: '0.8rem' }}>
          <code>{JSON.stringify(input, null, 2)}</code>
        </pre>
      </Collapse>
      {result && (
        <Collapse in={showOutput}>
          <div data-testid="tool-output-content" style={{
            color: isError ? '#f85149' : '#c9d1d9',
            borderTop: '1px solid #30363d',
            paddingTop: '8px',
            marginTop: '8px'
          }}>
            {result}
          </div>
        </Collapse>
      )}
    </div>
  )
}

export function ToolCallCard({ toolName, toolInput, toolResult }: ToolCallCardProps) {
  const resultText = toolResult ? extractToolResultText(toolResult.content) : ''
  const isError = toolResult?.is_error || false

  return (
    <Card className="mb-2" style={{ backgroundColor: 'transparent', border: 'none' }} data-testid="tool-call-card">
      <Card.Body className="p-0">
        {toolName === 'Bash' ? (
          <BashPrettyPrint input={toolInput} result={resultText} isError={isError} />
        ) : toolName === 'Read' || toolName === 'Write' || toolName === 'Edit' ? (
          <FilePrettyPrint toolName={toolName} input={toolInput} result={resultText} isError={isError} />
        ) : toolName === 'Grep' || toolName === 'Glob' ? (
          <SearchPrettyPrint toolName={toolName} input={toolInput} result={resultText} isError={isError} />
        ) : (
          <GenericPrettyPrint toolName={toolName} input={toolInput} result={resultText} isError={isError} />
        )}
      </Card.Body>
    </Card>
  )
}
