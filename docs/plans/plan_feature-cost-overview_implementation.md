# WIP: Feature/Cost-Overview

**Branch:** `feature/cost-overview`
**Started:** 2026-02-18
**Status:** In Progress

## Plan

Implement session & project cost tracking as described in [cost-overview.md](cost-overview.md).

Summary: Add a main-process CostCache that computes per-session costs from JSONL files, persists to disk, pushes updates via IPC, and displays costs in SessionList rows and ProjectList cards.

### Tasks

- [ ] 1. Create `src/main/services/pricing.ts` — main-process pricing functions
- [ ] 2. Create `src/main/services/cost-cache.ts` — core cost cache service
- [ ] 3. Modify `src/main/index.ts` — instantiate CostCache
- [ ] 4. Modify `src/main/ipc-handlers.ts` — wire cache into watchers + new handlers
- [ ] 5. Modify `src/preload/index.ts` + `index.d.ts` — bridge new IPC channels
- [ ] 6. Add new hooks in `src/renderer/src/hooks/queries.ts`
- [ ] 7. Modify `src/renderer/src/App.tsx` — pass projectDir
- [ ] 8. Modify `src/renderer/src/components/SessionList.tsx` — show session costs
- [ ] 9. Modify `src/renderer/src/components/ProjectList.tsx` — show project costs
- [ ] 10. Modify `src/renderer/src/styles/custom.scss` — style cost displays
- [ ] 11. Verify — restart dev server, visual checks, run tests

## Progress Log

### 2026-02-18T00:00
- Started work. Branch created from `dev` at `4356de6`.

## Decisions & Notes

<Record architectural decisions, trade-offs, and anything useful for reviewers.>

## Blockers

None currently.

## Commits
4356de6 - docs: add session & project cost tracking plan
