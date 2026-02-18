# WIP: Cost Display Enhancements for Project Cards

**Branch:** `feature/cost-overview`
**Started:** 2026-02-18
**Status:** In Progress

## Plan

See [cost-display-enhancements.md](./cost-display-enhancements.md) for full plan.

### Tasks

- [ ] Add `getModelName()` to `pricing.ts`
- [ ] Restructure `CacheEntry` in `cost-cache.ts` to include `byModel`
- [ ] Update `recomputeSession()` to accumulate per-model costs
- [ ] Update `getAllProjectCosts()` to return `{ total, byModel }` per project
- [ ] Update IPC handler in `ipc-handlers.ts`
- [ ] Update preload bridge `index.ts` + type declarations `index.d.ts`
- [ ] Update `useProjectCosts` hook in `queries.ts`
- [ ] Update `ProjectList.tsx`: all cards show cost, pinned always active, per-model breakdown
- [ ] Add CSS in `custom.scss` for cost breakdown styles
- [ ] Restart dev server + verify with MCP

## Progress Log

### 2026-02-18T00:00:00Z
- Started work. Branch continuing from `feature/cost-overview` at `ae2fc01`.

## Decisions & Notes

- Old cache entries missing `byModel` field: treated as stale and recomputed gracefully
- Model names strip "Claude " prefix for brevity (e.g. "Claude Opus 4.6" → "Opus 4.6")
- Pinned cards always show as active/expanded regardless of selection state
- All cards (pinned + discovered) show total cost when > 0

## Blockers

<None currently.>

## Commits
ae2fc01 - Starting point: fix double-slash in project paths
