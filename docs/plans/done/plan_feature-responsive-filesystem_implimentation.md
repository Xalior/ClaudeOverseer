# WIP: Responsive Filesystem Monitoring

**Branch:** `feature/responsive-filesystem`
**Started:** 2026-02-16
**Status:** Complete

## Plan

Replace polling-based project/session discovery with **event-driven filesystem monitoring** using chokidar directory watchers. See [responsive_filesystem.md](responsive_filesystem.md) for full architectural spec.

**Goal:** Near-real-time UI updates (<200ms) when projects, sessions, or subagents are created/modified/deleted. Current polling (30s/10s intervals) is too slow for swarm oversight.

### Tasks

- [x] Create `src/main/services/directory-watcher.ts` — Chokidar-based directory firehose with per-project debouncing
- [x] Modify `src/main/ipc-handlers.ts` — Wire directory watcher to IPC events
- [x] Modify `src/preload/index.ts` — Expose `startDirectoryWatch`, `stopDirectoryWatch`, event listeners
- [x] Modify `src/preload/index.d.ts` — Add type definitions for new API methods
- [x] Modify `src/renderer/src/hooks/queries.ts` — Add `useDirectoryWatcher()` hook, change staleTime to Infinity
- [x] Modify `src/renderer/src/App.tsx` — Extract `AppContent` component, call `useDirectoryWatcher()`
- [x] Verify real-time behavior — Launched real Claude session in /tmp/watcher-test-real, confirmed new project appeared in sidebar within seconds
- [x] Update CHANGELOG.md

## Progress Log

### 2026-02-16 (Initial)
- Created branch from `dev` at `a78cfeb`
- Brought along uncommitted CHANGELOG.md updates (documented previous UI improvements)
- ✅ Created DirectoryWatcher service with debounced event classification
- ✅ Wired directory watcher to IPC handlers (start/stop + event broadcasting)
- ✅ Exposed directory watcher API via preload bridge + TypeScript types
- ✅ Added useDirectoryWatcher() hook, converted to event-driven queries (staleTime: Infinity, refetchInterval as fallback)
- ✅ Integrated directory watcher into App component lifecycle

### 2026-02-16 (Verification)
- ✅ Confirmed events fire via evaluate_script: projects-changed and sessions-changed events arriving in renderer
- ✅ Launched real Claude session (`claude -p` in /tmp/watcher-test-real), project appeared in sidebar automatically
- ✅ No console errors in the app
- ✅ Updated CHANGELOG.md

## Decisions & Notes

**Event Classification Logic:**
- Top-level directory changes (add/remove) → `projects-changed`
- Deeper changes (files, subdirs) → `sessions-changed` for affected project
- Per-project debouncing (100ms) to batch rapid swarm activity

**Polling Fallback:**
- Keep React Query `refetchInterval` as safety net (120s projects, 60s sessions)
- Primary mechanism is event-driven via IPC invalidations

**Component Lifecycle:**
- `useDirectoryWatcher()` starts watcher on mount, stops on unmount
- Called from `AppContent` component (inside QueryClientProvider)

## Blockers

None.

## Commits
a78cfeb - (base commit) chore: pipe dev server output to /tmp log and update agent rules
60aa875 - wip: start responsive-filesystem — init progress tracker
08828b4 - feat: add DirectoryWatcher service for filesystem events
1f6a2a6 - feat: wire DirectoryWatcher to IPC handlers
92ac0a4 - feat: expose directory watcher API via preload bridge
a7167b1 - feat: add event-driven React Query hooks
2bfb79b - feat: integrate directory watcher into App lifecycle
