# WIP: TanStack Query Migration

**Branch:** `refactor/tanstack-query-migration`
**Started:** 2026-02-16
**Status:** Complete

## Plan

Migrate ClaudeOverseer renderer from manual `useState`/`useEffect` data fetching to TanStack Query. Read-only filesystem observer — no mutations needed.

### Tasks

- [x] Install @tanstack/react-query
- [x] Set up QueryClientProvider in App.tsx
- [x] Create custom query hooks (useProjects, useSessions, useSessionMessages, useProjectsDir)
- [x] Refactor ProjectList to use query hooks
- [x] Refactor SessionList to use query hooks
- [x] Refactor MessageStream to use query hooks + watcher invalidation
- [x] Verify build compiles cleanly

## Progress Log

### 2026-02-16T00:00
- Started work. Branch created from `dev` at `c027f5a`.

### 2026-02-16T00:01
- Installed @tanstack/react-query dependency.
- Created `src/renderer/src/hooks/queries.ts` with 4 custom hooks:
  - `useProjectsDir()` — cached at `staleTime: Infinity` (never changes during session)
  - `useProjects()` — depends on projectsDir, `staleTime: 30s`
  - `useSessions(projectEncodedName)` — depends on projectsDir, `staleTime: 10s`
  - `useSessionMessages(sessionFilePath)` — wires chokidar watcher to query invalidation, `staleTime: Infinity`
- Wrapped App.tsx with `QueryClientProvider` (retry: 1, refetchOnWindowFocus: false).
- Refactored all 3 data-fetching components. Net: ~50 lines removed.
- Type-check passes (only pre-existing errors in main process code).

## Decisions & Notes

- TanStack Query only (not Actions/mutations) — app is a read-only filesystem observer
- Keep IPC layer (`window.overseer.*`), presentational components, and chokidar watcher unchanged
- Only touch renderer-side data fetching patterns
- Local UI state (selectedId, expandedParents, rawToggles, etc.) stays as useState
- `useProjectsDir()` is shared by both useProjects and useSessions — single cached fetch
- `useSessionMessages` owns the watcher lifecycle (watch/unwatch/invalidate) — moved from component
- `refetchOnWindowFocus: false` since we have our own watcher-based invalidation

## Blockers

None.

## Commits
d7a3cab - wip: start tanstack-query-migration — init progress tracker
90634bb - chore: install @tanstack/react-query
0d45f02 - feat: add QueryClientProvider and custom query hooks
f9b10e8 - refactor: migrate ProjectList to useProjects() query hook
4a02635 - refactor: migrate SessionList to useSessions() query hook
46636c4 - refactor: migrate MessageStream to useSessionMessages() query hook
