#!/usr/bin/env node
/**
 * fetch-pricing.mjs
 *
 * Pulls the Claude pricing page, parses the model pricing table,
 * and writes a typed JSON file into src/main/data/pricing.json.
 *
 * Usage:  node scripts/fetch-pricing.mjs
 * Add to package.json:  "fetch-pricing": "node scripts/fetch-pricing.mjs"
 */

import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT = resolve(__dirname, '..', 'src', 'main', 'data', 'pricing.json')
const URL = 'https://platform.claude.com/docs/en/about-claude/pricing'

// Parse "$15 / MTok" → 15, "$0.30 / MTok" → 0.3
function parseMTok(cell) {
  const m = cell.match(/\$([\d.]+)/)
  return m ? parseFloat(m[1]) : null
}

// Derive a model_id slug from the display name
// "Claude Opus 4.6" → "claude-opus-4-6"
// "Claude Haiku 3.5" → "claude-haiku-3-5"
function toModelId(name) {
  return name
    .toLowerCase()
    .replace(/\./g, '-')   // "4.6" → "4-6" before stripping
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

async function main() {
  console.log(`Fetching ${URL} ...`)
  const res = await fetch(URL)
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  const html = await res.text()

  // Find the model pricing table — it's the first <table> after "Model pricing"
  // We look for rows with $/MTok patterns
  const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi
  let models = []

  for (const tableMatch of html.matchAll(tableRe)) {
    const tableHtml = tableMatch[1]
    // Only process tables that contain "/ MTok" (pricing tables)
    if (!tableHtml.includes('/ MTok') && !tableHtml.includes('/MTok')) continue

    // Check if this is the main model pricing table (has Cache columns)
    const isBatchTable = tableHtml.includes('Batch input') || tableHtml.includes('Batch output')
    if (isBatchTable) continue

    // Check header to identify the main pricing table vs long-context etc.
    const headerRe = /<th[^>]*>([\s\S]*?)<\/th>/gi
    const headers = []
    for (const hm of tableHtml.matchAll(headerRe)) {
      headers.push(hm[1].replace(/<[^>]+>/g, '').trim())
    }

    // Main pricing table has: Model, Base Input Tokens, 5m Cache Writes, 1h Cache Writes, Cache Hits, Output Tokens
    if (!headers.some(h => h.includes('Cache'))) continue
    if (!headers.some(h => h.includes('Base Input'))) continue

    // Parse rows
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    for (const rowMatch of tableHtml.matchAll(rowRe)) {
      const row = rowMatch[1]
      const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi
      const cells = []
      for (const cm of row.matchAll(cellRe)) {
        cells.push(cm[1].replace(/<[^>]+>/g, '').trim())
      }
      if (cells.length < 6) continue

      const [nameRaw, inputRaw, cache5mRaw, cache1hRaw, cacheReadRaw, outputRaw] = cells
      const name = nameRaw.replace(/\s*\(deprecated\)\s*/i, '').trim()
      const deprecated = /deprecated/i.test(nameRaw)

      const input = parseMTok(inputRaw)
      const output = parseMTok(outputRaw)
      if (input === null || output === null) continue

      models.push({
        name,
        model_id: toModelId(name),
        deprecated,
        input_per_mtok: input,
        output_per_mtok: output,
        cache_write_5m_per_mtok: parseMTok(cache5mRaw),
        cache_write_1h_per_mtok: parseMTok(cache1hRaw),
        cache_read_per_mtok: parseMTok(cacheReadRaw),
      })
    }

    // Only need the first matching table
    if (models.length > 0) break
  }

  if (models.length === 0) {
    // Fallback: try markdown-style table parsing (some pages serve markdown)
    console.log('No HTML tables found, trying markdown-style parsing...')
    const lines = html.split('\n')
    let inTable = false

    for (const line of lines) {
      if (line.includes('Base Input Tokens') && line.includes('Cache')) {
        inTable = true
        continue
      }
      if (inTable && line.match(/^\s*\|[-\s|]+\|\s*$/)) continue // separator
      if (inTable && line.includes('|') && line.includes('$')) {
        const cells = line.split('|').map(c => c.trim()).filter(Boolean)
        if (cells.length < 6) continue

        const [nameRaw, inputRaw, cache5mRaw, cache1hRaw, cacheReadRaw, outputRaw] = cells
        const name = nameRaw.replace(/\s*\(deprecated\)\s*/i, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').trim()
        const deprecated = /deprecated/i.test(nameRaw)

        const input = parseMTok(inputRaw)
        const output = parseMTok(outputRaw)
        if (input === null || output === null) continue

        models.push({
          name,
          model_id: toModelId(name),
          deprecated,
          input_per_mtok: input,
          output_per_mtok: output,
          cache_write_5m_per_mtok: parseMTok(cache5mRaw),
          cache_write_1h_per_mtok: parseMTok(cache1hRaw),
          cache_read_per_mtok: parseMTok(cacheReadRaw),
        })
      } else if (inTable && !line.includes('$')) {
        inTable = false
      }
    }
  }

  if (models.length === 0) {
    console.error('Failed to parse any models from the pricing page.')
    console.error('The page format may have changed. Check the URL manually.')
    process.exit(1)
  }

  const output = {
    _generated: new Date().toISOString(),
    _source: URL,
    _note: 'Auto-generated by scripts/fetch-pricing.mjs — do not edit by hand',
    models,
  }

  writeFileSync(OUTPUT, JSON.stringify(output, null, 2) + '\n')
  console.log(`Wrote ${models.length} models to ${OUTPUT}`)
  for (const m of models) {
    const dep = m.deprecated ? ' (deprecated)' : ''
    console.log(`  ${m.name}${dep}: $${m.input_per_mtok} in / $${m.output_per_mtok} out`)
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
