# Plan: Cost Display Enhancements for Project Cards

## Context

We just shipped per-session and per-project cost totals. Now the user wants:
1. **All cards** (pinned AND discovered) show a summary cost when collapsed
2. **Pinned cards always render in the "active/expanded" state** (full path, larger icon, etc.)
3. **Pinned cards show per-model cost breakdown** (e.g. "Opus 4.6: $120, Sonnet 4.6: $50")

This requires restructuring the cost cache to store per-model breakdowns, not just totals.

## Changes

### 1. `src/main/services/cost-cache.ts` — Store per-model costs

Change `CacheEntry` from `{ cost: number, lastModified: number }` to:

```ts
interface CacheEntry {
  total: number
  byModel: Record<string, number>  // model_id → cost
  lastModified: number
}
```

Update `recomputeSession()` to accumulate costs per model. Update `getSessionCosts()` to return totals. Add `getProjectCostsByModel(projectDir)` → `Record<string, number>` aggregating per-model costs across all sessions. Update `getAllProjectCosts()` to return `Record<dir, { total: number, byModel: Record<string, number> }>`.

Disk cache format changes — old caches missing `byModel` are handled gracefully (treated as stale, recomputed).

### 2. `src/main/services/pricing.ts` — Add model name lookup

Add `getModelName(modelId: string): string` that returns the human-friendly name (e.g. "Opus 4.6") from pricing data, stripping the "Claude " prefix for brevity.

### 3. `src/main/ipc-handlers.ts` — Update IPC handler

Change `overseer:get-all-project-costs` to return the richer structure with `byModel`.

### 4. `src/preload/index.ts` + `index.d.ts` — Update types

Update the return type of `getAllProjectCosts` to `Record<string, { total: number, byModel: Record<string, number> }>`.

### 5. `src/renderer/src/hooks/queries.ts` — Update hook types

`useProjectCosts` returns the richer structure.

### 6. `src/renderer/src/components/ProjectList.tsx` — Main UI changes

**a) All cards show cost when not active:**
- Remove the `isPinned &&` condition from the cost display — show cost for any card with cost > 0.

**b) Pinned cards always render as "active":**
- Change: `const isActive = selectedProject === project.encodedName` → for pinned cards, always true: `const isActive = isPinned || selectedProject === project.encodedName`

**c) Pinned cards show per-model breakdown:**
- In the expanded details section of pinned cards, render a small per-model cost list below the path info. Each line: short model name + cost, sorted by cost descending.

### 7. `src/renderer/src/styles/custom.scss` — New styles

- `.project-card__cost-breakdown` — container for per-model list
- `.project-card__cost-line` — single model cost row (flex, small font, amber)
- `.project-card__cost-model` — model name label (muted text)
- `.project-card__cost-value` — cost value (monospace, amber)

## Files Modified

| File | Change |
|------|--------|
| `src/main/services/cost-cache.ts` | CacheEntry → byModel, new getProjectCostsByModel |
| `src/main/services/pricing.ts` | Add getModelName() |
| `src/main/ipc-handlers.ts` | Update return shape of get-all-project-costs |
| `src/preload/index.ts` | Update bridge types |
| `src/preload/index.d.ts` | Update TypeScript types |
| `src/renderer/src/hooks/queries.ts` | Update useProjectCosts type |
| `src/renderer/src/components/ProjectList.tsx` | Always-active pinned, costs on all cards, per-model on pinned |
| `src/renderer/src/styles/custom.scss` | New cost breakdown styles |

## Implementation Order

1. `pricing.ts` — add `getModelName()`
2. `cost-cache.ts` — restructure CacheEntry, update methods
3. `ipc-handlers.ts` — update return shape
4. `preload/index.ts` + `index.d.ts` — bridge types
5. `queries.ts` — update hook
6. `ProjectList.tsx` — UI changes (always-active pinned, costs everywhere, per-model)
7. `custom.scss` — styles
8. Restart dev server + MCP verify

## Verification

1. Restart dev server (main process changes)
2. `take_screenshot` — confirm:
   - Pinned cards are always expanded (full path visible, large icon)
   - Pinned cards show per-model cost breakdown
   - Discovered cards show total cost when collapsed
3. `list_console_messages` — no errors
4. `pnpm run test` — all tests pass
