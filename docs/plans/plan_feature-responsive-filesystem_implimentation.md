# WIP: Responsive Filesystem Monitoring

**Branch:** `feature/responsive-filesystem`
**Started:** 2026-02-16
**Status:** In Progress

## Plan

Replace polling-based project/session discovery with **event-driven filesystem monitoring** using chokidar directory watchers. See [responsive_filesystem.md](responsive_filesystem.md) for full architectural spec.

**Goal:** Near-real-time UI updates (<200ms) when projects, sessions, or subagents are created/modified/deleted. Current polling (30s/10s intervals) is too slow for swarm oversight.

### Tasks

- [x] Create `src/main/services/directory-watcher.ts` — Chokidar-based directory firehose with per-project debouncing
- [ ] Modify `src/main/ipc-handlers.ts` — Wire directory watcher to IPC events
- [ ] Modify `src/preload/index.ts` — Expose `startDirectoryWatch`, `stopDirectoryWatch`, event listeners
- [ ] Modify `src/preload/index.d.ts` — Add type definitions for new API methods
- [ ] Modify `src/renderer/src/hooks/queries.ts` — Add `useDirectoryWatcher()` hook, change staleTime to Infinity
- [ ] Modify `src/renderer/src/App.tsx` — Extract `AppContent` component, call `useDirectoryWatcher()`
- [ ] Verify real-time behavior — Create test project/session, verify <200ms UI updates
- [ ] Verify fallback polling — Disable watcher, confirm 120s/60s refetchInterval still works
- [ ] Update CHANGELOG.md

## Progress Log

### 2026-02-16 (Initial)
- Created branch from `dev` at `a78cfeb`
- Brought along uncommitted CHANGELOG.md updates (documented previous UI improvements)
- ✅ Created DirectoryWatcher service with debounced event classification

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

None currently.

## Commits
a78cfeb - (base commit) chore: pipe dev server output to /tmp log and update agent rules
60aa875 - wip: start responsive-filesystem — init progress tracker
