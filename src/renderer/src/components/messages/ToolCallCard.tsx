import { useState, useMemo } from 'react'
import hljs from 'highlight.js'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Collapsible, CollapsibleContent } from '../ui/collapsible'

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

interface ParsedResult {
  mainContent: string
  systemReminders: string[]
}

/** Parse out <system-reminder> tags from result text */
function parseSystemReminders(text: string): ParsedResult {
  const systemReminders: string[] = []
  const reminderRegex = /<system-reminder>([\s\S]*?)<\/system-reminder>/g

  let match
  let lastIndex = 0
  const contentParts: string[] = []

  while ((match = reminderRegex.exec(text)) !== null) {
    // Add content before this reminder
    contentParts.push(text.slice(lastIndex, match.index))
    // Store the reminder content
    systemReminders.push(match[1].trim())
    lastIndex = match.index + match[0].length
  }

  // Add any remaining content after the last reminder
  contentParts.push(text.slice(lastIndex))

  const mainContent = contentParts.join('').trim()

  return { mainContent, systemReminders }
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
  TodoWrite: '✅',
  // MCP server tools
  take_screenshot: '📸',
  take_snapshot: '🌲',
  navigate_page: '🧭',
  click: '🖱️',
  fill: '⌨️',
  fill_form: '📝',
  evaluate_script: '⚡',
  list_pages: '📑',
  list_network_requests: '🌐',
  list_console_messages: '🖥️',
  get_network_request: '📡',
  get_console_message: '💬',
  hover: '🖱️',
  press_key: '⌨️',
  wait_for: '⏳',
  handle_dialog: '💬',
  performance_start_trace: '⏱️',
  performance_stop_trace: '⏹️',
  upload_file: '📤',
}

/** Format a tool name for display — handles MCP double-underscore names */
function formatToolName(rawName: string): { icon: string; label: string; server?: string } {
  const icon = TOOL_ICONS[rawName] || '🔧'

  // MCP tools: mcp__server-name__tool_name
  if (rawName.includes('__')) {
    const parts = rawName.split('__')
    if (parts.length >= 3) {
      const server = parts[1]
      const tool = parts.slice(2).join('__')
      const toolIcon = TOOL_ICONS[tool] || icon
      // Convert snake_case to readable label
      const label = tool.replace(/_/g, ' ')
      return { icon: toolIcon, label, server }
    }
  }

  return { icon, label: rawName }
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
  backgroundColor: 'var(--surface-0)',
  color: 'var(--text-0)',
  fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace",
  fontSize: '0.82rem',
  borderRadius: '6px',
  padding: '12px',
  margin: '8px 0 0 0',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  lineHeight: 1.5
}

const codeBlockStyle: React.CSSProperties = {
  backgroundColor: 'var(--surface-0)',
  color: 'var(--text-0)',
  fontFamily: "'SF Mono', 'Fira Code', Menlo, Monaco, monospace",
  fontSize: '0.82rem',
  borderRadius: '6px',
  padding: '12px',
  margin: '8px 0 0 0',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  lineHeight: 1.4
}

