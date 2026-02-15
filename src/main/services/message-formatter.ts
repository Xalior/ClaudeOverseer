import type {
  ParsedMessage,
  AssistantMessage,
  UserMessage,
  ToolUseBlock,
  ToolResultContent,
  TokenUsage
} from '../types'

export interface ToolPair {
  toolUse: ToolUseBlock
  toolResult: ToolResultContent | null
}

export interface UserImage {
  mediaType: string
  data: string
}

export interface FormattedMessage {
  type: 'user' | 'assistant' | 'queue-operation'
  uuid: string
  timestamp: string
  // User message fields
  userText?: string
  userImages?: UserImage[]
  // Assistant message fields
  model?: string
  textContent?: string
  toolPairs?: ToolPair[]
  usage?: TokenUsage
  stopReason?: string | null
  // Tool result (user messages that are tool results)
  isToolResult?: boolean
  toolResults?: ToolResultContent[]
  // Raw original message
  raw: ParsedMessage
}

export interface FormattedSession {
  messages: FormattedMessage[]
  totalUsage: TokenUsage
}

/**
 * Format parsed messages into display-ready structures.
 * Groups tool_use blocks with their corresponding tool_result responses.
 */
export function formatMessages(messages: ParsedMessage[]): FormattedSession {
  const formatted: FormattedMessage[] = []
  const totalUsage: TokenUsage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0
  }

  // Build a map of tool_use_id -> tool_result for matching
  const toolResultMap = new Map<string, ToolResultContent>()
  for (const msg of messages) {
    if (msg.type === 'user' && Array.isArray(msg.message.content)) {
      for (const block of msg.message.content) {
        if (block.type === 'tool_result') {
          toolResultMap.set(block.tool_use_id, block)
        }
      }
    }
  }

  for (const msg of messages) {
    if (msg.type === 'queue-operation') {
      formatted.push({
        type: 'queue-operation',
        uuid: `qo-${msg.timestamp}`,
        timestamp: msg.timestamp,
        raw: msg
      })
      continue
    }

    if (msg.type === 'user') {
      const userMsg = msg as UserMessage
      if (typeof userMsg.message.content === 'string') {
        formatted.push({
          type: 'user',
          uuid: userMsg.uuid,
          timestamp: userMsg.timestamp,
          userText: userMsg.message.content,
          raw: msg
        })
      } else if (Array.isArray(userMsg.message.content)) {
        // Extract text and images; skip pure tool_result messages
        const textParts: string[] = []
        const images: UserImage[] = []
        let hasToolResults = false

        for (const block of userMsg.message.content) {
          if (block.type === 'text') {
            textParts.push((block as { type: 'text'; text: string }).text)
          } else if (block.type === 'image') {
            const imgBlock = block as { type: 'image'; source: { type: string; media_type: string; data: string } }
            images.push({ mediaType: imgBlock.source.media_type, data: imgBlock.source.data })
          } else if (block.type === 'tool_result') {
            hasToolResults = true
          }
        }

        // Show the message if it has text or images (not just tool results)
        if (textParts.length > 0 || images.length > 0) {
          formatted.push({
            type: 'user',
            uuid: userMsg.uuid,
            timestamp: userMsg.timestamp,
            userText: textParts.length > 0 ? textParts.join('\n\n') : undefined,
            userImages: images.length > 0 ? images : undefined,
            raw: msg
          })
        }
        // Pure tool_result messages are handled via toolPairs on assistant messages
      }
      continue
    }

    if (msg.type === 'assistant') {
      const assistantMsg = msg as AssistantMessage
      const textParts: string[] = []
      const toolPairs: ToolPair[] = []

      for (const block of assistantMsg.message.content) {
        if (block.type === 'text') {
          textParts.push(block.text)
        } else if (block.type === 'tool_use') {
          toolPairs.push({
            toolUse: block,
            toolResult: toolResultMap.get(block.id) || null
          })
        }
      }

      // Accumulate token usage
      if (assistantMsg.message.usage) {
        totalUsage.input_tokens += assistantMsg.message.usage.input_tokens || 0
        totalUsage.output_tokens += assistantMsg.message.usage.output_tokens || 0
        totalUsage.cache_creation_input_tokens += assistantMsg.message.usage.cache_creation_input_tokens || 0
        totalUsage.cache_read_input_tokens += assistantMsg.message.usage.cache_read_input_tokens || 0
      }

      formatted.push({
        type: 'assistant',
        uuid: assistantMsg.uuid,
        timestamp: assistantMsg.timestamp,
        model: assistantMsg.message.model,
        textContent: textParts.length > 0 ? textParts.join('\n\n') : undefined,
        toolPairs: toolPairs.length > 0 ? toolPairs : undefined,
        usage: assistantMsg.message.usage,
        stopReason: assistantMsg.message.stop_reason,
        raw: msg
      })
    }
  }

  return { messages: formatted, totalUsage }
}
