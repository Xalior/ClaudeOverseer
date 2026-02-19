# Plan: Session & Project Cost Tracking

## Context

We just added per-message token cost display (StatusBar + AssistantMessage). Now we need costs visible at higher levels — each session row in SessionList and each pinned project card in ProjectList. This requires a main-process cost cache that persists to disk, recomputes on file changes, and pushes updates to the renderer in real time.

## Architecture

```
JSONL file change → DirectoryWatcher (existing) → CostCache.recompute(path)
                                                       ↓
                                              in-memory Map updated
                                                       ↓
                                     IPC event → renderer query invalidation → re-render
                                                       ↓ (parallel)
                                              debounced disk save (~5s)
```

## Files to Create

### 1. `src/main/services/pricing.ts` — Main-process pricing functions
Copy of the renderer's `src/renderer/src/utils/pricing.ts` (40 lines). Needed because cost computation now runs in the main process. Sharing via a common module would require restructuring the electron-vite build config — not worth it for this size.

### 2. `src/main/services/cost-cache.ts` — Core cost cache service

- **In-memory store**: `Map<sessionPath, { cost: number, lastModified: number }>`
- **`loadFromDisk()`**: Sync read of `~/.ClaudeOverseer/cost-cache.json` at startup
- **`scheduleSave()`**: Debounced atomic write (5s), same tmp→rename pattern as `preferences.ts`
- **`recomputeSession(path)`**: Parse JSONL via existing `parseJsonlFile()`, sum per-message costs via `calculateCost()`, update cache, schedule save
- **`isStale(path)`**: Compare file mtime to cached mtime
- **`getSessionCosts(projectDir)`**: Return `Record<filePath, cost>` for all sessions under a project dir (prefix match)
- **`getProjectCost(projectDir)`**: Sum of all session costs under a project dir
- **`broadcastCostUpdate(path)`**: Send `overseer:cost-updated` IPC event to all windows
- **`recomputeAllStale(paths[])`**: Background loop — check each path, recompute if stale, broadcast each update

## Files to Modify

### 3. `src/main/index.ts`
- Instantiate `CostCache`, call `loadFromDisk()` before `registerIpcHandlers()`
- Pass `costCache` to `registerIpcHandlers(costCache)`

### 4. `src/main/ipc-handlers.ts`
- Accept `CostCache` param in `registerIpcHandlers(costCache)`
- **New handler** `overseer:get-session-costs(projectDir)` → `costCache.getSessionCosts(projectDir)`
- **New handler** `overseer:get-all-project-costs(projectDirs[])` → `Record<dir, cost>`
- **Hook into existing `onSessionsChanged`**: After broadcasting `sessions-changed`, recompute costs for that project's sessions and broadcast `cost-updated`
- **Hook into existing `onNewMessages`** (watch-session handler): After sending new messages, recompute session cost and broadcast
- **Startup background scan**: After `directoryWatcher.start()`, use `setImmediate` to scan all projects → discover all session paths → `recomputeAllStale()` → broadcast

### 5. `src/preload/index.ts` + `src/preload/index.d.ts`
Add to the bridge:
- `getSessionCosts(projectDir: string) → Promise<Record<string, number>>`
- `getAllProjectCosts(projectDirs: string[]) → Promise<Record<string, number>>`
- `onCostUpdated(cb) → () => void` (subscribe to `overseer:cost-updated`)

### 6. `src/renderer/src/hooks/queries.ts`
Two new hooks:
- **`useSessionCosts(projectDir)`**: Fetches via `getSessionCosts()`, staleTime: Infinity, invalidated by `onCostUpdated` IPC event
- **`useProjectCosts(projectDirs[])`**: Fetches via `getAllProjectCosts()`, staleTime: Infinity, invalidated by `onCostUpdated`

### 7. `src/renderer/src/components/SessionList.tsx`
- Accept new prop `projectDir: string | null`
- Call `useSessionCosts(projectDir)`
- In `renderSessionItem()`: look up `costs[session.filePath]`, show formatted cost next to status badge

### 8. `src/renderer/src/components/ProjectList.tsx`
- Call `useProjectCosts(pinnedProjectDirs)` where `pinnedProjectDirs` is derived from `projects + projectsDir`
- In `renderCard()` for pinned projects: show formatted cost in the card actions area, next to the session count badge

### 9. `src/renderer/src/App.tsx`
- Get `projectsDir` from `useProjectsDir()` hook (already available in the module)
- Derive `projectDir = projectsDir + '/' + selectedProject`
- Pass `projectDir` to `<SessionList>`

### 10. `src/renderer/src/styles/custom.scss`
- `.session-item__cost` — monospace, muted amber, right-aligned in the session row meta area
- `.project-card__cost` — small amber text in the project card, near the session count badge

## Implementation Order

1. **`src/main/services/pricing.ts`** — standalone, no deps
2. **`src/main/services/cost-cache.ts`** — depends on pricing + jsonl-parser
3. **`src/main/index.ts`** — instantiate + pass
4. **`src/main/ipc-handlers.ts`** — wire cache into watchers + new handlers
5. **`src/preload/index.ts` + `index.d.ts`** — bridge new IPC channels
6. **`src/renderer/src/hooks/queries.ts`** — new hooks
7. **`src/renderer/src/App.tsx`** — pass projectDir
8. **`src/renderer/src/components/SessionList.tsx`** — show session costs
9. **`src/renderer/src/components/ProjectList.tsx`** — show project costs
10. **`src/renderer/src/styles/custom.scss`** — style cost displays

## Verification

1. **Restart dev server** (main process changes require restart)
2. **MCP observe**: `take_screenshot` → confirm cost shows on session rows and pinned project cards
3. **Real-time test**: Open a live session, watch cost update as messages stream in
4. **Persistence test**: Check `~/.ClaudeOverseer/cost-cache.json` exists after ~5s
5. **Startup test**: Kill and restart dev server → costs should appear instantly from cache
6. **Run existing tests**: `pnpm run test` — all 139 should still pass
