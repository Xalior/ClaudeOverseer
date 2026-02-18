# WIP: Cost Display Enhancements for Project Cards

**Branch:** `feature/cost-overview`
**Started:** 2026-02-18
**Status:** Complete

## Plan

See [cost-display-enhancements.md](./cost-display-enhancements.md) for full plan.

### Tasks

- [x] Add `getModelName()` to `pricing.ts`
- [x] Restructure `CacheEntry` in `cost-cache.ts` to include `byModel`
- [x] Update `recomputeSession()` to accumulate per-model costs
- [x] Update `getAllProjectCosts()` to return `{ total, byModel }` per project
- [x] Update IPC handler in `ipc-handlers.ts` (implicit via return type)
- [x] Update preload bridge `index.ts` + type declarations `index.d.ts`
- [x] Update `useProjectCosts` hook in `queries.ts` (type inferred from queryFn)
- [x] Update `ProjectList.tsx`: all cards show cost, pinned always active, per-model breakdown
- [x] Add CSS in `custom.scss` for cost breakdown styles
- [x] Restart dev server + verify with MCP

## Progress Log

### 2026-02-18T00:00:00Z
- Started work. Branch continuing from `feature/cost-overview` at `ae2fc01`.

### 2026-02-18T12:25:00Z
- All tasks complete. 21/21 tests pass. MCP verified: pinned always active, per-model breakdown visible, all discovered cards show costs.

## Decisions & Notes

- Old cache entries missing `byModel` field: treated as stale and recomputed gracefully
- Model names strip "Claude " prefix for brevity (e.g. "Claude Opus 4.6" → "Opus 4.6")
- Pinned cards always show as active/expanded regardless of selection state
- All cards (pinned + discovered) show total cost when > 0

## Blockers

<None currently.>

## Commits
ae2fc01 - Starting point: fix double-slash in project paths
fbbe025 - wip: start cost-display-enhancements — init progress tracker
8fa8658 - feat: restructure CacheEntry to include byModel, add getModelName()
9f60a69 - feat: update getAllProjectCosts return type to include byModel
3a6fc6f - feat: cost on all cards, pinned always active, per-model breakdown on pinned cards
9b48f0c - fix: guard against stale numeric cost entries before main process restart
