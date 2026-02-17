/**
 * Pure utility functions for tool name formatting and parsing.
 * Extracted from ToolCallCard for testability.
 */

export const TOOL_ICONS: Record<string, string> = {
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
export function formatToolName(rawName: string): { icon: string; label: string; server?: string } {
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

export interface ParsedResult {
  mainContent: string
  systemReminders: string[]
}

/** Parse out <system-reminder> tags from result text */
export function parseSystemReminders(text: string): ParsedResult {
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

/** Map file extensions to highlight.js language names */
export const EXT_TO_LANG: Record<string, string> = {
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

export function getLangFromPath(filePath: string): string | null {
  const fileName = filePath.split('/').pop() || ''
  // Handle extensionless names like Dockerfile, Makefile
  const lowerName = fileName.toLowerCase()
  if (lowerName === 'dockerfile') return 'dockerfile'
  if (lowerName === 'makefile' || lowerName === 'gnumakefile') return 'makefile'
  if (lowerName === '.bashrc' || lowerName === '.zshrc' || lowerName === '.profile') return 'bash'

  const ext = fileName.includes('.') ? fileName.split('.').pop()! : ''
  return EXT_TO_LANG[ext] || null
}
