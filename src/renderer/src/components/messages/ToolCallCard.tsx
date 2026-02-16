import { useState, useMemo } from 'react'
import { Card, Badge, Collapse, Button } from 'react-bootstrap'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'

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

/** Map file extensions to highlight.js language names */
const EXT_TO_LANG: Record<string, string> = {
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'typescript', mts: 'typescript',
  py: 'python', rb: 'ruby', rs: 'rust', go: 'go',
  java: 'java', kt: 'kotlin', scala: 'scala',
  c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp',
  cs: 'csharp', swift: 'swift', m: 'objectivec',
  sh: 'bash', bash: 'bash', zsh: 'bash', fish: 'shell',
  html: 'xml', htm: 'xml', xml: 'xml', svg: 'xml', xsl: 'xml',
  css: 'css', scss: 'scss', sass: 'scss', less: 'less',
  json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'ini',
  md: 'markdown', markdown: 'markdown',
  sql: 'sql', graphql: 'graphql', gql: 'graphql',
  dockerfile: 'dockerfile', docker: 'dockerfile',
  makefile: 'makefile', cmake: 'cmake',
  lua: 'lua', perl: 'perl', pl: 'perl', php: 'php',
  r: 'r', R: 'r', jl: 'julia',
  hs: 'haskell', erl: 'erlang', ex: 'elixir', exs: 'elixir',
  clj: 'clojure', lisp: 'lisp', el: 'lisp',
  vim: 'vim', ini: 'ini', conf: 'ini', cfg: 'ini',
  tf: 'hcl', hcl: 'hcl',
  proto: 'protobuf', ps1: 'powershell',
  diff: 'diff', patch: 'diff'
}