/** System reminder display component */
function SystemReminder({ text }: { text: string }) {
  return (
    <div style={{
      backgroundColor: 'var(--accent-subtle)',
      border: '1px solid var(--border-1)',
      borderRadius: '6px',
      padding: '10px 12px',
      margin: '8px 0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: '0.8rem',
      lineHeight: 1.5
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ fontSize: '1rem', marginTop: '2px' }}>ℹ️</span>
        <div style={{ color: 'var(--text-1)', flex: 1 }}>
          <div style={{ color: 'var(--text-2)', fontSize: '0.7rem', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            System Reminder
          </div>
          {text}
        </div>
      </div>
    </div>
  )
}

/** Bash: render like a terminal */
function BashPrettyPrint({ input, result, isError }: {
  input: Record<string, unknown>
  result: string
  isError: boolean
}) {
  const [showOutput, setShowOutput] = useState(true)
  const command = (input.command as string) || ''

  // Parse out system reminders
  const { mainContent, systemReminders } = parseSystemReminders(result)
  const outputLines = mainContent ? mainContent.split('\n').length : 0

  return (
    <div style={{ ...terminalStyle, border: '1px solid var(--border-0)' }} data-testid="tool-input-content">
      {/* Terminal header */}
      <div style={{ marginBottom: '8px', borderBottom: '1px solid var(--border-0)', paddingBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ fontSize: '0.78rem' }}>💻</span>
        <span style={{ color: 'var(--text-2)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>bash</span>
      </div>
      {/* Command */}
      <div>
        <span style={{ color: 'var(--ok)' }}>$ </span>
        <span style={{ color: 'var(--text-0)' }}>{command}</span>
      </div>
      {/* Output */}
      {mainContent && (
        <>
          <div style={{ marginTop: '4px' }}>
            <Button
              variant="link"
              size="sm"
              className="tool-toggle"
              style={{ color: 'var(--text-2)', fontSize: '0.72rem' }}
              onClick={() => setShowOutput(!showOutput)}
            >
              {showOutput ? '▼' : '▶'} output ({outputLines} lines)
            </Button>
          </div>
          <Collapsible open={showOutput}>
            <CollapsibleContent className="ui-collapsible-content" data-testid="tool-output-content" style={{
              color: isError ? 'var(--danger)' : 'var(--text-1)',
              marginTop: '4px',
              borderTop: '1px solid var(--border-0)',
              paddingTop: '8px',
              fontSize: '0.82rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {mainContent}
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {/* System reminders */}
      {systemReminders.length > 0 && systemReminders.map((reminder, idx) => (
        <SystemReminder key={idx} text={reminder} />
      ))}
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
  const rawDisplayContent = isWrite ? fileContent : result

  // Parse out system reminders
  const { mainContent: displayContent, systemReminders } = parseSystemReminders(rawDisplayContent)
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
    <div style={{ ...codeBlockStyle, border: '1px solid var(--border-0)' }} data-testid="tool-input-content">
      {/* File header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid var(--border-0)', paddingBottom: '6px' }}>
        <div>
          <span style={{ color: 'var(--text-2)', marginRight: '6px' }}>{TOOL_ICONS[toolName]}</span>
          <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{fileName}</span>
          <span style={{ color: 'var(--text-2)', fontSize: '0.75rem', marginLeft: '8px' }}>{filePath}</span>
          {lang && (
            <span style={{
              color: 'var(--text-2)',
              fontSize: '0.7rem',
              marginLeft: '8px',
              backgroundColor: 'var(--surface-2)',
              padding: '1px 6px',
              borderRadius: '8px'
            }}>{lang}</span>
          )}
        </div>
        {displayContent && (
          <Button
            variant="link"
            size="sm"
            className="tool-toggle"
            style={{ color: 'var(--text-2)', fontSize: '0.72rem' }}
            onClick={() => setShowContent(!showContent)}
          >
            {showContent ? '▼' : '▶'} {contentLines} lines
          </Button>
        )}
      </div>

      {/* Edit diff view */}
      {isEdit && oldStr && newStr && (
        <div style={{ marginBottom: '8px' }}>
          <div style={{ backgroundColor: 'var(--danger-muted)', padding: '6px 8px', borderRadius: '4px', marginBottom: '4px' }}>
            <span style={{ color: 'var(--danger)', fontWeight: 600 }}>- </span>
            <span style={{ color: 'var(--danger)' }}>{oldStr.length > 200 ? oldStr.slice(0, 200) + '...' : oldStr}</span>
          </div>
          <div style={{ backgroundColor: 'var(--ok-muted)', padding: '6px 8px', borderRadius: '4px' }}>
            <span style={{ color: 'var(--ok)', fontWeight: 600 }}>+ </span>
            <span style={{ color: 'var(--ok)' }}>{newStr.length > 200 ? newStr.slice(0, 200) + '...' : newStr}</span>
          </div>
        </div>
      )}

      {/* File content with syntax highlighting */}
      {displayContent && (
        <Collapsible open={showContent}>
          <CollapsibleContent className="ui-collapsible-content" data-testid="tool-output-content">
            {highlightedHtml ? (
              <pre style={{ margin: 0, backgroundColor: 'transparent', padding: 0, overflow: 'auto' }}>
                <code
                  className={lang ? `hljs language-${lang}` : 'hljs'}
                  style={{ backgroundColor: 'transparent', padding: 0, fontSize: '0.85rem', lineHeight: 1.4 }}
                  dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                />
              </pre>
            ) : (
              <div style={{ color: isError ? 'var(--danger)' : 'var(--text-0)' }}>
                {displayContent}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Show write result status if there's also a result message */}
      {isWrite && result && (
        <div style={{
          color: isError ? 'var(--danger)' : 'var(--ok)',
          fontSize: '0.75rem',
          borderTop: '1px solid var(--border-0)',
          paddingTop: '6px',
          marginTop: '6px'
        }}>
          {isError ? '✗ ' : '✓ '}{result}
        </div>
      )}

      {/* System reminders */}
      {systemReminders.length > 0 && systemReminders.map((reminder, idx) => (
        <SystemReminder key={idx} text={reminder} />
      ))}
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

  // Parse out system reminders
  const { mainContent, systemReminders } = parseSystemReminders(result)
  const resultLines = mainContent ? mainContent.split('\n').filter(l => l.trim()).length : 0

  return (
    <div style={{ ...codeBlockStyle, border: '1px solid var(--border-0)' }} data-testid="tool-input-content">
      <div style={{ marginBottom: '8px' }}>
        <span style={{ color: 'var(--text-2)' }}>{TOOL_ICONS[toolName]} </span>
        <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{pattern}</span>
        {path && <span style={{ color: 'var(--text-2)', marginLeft: '8px' }}>in {path}</span>}
        {resultLines > 0 && (
          <span style={{ color: 'var(--ok)', marginLeft: '8px', fontSize: '0.8rem' }}>({resultLines} matches)</span>
        )}
      </div>

      {mainContent && (
        <>
          <Button
            variant="link"
            size="sm"
            className="tool-toggle"
            style={{ color: 'var(--text-2)', fontSize: '0.72rem', marginBottom: '4px' }}
            onClick={() => setShowResults(!showResults)}
          >
            {showResults ? '▼' : '▶'} results
          </Button>
          <Collapsible open={showResults}>
            <CollapsibleContent className="ui-collapsible-content" data-testid="tool-output-content" style={{
              color: isError ? 'var(--danger)' : 'var(--text-0)',
              borderTop: '1px solid var(--border-0)',
              paddingTop: '8px',
              marginTop: '4px'
            }}>
              {mainContent}
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {/* System reminders */}
      {systemReminders.length > 0 && systemReminders.map((reminder, idx) => (
        <SystemReminder key={idx} text={reminder} />
      ))}
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
      backgroundColor: 'var(--surface-0)',
      border: '1px solid var(--border-0)',
      borderRadius: '6px',
      padding: '12px',
      margin: '8px 0 0 0',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '0.82rem'
    }} data-testid="tool-input-content">
      {questions.map((q, qi) => (
        <div key={qi}>
          {/* Header badge */}
          {q.header && (
            <span style={{
              backgroundColor: 'var(--surface-2)',
              color: 'var(--accent)',
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
          <div style={{ color: 'var(--text-0)', fontWeight: 500, margin: '8px 0' }}>
            {q.question}
          </div>

          {/* Options */}
          {q.options && (
            <div style={{ margin: '8px 0' }}>
              {q.options.map((opt, oi) => {
                const isSelected = answer === opt.label
                return (
                  <div key={oi} style={{
                    backgroundColor: isSelected ? 'var(--ok-muted)' : 'var(--surface-1)',
                    border: isSelected ? '1px solid var(--ok)' : '1px solid var(--border-0)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}>
                    <span style={{
                      color: isSelected ? 'var(--ok)' : 'var(--text-2)',
                      fontSize: '0.9rem',
                      marginTop: '1px'
                    }}>
                      {isSelected ? '●' : '○'}
                    </span>
                    <div>
                      <span style={{ color: isSelected ? 'var(--ok)' : 'var(--text-0)', fontWeight: 500 }}>
                        {opt.label}
                      </span>
                      {opt.description && (
                        <div style={{ color: 'var(--text-2)', fontSize: '0.8rem', marginTop: '2px' }}>
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
          borderTop: '1px solid var(--border-0)',
          paddingTop: '8px',
          marginTop: '8px',
          color: 'var(--ok)',
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

  // Parse out system reminders
  const { mainContent, systemReminders } = parseSystemReminders(result)

  const { icon, label, server } = formatToolName(toolName)

  return (
    <div style={{ ...codeBlockStyle, border: '1px solid var(--border-0)' }} data-testid="tool-input-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <span>{icon}</span>
          <span style={{ color: 'var(--text-0)', fontWeight: 500 }}>{label}</span>
          {server && (
            <span style={{
              color: 'var(--text-2)',
              fontSize: '0.68rem',
              backgroundColor: 'var(--surface-2)',
              padding: '1px 5px',
              borderRadius: '4px',
              fontStyle: 'italic'
            }}>{server}</span>
          )}
        </div>
        <div>
          <Button
            variant="link"
            size="sm"
            className="tool-toggle tool-toggle--spaced"
            style={{ color: 'var(--text-2)', fontSize: '0.72rem' }}
            onClick={() => setShowInput(!showInput)}
          >
            {showInput ? '▼' : '▶'} input
          </Button>
          {mainContent && (
            <Button
              variant="link"
              size="sm"
              className="tool-toggle"
              style={{ color: 'var(--text-2)', fontSize: '0.72rem' }}
              onClick={() => setShowOutput(!showOutput)}
            >
              {showOutput ? '▼' : '▶'} output
            </Button>
          )}
        </div>
      </div>
      <Collapsible open={showInput}>
        <CollapsibleContent className="ui-collapsible-content">
          <pre style={{ color: 'var(--text-0)', margin: '8px 0 0 0', fontSize: '0.78rem' }}>
            <code>{JSON.stringify(input, null, 2)}</code>
          </pre>
        </CollapsibleContent>
      </Collapsible>
      {mainContent && (
        <Collapsible open={showOutput}>
          <CollapsibleContent className="ui-collapsible-content" data-testid="tool-output-content" style={{
            color: isError ? 'var(--danger)' : 'var(--text-0)',
            borderTop: '1px solid var(--border-0)',
            paddingTop: '8px',
            marginTop: '8px',
            fontSize: '0.82rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {mainContent}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* System reminders */}
      {systemReminders.length > 0 && systemReminders.map((reminder, idx) => (
        <SystemReminder key={idx} text={reminder} />
      ))}
    </div>
  )
}

export function ToolCallCard({ toolName, toolInput, toolResult }: ToolCallCardProps) {
  const resultText = toolResult ? extractToolResultText(toolResult.content) : ''
  const isError = toolResult?.is_error || false

  return (
    <Card className="tool-card-wrap" data-testid="tool-call-card">
      <CardContent className="tool-card-wrap__content">
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
      </CardContent>
    </Card>
  )
}
