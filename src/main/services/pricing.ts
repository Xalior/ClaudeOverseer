/**
 * Token cost calculation for the main process.
 *
 * Duplicate of src/renderer/src/utils/pricing.ts — kept separate because
 * sharing a module across electron-vite main/renderer builds isn't worth
 * the config churn for ~40 lines.
 *
 * Prices are in USD per million tokens (MTok).
 */

import pricingData from '../data/pricing.json'
import type { TokenUsage } from '../types'

interface ModelPricing {
  name: string
  model_id: string
  input_per_mtok: number
  output_per_mtok: number
  cache_read_per_mtok: number | null
  cache_write_5m_per_mtok: number | null
}

const pricingMap = new Map<string, ModelPricing>()
for (const m of pricingData.models) {
  pricingMap.set(m.model_id, m as ModelPricing)
}

function normaliseModelId(model: string): string {
  return model.replace(/-\d{8}$/, '')
}

export function getModelPricing(model: string): ModelPricing | null {
  return pricingMap.get(normaliseModelId(model)) ?? null
}

export function calculateCost(usage: TokenUsage, model: string): number | null {
  const p = getModelPricing(model)
  if (!p) return null

  const inputCost = (usage.input_tokens / 1_000_000) * p.input_per_mtok
  const outputCost = (usage.output_tokens / 1_000_000) * p.output_per_mtok
  const cacheReadCost = p.cache_read_per_mtok
    ? (usage.cache_read_input_tokens / 1_000_000) * p.cache_read_per_mtok
    : 0
  const cacheWriteCost = p.cache_write_5m_per_mtok
    ? (usage.cache_creation_input_tokens / 1_000_000) * p.cache_write_5m_per_mtok
    : 0

  return inputCost + outputCost + cacheReadCost + cacheWriteCost
}

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
