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
  dominantModel: string | null
}

/**
 * Estimate output token count from content blocks.
 * Claude Code JSONL records usage from the streaming start event, which has
 * near-zero output_tokens. The real count comes from the final streaming event
 * which isn't persisted. We estimate from actual content (~4 chars per token).
 */
function estimateOutputTokens(content: AssistantMessage['message']['content']): number {
  let totalChars = 0
  for (const block of content) {
    if (block.type === 'text') {
      totalChars += block.text.length
    } else if (block.type === 'tool_use') {
      // Tool name + serialized input
      totalChars += block.name.length + JSON.stringify(block.input).length
    } else if (block.type === 'thinking') {
      totalChars += block.thinking.length
    }
  }
  return Math.ceil(totalChars / 4)
}

/**
 * Format parsed messages into display-ready structures.
 * Groups tool_use blocks with their corresponding tool_result responses.
 *
 * Claude Code writes multiple JSONL entries per API response (progressive
 * streaming snapshots). We deduplicate by API message ID, keeping only the
 * last (most complete) entry for each response.
 */
export function formatMessages(messages: ParsedMessage[]): FormattedSession {
  const formatted: FormattedMessage[] = []
  const totalUsage: TokenUsage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0
  }
  const modelCounts = new Map<string, number>()

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

  // Deduplicate assistant messages by API message ID.
  // Later entries supersede earlier ones (more complete content + usage).
  const assistantById = new Map<string, AssistantMessage>()
  const assistantOrder: string[] = []
  for (const msg of messages) {
    if (msg.type === 'assistant') {
      const aMsg = msg as AssistantMessage
      const mid = aMsg.message.id
      if (mid) {
        if (!assistantById.has(mid)) {
          assistantOrder.push(mid)
        }
        assistantById.set(mid, aMsg)
      } else {
        // No message ID — treat as unique (fallback)
        const fallbackId = `__no_id_${aMsg.uuid}`
        assistantOrder.push(fallbackId)
        assistantById.set(fallbackId, aMsg)
      }
    }
  }
  const dedupedAssistants = new Set(
    assistantOrder.map((mid) => assistantById.get(mid)!)
  )

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

        for (const block of userMsg.message.content) {
          if (block.type === 'text') {
            textParts.push((block as { type: 'text'; text: string }).text)
          } else if (block.type === 'image') {
            const imgBlock = block as { type: 'image'; source: { type: string; media_type: string; data: string } }
            images.push({ mediaType: imgBlock.source.media_type, data: imgBlock.source.data })
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
      // Skip duplicate streaming entries — only process the last entry per API message ID
      if (!dedupedAssistants.has(msg as AssistantMessage)) {
        continue
      }

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

      // Accumulate token usage.
      // output_tokens from JSONL is unreliable (captured at streaming start, not end),
      // so we use the higher of recorded vs content-estimated value.
      if (assistantMsg.message.usage) {
        const recorded = assistantMsg.message.usage.output_tokens || 0
        const estimated = estimateOutputTokens(assistantMsg.message.content)
        totalUsage.input_tokens += assistantMsg.message.usage.input_tokens || 0
        totalUsage.output_tokens += Math.max(recorded, estimated)
        totalUsage.cache_creation_input_tokens += assistantMsg.message.usage.cache_creation_input_tokens || 0
        totalUsage.cache_read_input_tokens += assistantMsg.message.usage.cache_read_input_tokens || 0
      }

      // Track model usage for dominant model detection
      if (assistantMsg.message.model) {
        const m = assistantMsg.message.model
        modelCounts.set(m, (modelCounts.get(m) || 0) + 1)
      }

      // Skip empty streaming partials (no real content, stop_reason is null)
      const combinedText = textParts.join('\n\n').trim()
      if (!combinedText && toolPairs.length === 0) {
        continue
      }

      // Store usage with corrected output_tokens for per-message cost calculation
      const correctedUsage: TokenUsage | undefined = assistantMsg.message.usage
        ? {
            ...assistantMsg.message.usage,
            output_tokens: Math.max(
              assistantMsg.message.usage.output_tokens || 0,
              estimateOutputTokens(assistantMsg.message.content)
            )
          }
        : undefined

      formatted.push({
        type: 'assistant',
        uuid: assistantMsg.uuid,
        timestamp: assistantMsg.timestamp,
        model: assistantMsg.message.model,
        textContent: combinedText || undefined,
        toolPairs: toolPairs.length > 0 ? toolPairs : undefined,
        usage: correctedUsage,
        stopReason: assistantMsg.message.stop_reason,
        raw: msg
      })
    }
  }

  // Find the most-used model in the session
  let dominantModel: string | null = null
  let maxCount = 0
  for (const [model, count] of modelCounts) {
    if (count > maxCount) {
      maxCount = count
      dominantModel = model
    }
  }

  return { messages: formatted, totalUsage, dominantModel }
}
