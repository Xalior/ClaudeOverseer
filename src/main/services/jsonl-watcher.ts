import { watch, type FSWatcher } from 'chokidar'
import { open, stat } from 'fs/promises'
import { parseJsonlLine } from './jsonl-parser'
import type { ParsedMessage } from '../types'

export interface WatcherEvents {
  onNewMessages: (messages: ParsedMessage[]) => void
  onError: (error: Error) => void
}

export interface WatcherOptions {
  stabilityThreshold?: number
  pollInterval?: number
}

export class JsonlWatcher {
  private watcher: FSWatcher | null = null
  private filePath: string
  private offset: number = 0
  private events: WatcherEvents
  private options: WatcherOptions

  constructor(filePath: string, events: WatcherEvents, options: WatcherOptions = {}) {
    this.filePath = filePath
    this.events = events
    this.options = options
  }

  async start(): Promise<void> {
    // Get initial file size to start reading from end
    try {
      const stats = await stat(this.filePath)
      this.offset = stats.size
    } catch {
      this.offset = 0
    }

    this.watcher = watch(this.filePath, {
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: this.options.stabilityThreshold ?? 100,
        pollInterval: this.options.pollInterval ?? 50
      }
    })

    this.watcher.on('change', () => {
      this.readNewLines()
    })

    this.watcher.on('error', (error) => {
      this.events.onError(error)
    })
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close()
      this.watcher = null
    }
  }

  private async readNewLines(): Promise<void> {
    try {
      const stats = await stat(this.filePath)

      // Handle file truncation
      if (stats.size < this.offset) {
        this.offset = 0
      }

      if (stats.size <= this.offset) return

      const bytesToRead = stats.size - this.offset
      const buffer = Buffer.alloc(bytesToRead)
      const fh = await open(this.filePath, 'r')

      try {
        await fh.read(buffer, 0, bytesToRead, this.offset)
      } finally {
        await fh.close()
      }

      this.offset = stats.size

      const newContent = buffer.toString('utf-8')
      const lines = newContent.split('\n')
      const messages: ParsedMessage[] = []

      for (const line of lines) {
        const parsed = parseJsonlLine(line)
        if (parsed) {
          messages.push(parsed)
        }
      }

      if (messages.length > 0) {
        this.events.onNewMessages(messages)
      }
    } catch (error) {
      this.events.onError(error as Error)
    }
  }
}
