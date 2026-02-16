# WIP: TanStack Query Migration

**Branch:** `refactor/tanstack-query-migration`
**Started:** 2026-02-16
**Status:** In Progress

## Plan

Migrate ClaudeOverseer renderer from manual `useState`/`useEffect` data fetching to TanStack Query. Read-only filesystem observer — no mutations needed.

### Tasks

- [ ] Install @tanstack/react-query
- [ ] Set up QueryClientProvider in App.tsx
- [ ] Create custom query hooks (useProjects, useSessions, useSessionMessages, useProjectsDir)
- [ ] Refactor ProjectList to use query hooks
- [ ] Refactor SessionList to use query hooks
- [ ] Refactor MessageStream to use query hooks + watcher invalidation
- [ ] Verify build compiles cleanly

## Progress Log

### 2026-02-16T00:00
- Started work. Branch created from `dev` at `c027f5a`.

## Decisions & Notes

- TanStack Query only (not Actions/mutations) — app is a read-only filesystem observer
- Keep IPC layer (`window.overseer.*`), presentational components, and chokidar watcher unchanged
- Only touch renderer-side data fetching patterns
- Local UI state (selectedId, expandedParents, rawToggles, etc.) stays as useState

## Blockers

None currently.

## Commits
