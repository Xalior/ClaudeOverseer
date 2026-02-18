/**
 * Cost cache — computes and caches per-session USD costs.
 *
 * Architecture:
 *   JSONL change → recomputeSession(path) → in-memory Map updated
 *                                          → IPC broadcast to renderer
 *                                          → debounced disk save
 */

import { homedir } from 'os'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync, renameSync, statSync } from 'fs'
import { BrowserWindow } from 'electron'
import { parseJsonlFile } from './jsonl-parser'
import { calculateCost } from './pricing'
import type { AssistantMessage } from '../types'

interface CacheEntry {
  total: number
  byModel: Record<string, number>
  lastModified: number
}

const CACHE_DIR = join(homedir(), '.ClaudeOverseer')
const CACHE_FILE = join(CACHE_DIR, 'cost-cache.json')
const SAVE_DEBOUNCE_MS = 5_000

export class CostCache {
  private store = new Map<string, CacheEntry>()
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  /** Load cached costs from disk (sync, called at startup). */
  loadFromDisk(): void {
    try {
      const content = readFileSync(CACHE_FILE, 'utf-8')
      const parsed = JSON.parse(content)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [key, val] of Object.entries(parsed)) {
          const v = val as { total?: number; cost?: number; byModel?: Record<string, number>; lastModified?: number }
          const total = typeof v.total === 'number' ? v.total : (typeof v.cost === 'number' ? v.cost : null)
          // Entries without byModel are treated as stale (missing field) — skip them so they recompute
          if (total !== null && typeof v.lastModified === 'number' && v.byModel && typeof v.byModel === 'object') {
            this.store.set(key, { total, byModel: v.byModel, lastModified: v.lastModified })
          }
        }
      }
    } catch {
      // No cache file yet — that's fine
    }
  }

  /** Schedule an atomic write to disk (debounced). */
  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      try {
        mkdirSync(CACHE_DIR, { recursive: true })
        const obj: Record<string, CacheEntry> = {}
        for (const [k, v] of this.store) {
          obj[k] = v
        }
        const tmpFile = CACHE_FILE + '.tmp'
        writeFileSync(tmpFile, JSON.stringify(obj), 'utf-8')
        renameSync(tmpFile, CACHE_FILE)
      } catch (err) {
        console.error('Failed to save cost cache:', err)
      }
    }, SAVE_DEBOUNCE_MS)
  }

  /** Check whether a session's cached cost is out of date. */
  isStale(path: string): boolean {
    const cached = this.store.get(path)
    if (!cached) return true
    try {
      const stat = statSync(path)
      return stat.mtimeMs > cached.lastModified
    } catch {
      return false // file gone — not stale, just missing
    }
  }

  /** Parse a session JSONL and compute total cost, tracking per-model breakdown. */
  async recomputeSession(path: string): Promise<void> {
    try {
      const stat = statSync(path)
      const messages = await parseJsonlFile(path)
      let total = 0
      const byModel: Record<string, number> = {}

      for (const msg of messages) {
        if (msg.type === 'assistant') {
          const assistant = msg as AssistantMessage
          const usage = assistant.message.usage
          const model = assistant.message.model
          if (usage && model) {
            const cost = calculateCost(usage, model)
            if (cost !== null) {
              total += cost
              byModel[model] = (byModel[model] ?? 0) + cost
            }
          }
        }
      }

      this.store.set(path, { total, byModel, lastModified: stat.mtimeMs })
      this.scheduleSave()
    } catch {
      // File unreadable — skip
    }
  }

  /** Broadcast cost update to all renderer windows. */
  broadcastCostUpdate(): void {
    for (const win of BrowserWindow.getAllWindows()) {
      try {
        win.webContents.send('overseer:cost-updated')
      } catch {
        // Window may not be ready yet during startup — ignore
      }
    }
  }

  /** Recompute all stale sessions then broadcast once. */
  async recomputeAllStale(paths: string[]): Promise<void> {
    let changed = false
    for (const path of paths) {
      if (this.isStale(path)) {
        await this.recomputeSession(path)
        changed = true
      }
    }
    if (changed) {
      this.broadcastCostUpdate()
    }
  }

  /** Get costs for all cached sessions under a project directory. */
  getSessionCosts(projectDir: string): Record<string, number> {
    const result: Record<string, number> = {}
    for (const [path, entry] of this.store) {
      if (path.startsWith(projectDir)) {
        result[path] = entry.total
      }
    }
    return result
  }

  /** Aggregate per-model costs across all sessions under a project directory. */
  getProjectCostsByModel(projectDir: string): { total: number; byModel: Record<string, number> } {
    let total = 0
    const byModel: Record<string, number> = {}
    for (const [path, entry] of this.store) {
      if (path.startsWith(projectDir)) {
        total += entry.total
        for (const [model, cost] of Object.entries(entry.byModel)) {
          byModel[model] = (byModel[model] ?? 0) + cost
        }
      }
    }
    return { total, byModel }
  }

  /** Get costs for multiple project directories at once, with per-model breakdown. */
  getAllProjectCosts(projectDirs: string[]): Record<string, { total: number; byModel: Record<string, number> }> {
    const result: Record<string, { total: number; byModel: Record<string, number> }> = {}
    for (const dir of projectDirs) {
      result[dir] = this.getProjectCostsByModel(dir)
    }
    return result
  }
}
