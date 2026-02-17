import { watch, type FSWatcher } from 'chokidar'
import { relative } from 'path'

export interface DirectoryWatcherEvents {
  onProjectsChanged: () => void
  onSessionsChanged: (projectEncodedName: string) => void
  onError: (error: Error) => void
}

export class DirectoryWatcher {
  private watcher: FSWatcher | null = null
  private projectsDir: string
  private events: DirectoryWatcherEvents
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()
  private readonly DEBOUNCE_MS = 100

  constructor(projectsDir: string, events: DirectoryWatcherEvents) {
    this.projectsDir = projectsDir
    this.events = events
  }

  async start(): Promise<void> {
    if (this.watcher) {
      await this.stop()
    }

    this.watcher = watch(this.projectsDir, {
      persistent: true,
      ignoreInitial: true, // Don't fire events for existing files on startup
      depth: 4, // Enough to cover projects/subagents/deep nesting
      awaitWriteFinish: false // We don't need this - we're not reading file contents
    })

    // Watch for new/removed projects (top-level directories)
    this.watcher.on('addDir', (path) => this.handleEvent(path, 'addDir'))
    this.watcher.on('unlinkDir', (path) => this.handleEvent(path, 'unlinkDir'))

    // Watch for new/removed session files
    this.watcher.on('add', (path) => this.handleEvent(path, 'add'))
    this.watcher.on('unlink', (path) => this.handleEvent(path, 'unlink'))

    // Watch for session file modifications (mtime changes → status badge updates)
    this.watcher.on('change', (path) => this.handleEvent(path, 'change'))

    this.watcher.on('error', (error) => {
      this.events.onError(error instanceof Error ? error : new Error(String(error)))
    })
  }

  async stop(): Promise<void> {
    // Clear all pending debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()

    if (this.watcher) {
      await this.watcher.close()
      this.watcher = null
    }
  }

  private handleEvent(path: string, eventType: string): void {
    try {
      const relativePath = relative(this.projectsDir, path)
      const segments = relativePath.split('/')

      // Ignore events in the base directory itself
      if (segments.length === 0 || segments[0] === '.') return

      const projectEncodedName = segments[0]

      // Top-level directory add/remove = projects changed
      if (segments.length === 1 && (eventType === 'addDir' || eventType === 'unlinkDir')) {
        this.debounceProjectsChanged()
        return
      }

      // Deeper changes (files or subdirectories) = sessions changed for this project
      // For 'change' events, only care about .jsonl files
      if (eventType === 'change' && !path.endsWith('.jsonl')) {
        return
      }

      this.debounceSessionsChanged(projectEncodedName)
    } catch (error) {
      this.events.onError(error as Error)
    }
  }

  private debounceProjectsChanged(): void {
    const key = '__projects__'

    // Clear existing timer for projects
    const existing = this.debounceTimers.get(key)
    if (existing) {
      clearTimeout(existing)
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(key)
      this.events.onProjectsChanged()
    }, this.DEBOUNCE_MS)

    this.debounceTimers.set(key, timer)
  }

  private debounceSessionsChanged(projectEncodedName: string): void {
    const key = `sessions:${projectEncodedName}`

    // Clear existing timer for this project
    const existing = this.debounceTimers.get(key)
    if (existing) {
      clearTimeout(existing)
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(key)
      this.events.onSessionsChanged(projectEncodedName)
    }, this.DEBOUNCE_MS)

    this.debounceTimers.set(key, timer)
  }
}
