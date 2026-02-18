# WIP: Feature/Cost-Overview

**Branch:** `feature/cost-overview`
**Started:** 2026-02-18
**Status:** Complete

## Plan

Implement session & project cost tracking as described in [cost-overview.md](cost-overview.md).

Summary: Add a main-process CostCache that computes per-session costs from JSONL files, persists to disk, pushes updates via IPC, and displays costs in SessionList rows and ProjectList cards.

### Tasks

- [x] 1. Create `src/main/services/pricing.ts` — main-process pricing functions
- [x] 2. Create `src/main/services/cost-cache.ts` — core cost cache service
- [x] 3. Modify `src/main/index.ts` — instantiate CostCache
- [x] 4. Modify `src/main/ipc-handlers.ts` — wire cache into watchers + new handlers
- [x] 5. Modify `src/preload/index.ts` + `index.d.ts` — bridge new IPC channels
- [x] 6. Add new hooks in `src/renderer/src/hooks/queries.ts`
- [x] 7. Modify `src/renderer/src/App.tsx` — pass projectDir
- [x] 8. Modify `src/renderer/src/components/SessionList.tsx` — show session costs
- [x] 9. Modify `src/renderer/src/components/ProjectList.tsx` — show project costs
- [x] 10. Modify `src/renderer/src/styles/custom.scss` — style cost displays
- [x] 11. Verify — TypeScript clean, all 21 tests pass

## Progress Log

### 2026-02-18T00:00
- Started work. Branch created from `dev` at `4356de6`.

### 2026-02-18T00:01
- Implemented all 10 tasks. TypeScript compiles cleanly. All 21 tests pass.

## Decisions & Notes

- Main-process pricing.ts is a deliberate copy of the renderer version (~55 lines). Sharing via a common module would require electron-vite build config restructuring — not worth it for this size.
- Project costs only shown on pinned cards (not discovered) to avoid computing costs for all projects.
- Cost invalidation is event-driven via `overseer:cost-updated` IPC event — no polling.
- Background scan runs via `setImmediate` after directory watcher starts, so it doesn't block startup.

## Blockers

None.

## Commits
4356de6 - docs: add session & project cost tracking plan
dd44295 - wip: start feature/cost-overview — init progress tracker
e425b97 - feat: add main-process pricing and cost cache services
9565a19 - feat: wire cost cache into main process and IPC handlers
e9f5b7f - feat: add cost IPC bridge and React Query hooks
443b225 - feat: display costs in session rows and pinned project cards
