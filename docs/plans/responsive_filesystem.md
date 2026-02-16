# Plan: Filesystem Event-Driven Monitoring for ClaudeOverseer

## Context

Currently, ClaudeOverseer discovers projects and sessions via **polling** (React Query staleTime: 30s for projects, 10s for sessions). The only real-time monitoring is the `JsonlWatcher` which watches a single selected session file for new messages. This means new projects, new sessions, new subagents, and status changes (active/stale) are invisible for up to 30 seconds. For an app that oversees a swarm of Claude agents, this latency is unacceptable — the UI should reflect filesystem reality in near-real-time.

## Approach

Add a **directory-level chokidar watcher** ("firehose") on the entire `~/.claude/projects/` tree. Filesystem events are classified, debounced, and pushed to the renderer via IPC, where they trigger targeted React Query invalidations. Polling is kept as a fallback but with much longer intervals.

## Files to Modify/Create

### 1. NEW: `src/main/services/directory-watcher.ts` — Directory Firehose

A new service that watches the entire projects directory tree and emits classified events:

```
Events emitted:
- projects-changed   → a project dir was added/removed
- sessions-changed   → a .jsonl file was added/removed/modified in a specific project
```

Key design decisions:
- Uses chokidar with `{ persistent: true, ignoreInitial: true, depth: 4 }` to watch the full tree
- **Debounces** events per-project (100ms window) to batch rapid changes (e.g. a swarm spawning many subagents at once)
- Classifies filesystem paths to determine which project is affected
- Watches for: `add`, `unlink`, `addDir`, `unlinkDir`, `change` events
- `change` events on `.jsonl` files trigger `sessions-changed` (mtime updated → status badge changes)
- Ignores non-`.jsonl` files for change events (we don't care about `.json` config file modifications for session lists)

```typescript
class DirectoryWatcher {
  constructor(claudeProjectsDir: string)
  start(): Promise<void>
  stop(): Promise<void>
  onProjectsChanged(callback: () => void): void
  onSessionsChanged(callback: (projectEncodedName: string) => void): void
}
```

**Event classification logic:**

Given a changed path like `/home/user/.claude/projects/-MyProject/abc123.jsonl`, the watcher should:
1. Strip the base `claudeProjectsDir` prefix
2. Split remaining path into segments
3. First segment = project's `encodedName`
4. Depth 1 directory add/remove = `projects-changed`
5. Deeper changes (files, subdirectories) = `sessions-changed` for that project

**Debouncing strategy:**

Use per-project debounce timers stored in a `Map<string, NodeJS.Timeout>`. When a filesystem event arrives for a project:
1. Clear any existing timer for that project
2. Set a new 100ms timer
3. When the timer fires, emit the appropriate event

This batches rapid changes (e.g., a swarm creating 10 subagent files in quick succession) into a single UI refresh.

### 2. MODIFY: `src/main/ipc-handlers.ts` — Wire up the firehose

Current state: Only has per-file `JsonlWatcher` instances in `activeWatchers` Map.

Changes needed:
- Import `DirectoryWatcher`
- Create a module-level `directoryWatcher` variable (initially null)
- Add `overseer:start-directory-watch` IPC handler:
  - Determines projects directory (same logic as `get-projects-dir`)
  - Creates and starts a `DirectoryWatcher` instance
  - Wires callbacks to broadcast IPC events to all windows:
    - `onProjectsChanged` → `win.webContents.send('overseer:projects-changed')`
    - `onSessionsChanged` → `win.webContents.send('overseer:sessions-changed', { projectEncodedName })`
- Add `overseer:stop-directory-watch` IPC handler:
  - Stops and nulls the directory watcher
- Ensure cleanup on app quit (stop directory watcher + all active session watchers)

### 3. MODIFY: `src/preload/index.ts` — Expose new IPC events

Add to the `contextBridge.exposeInMainWorld('overseer', { ... })` object:

```typescript
startDirectoryWatch: () => ipcRenderer.invoke('overseer:start-directory-watch'),
stopDirectoryWatch: () => ipcRenderer.invoke('overseer:stop-directory-watch'),
onProjectsChanged: (callback: () => void) => {
  const handler = () => callback()
  ipcRenderer.on('overseer:projects-changed', handler)
  return () => ipcRenderer.removeListener('overseer:projects-changed', handler)
},
onSessionsChanged: (callback: (data: { projectEncodedName: string }) => void) => {
  const handler = (_event: unknown, data: { projectEncodedName: string }) => callback(data)
  ipcRenderer.on('overseer:sessions-changed', handler)
  return () => ipcRenderer.removeListener('overseer:sessions-changed', handler)
}
```

### 4. MODIFY: `src/preload/index.d.ts` — Type definitions

Add to the `OverseerAPI` interface:

```typescript
startDirectoryWatch: () => Promise<void>
stopDirectoryWatch: () => Promise<void>
onProjectsChanged: (callback: () => void) => () => void
onSessionsChanged: (callback: (data: { projectEncodedName: string }) => void) => () => void
```

### 5. MODIFY: `src/renderer/src/hooks/queries.ts` — Event-driven invalidation

**New hook: `useDirectoryWatcher()`**

Called once from `App.tsx`. Starts the directory watcher on mount and stops it on unmount.

```typescript
export function useDirectoryWatcher() {
  const queryClient = useQueryClient()

  useEffect(() => {
    window.overseer.startDirectoryWatch()

    const unsubProjects = window.overseer.onProjectsChanged(() => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    })

    const unsubSessions = window.overseer.onSessionsChanged((data) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', data.projectEncodedName] })
      // Also invalidate projects (session counts may have changed)
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    })

    return () => {
      unsubProjects()
      unsubSessions()
      window.overseer.stopDirectoryWatch()
    }
  }, [queryClient])
}
```

**Modify existing hooks:**

- `useProjects()`: Change `staleTime: 30_000` → `staleTime: Infinity`, add `refetchInterval: 120_000` as safety fallback
- `useSessions()`: Change `staleTime: 10_000` → `staleTime: Infinity`, add `refetchInterval: 60_000` as safety fallback

The primary refresh mechanism is now event-driven. The `refetchInterval` is a belt-and-suspenders fallback in case an event is missed.

### 6. MODIFY: `src/renderer/src/App.tsx` — Lifecycle management

- Import and call `useDirectoryWatcher()` inside the `App` component (inside the `QueryClientProvider`).
- This should be called inside the inner component that has access to QueryClient context. May need to extract a small inner component or call it in App if QueryClientProvider wraps it.

Since `App` creates the `QueryClientProvider`, the `useDirectoryWatcher()` hook needs `useQueryClient()` which requires being inside the provider. Options:
- Extract an `AppContent` component that sits inside `QueryClientProvider` and calls the hook
- Or call it in one of the existing child components

**Recommended**: Extract `AppContent`:

```typescript
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

function AppContent() {
  useDirectoryWatcher()
  // ... rest of current App body (state, refs, keyboard shortcuts, JSX)
}
```

## Event Flow

```
Filesystem event (new file, dir, mtime change)
  → chokidar in DirectoryWatcher (main process)
  → classify: which project? what type of change?
  → debounce per-project (100ms)
  → IPC broadcast to all renderer windows
  → React Query invalidation (targeted by query key)
  → Component re-renders with fresh data from scanProjects/discoverSessions
```

## What This Enables

- New Claude session appears in sidebar within ~200ms of file creation
- New project directories appear instantly
- Session status badges (active/recent/stale) update when files are written to
- Subagent sessions appear as soon as they're created by the swarm
- Sessions disappearing (deleted files) are reflected immediately
- Swarm activity is visible in real-time across all projects

## Edge Cases to Handle

- **Projects directory doesn't exist yet**: DirectoryWatcher should handle gracefully (wait/retry or watch parent)
- **Permission errors**: Log and continue, don't crash the watcher
- **Rapid event storms**: Debouncing handles this; chokidar's `awaitWriteFinish` is NOT needed here since we're not reading file contents, just detecting changes
- **Watcher already running**: `start-directory-watch` should stop existing watcher before creating new one

## Verification

1. Start the app, open a terminal, `mkdir ~/.claude/projects/-test-project` — it should appear in the project list within ~200ms
2. Create a `.jsonl` file in an existing project directory — the session should appear in the session list immediately
3. Run a swarm (team of agents) — all subagent sessions should appear as they're created
4. Delete a session file — it should disappear from the list
5. Verify the existing message tailing still works for the selected session
6. Check that CPU usage stays low (chokidar uses native fsevents on macOS)
7. Test with `refetchInterval` fallback by temporarily disabling the directory watcher — polling should still work at 120s/60s intervals