function getLangFromPath(filePath: string): string | null {
  const fileName = filePath.split('/').pop() || ''
  // Handle extensionless names like Dockerfile, Makefile
  const lowerName = fileName.toLowerCase()
  if (lowerName === 'dockerfile') return 'dockerfile'
  if (lowerName === 'makefile' || lowerName === 'gnumakefile') return 'makefile'
  if (lowerName === '.bashrc' || lowerName === '.zshrc' || lowerName === '.profile') return 'bash'

  const ext = fileName.includes('.') ? fileName.split('.').pop()! : ''
  return EXT_TO_LANG[ext] || null
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
      {/* Terminal header */}
      <div style={{ marginBottom: '8px', borderBottom: '1px solid #30363d', paddingBottom: '6px' }}>
        <span style={{ color: '#8b949e', fontSize: '0.75rem' }}>💻 bash</span>
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

  // For Write, show the written file content from input; for Read, show result
  const isWrite = toolName === 'Write'
  const fileContent = isWrite ? (input.content as string) || '' : ''
  const displayContent = isWrite ? fileContent : result
  const contentLines = displayContent ? displayContent.split('\n').length : 0

  // For Edit, show old_string -> new_string
  const isEdit = toolName === 'Edit'
  const oldStr = isEdit ? (input.old_string as string) : null
  const newStr = isEdit ? (input.new_string as string) : null

  // Syntax highlighting for file content
  const lang = getLangFromPath(filePath)
  const highlightedHtml = useMemo(() => {
    if (!displayContent || isEdit) return null
    try {
      if (lang) {
        return hljs.highlight(displayContent, { language: lang }).value
      }
      return hljs.highlightAuto(displayContent).value
    } catch {
      return null
    }
  }, [displayContent, lang, isEdit])

  return (
    <div style={{ ...codeBlockStyle, border: '1px solid #30363d' }} data-testid="tool-input-content">
      {/* File header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #30363d', paddingBottom: '6px' }}>
        <div>
          <span style={{ color: '#8b949e', marginRight: '6px' }}>{TOOL_ICONS[toolName]}</span>
          <span style={{ color: '#79c0ff', fontWeight: 500 }}>{fileName}</span>
          <span style={{ color: '#484f58', fontSize: '0.75rem', marginLeft: '8px' }}>{filePath}</span>
          {lang && (
            <span style={{
              color: '#8b949e',
              fontSize: '0.7rem',
              marginLeft: '8px',
              backgroundColor: '#21262d',
              padding: '1px 6px',
              borderRadius: '8px'
            }}>{lang}</span>
          )}
        </div>
        {displayContent && (
          <Button
            variant="link"
            size="sm"
            className="p-0"
            style={{ color: '#8b949e', fontSize: '0.75rem', textDecoration: 'none' }}
            onClick={() => setShowContent(!showContent)}
          >
            {showContent ? '▼' : '▶'} {contentLines} lines
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

      {/* File content with syntax highlighting */}
      {displayContent && (
        <Collapse in={showContent}>
          <div data-testid="tool-output-content">
            {highlightedHtml ? (
              <pre style={{ margin: 0, backgroundColor: 'transparent', padding: 0, overflow: 'auto' }}>
                <code
                  className={lang ? `hljs language-${lang}` : 'hljs'}
                  style={{ backgroundColor: 'transparent', padding: 0, fontSize: '0.85rem', lineHeight: 1.4 }}
                  dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                />
              </pre>
            ) : (
              <div style={{ color: isError ? '#f85149' : '#c9d1d9' }}>
                {displayContent}
              </div>
            )}
          </div>
        </Collapse>
      )}

      {/* Show write result status if there's also a result message */}
      {isWrite && result && (
        <div style={{
          color: isError ? '#f85149' : '#3fb950',
          fontSize: '0.75rem',
          borderTop: '1px solid #30363d',
          paddingTop: '6px',
          marginTop: '6px'
        }}>
          {isError ? '✗ ' : '✓ '}{result}
        </div>
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

/** AskUserQuestion: render as a styled question with options and answer */
function AskUserQuestionPrettyPrint({ input, result }: {
  input: Record<string, unknown>
  result: string
}) {
  const questions = (input.questions as Array<{
    question: string
    header?: string
    options?: Array<{ label: string; description?: string }>
    multiSelect?: boolean
  }>) || []

  // Parse the answer from result text like: "question"="answer"
  const answerMatch = result.match(/="([^"]+)"/)
  const answer = answerMatch ? answerMatch[1] : null

  return (
    <div style={{
      backgroundColor: '#1c1f2b',
      border: '1px solid #3d4663',
      borderRadius: '6px',
      padding: '12px',
      margin: '8px 0 0 0',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '0.85rem'
    }} data-testid="tool-input-content">
      {questions.map((q, qi) => (
        <div key={qi}>
          {/* Header badge */}
          {q.header && (
            <span style={{
              backgroundColor: '#30363d',
              color: '#79c0ff',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '0.75rem',
              fontWeight: 500,
              marginBottom: '8px',
              display: 'inline-block'
            }}>
              {q.header}
            </span>
          )}

          {/* Question text */}
          <div style={{ color: '#e6edf3', fontWeight: 500, margin: '8px 0' }}>
            {q.question}
          </div>

          {/* Options */}
          {q.options && (
            <div style={{ margin: '8px 0' }}>
              {q.options.map((opt, oi) => {
                const isSelected = answer === opt.label
                return (
                  <div key={oi} style={{
                    backgroundColor: isSelected ? '#1f3d1f' : '#161b22',
                    border: isSelected ? '1px solid #3fb950' : '1px solid #30363d',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}>
                    <span style={{
                      color: isSelected ? '#3fb950' : '#484f58',
                      fontSize: '0.9rem',
                      marginTop: '1px'
                    }}>
                      {isSelected ? '●' : '○'}
                    </span>
                    <div>
                      <span style={{ color: isSelected ? '#7ee787' : '#c9d1d9', fontWeight: 500 }}>
                        {opt.label}
                      </span>
                      {opt.description && (
                        <div style={{ color: '#8b949e', fontSize: '0.8rem', marginTop: '2px' }}>
                          {opt.description}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}

      {/* Answer summary */}
      {answer && (
        <div style={{
          borderTop: '1px solid #30363d',
          paddingTop: '8px',
          marginTop: '8px',
          color: '#7ee787',
          fontSize: '0.8rem'
        }} data-testid="tool-output-content">
          User selected: <strong>{answer}</strong>
        </div>
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
        ) : toolName === 'AskUserQuestion' ? (
          <AskUserQuestionPrettyPrint input={toolInput} result={resultText} />
        ) : (
          <GenericPrettyPrint toolName={toolName} input={toolInput} result={resultText} isError={isError} />
        )}
      </Card.Body>
    </Card>
  )
}
