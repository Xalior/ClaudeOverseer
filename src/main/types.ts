export interface Project {
  name: string
  encodedName: string
  path: string
  sessionCount: number
}

export interface Session {
  id: string
  type: 'main' | 'subagent' | 'background'
  filePath: string
  lastModified: number
  parentSessionId?: string
}

// --- JSONL Message Types ---

export interface TextBlock {
  type: 'text'
  text: string
}

export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultContentBlock {
  type: 'text'
  text: string
}

export interface ToolResultContent {
  type: 'tool_result'
  tool_use_id: string
  content: string | ToolResultContentBlock[]
  is_error?: boolean
}

export interface ThinkingBlock {
  type: 'thinking'
  thinking: string
  signature?: string
}

export interface TokenUsage {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
}

export interface QueueOperationMessage {
  type: 'queue-operation'
  operation: 'dequeue' | 'enqueue'
  timestamp: string
  sessionId: string
}

export interface UserMessage {
  type: 'user'
  uuid: string
  parentUuid: string | null
  timestamp: string
  sessionId: string
  cwd: string
  version: string
  gitBranch?: string
  isSidechain?: boolean
  message: {
    role: 'user'
    content: string | ToolResultContent[]
  }
}

export interface AssistantMessage {
  type: 'assistant'
  uuid: string
  parentUuid: string
  timestamp: string
  sessionId: string
  cwd?: string
  version?: string
  message: {
    role: 'assistant'
    model: string
    content: (TextBlock | ToolUseBlock | ThinkingBlock)[]
    usage?: TokenUsage
    stop_reason?: string | null
  }
}

export type ParsedMessage = QueueOperationMessage | UserMessage | AssistantMessage
