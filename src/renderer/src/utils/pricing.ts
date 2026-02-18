/**
 * Token cost calculation from pricing.json data.
 *
 * Prices are in USD per million tokens (MTok).
 * The model string from JSONL looks like "claude-sonnet-4-5-20250514".
 * We strip the date suffix and match against pricing model_id.
 */

import pricingData from '../../../main/data/pricing.json'
import type { TokenUsage } from '../../../main/types'

export interface ModelPricing {
  name: string
  model_id: string
  input_per_mtok: number
  output_per_mtok: number
  cache_read_per_mtok: number | null
  cache_write_5m_per_mtok: number | null
}

// Build a lookup map: model_id → pricing
const pricingMap = new Map<string, ModelPricing>()
for (const m of pricingData.models) {
  pricingMap.set(m.model_id, m as ModelPricing)
}

/**
 * Normalise a model string from the API into a pricing lookup key.
 * "claude-sonnet-4-5-20250514" → "claude-sonnet-4-5"
 * "claude-opus-4-6-20250101"  → "claude-opus-4-6"
 * Already-clean IDs pass through unchanged.
 */
function normaliseModelId(model: string): string {
  // Strip date suffix (8 digits at end, optionally preceded by hyphen)
  return model.replace(/-\d{8}$/, '')
}

/**
 * Look up pricing for a model string.
 * Returns null if the model isn't in our pricing table.
 */
export function getModelPricing(model: string): ModelPricing | null {
  const id = normaliseModelId(model)
  return pricingMap.get(id) ?? null
}

/**
 * Calculate USD cost for a TokenUsage + model.
 * Returns null if model pricing is unknown.
 */
export function calculateCost(usage: TokenUsage, model: string): number | null {
  const p = getModelPricing(model)
  if (!p) return null

  const inputCost = (usage.input_tokens / 1_000_000) * p.input_per_mtok
  const outputCost = (usage.output_tokens / 1_000_000) * p.output_per_mtok
  const cacheReadCost = p.cache_read_per_mtok
    ? (usage.cache_read_input_tokens / 1_000_000) * p.cache_read_per_mtok
    : 0
  // cache_creation counted at 5-minute write rate (the common case for Claude Code)
  const cacheWriteCost = p.cache_write_5m_per_mtok
    ? (usage.cache_creation_input_tokens / 1_000_000) * p.cache_write_5m_per_mtok
    : 0

  return inputCost + outputCost + cacheReadCost + cacheWriteCost
}

/**
 * Format a USD cost for display.
 * < $0.01  → "$0.001" (3 decimal places)
 * < $1     → "$0.12"  (2 decimal places)
 * >= $1    → "$1.23"  (2 decimal places)
 */
export function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(3)}`
  return `$${usd.toFixed(2)}`
}

/** Returns a short human-friendly model name, e.g. "Opus 4.6" (strips "Claude " prefix). */
export function getModelName(modelId: string): string {
  const p = getModelPricing(modelId)
  if (!p) return modelId
  return p.name.replace(/^Claude\s+/i, '')
}
