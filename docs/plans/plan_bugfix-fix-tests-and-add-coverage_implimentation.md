# WIP: Fix Tests and Add Coverage

**Branch:** `bugfix/fix-tests-and-add-coverage`
**Started:** 2026-02-17
**Status:** In Progress

## Plan

### Tasks

- [ ] Fix vitest config to exclude e2e tests
- [ ] Fix e2e project-discovery tests (`.badge` → `.ui-badge`, subagent collapsed check)
- [ ] Fix e2e message-stream tests (`token-usage-bar` → `status-bar`)
- [ ] Add data-testid to ThemeToggle component
- [ ] Extract pure renderer utilities into testable modules
- [ ] Add unit tests for tool formatting (MCP name parsing, icons)
- [ ] Add unit tests for system-reminder parsing
- [ ] Add unit tests for project sorting and activity levels
- [ ] Add unit tests for session status detection
- [ ] Add unit tests for StatusBar number formatting

## Progress Log

### 2026-02-17T20:45
- Started work. Branch created from `dev` at `6b2a718`.

## Decisions & Notes

- CI runs vitest (unit + integration) and Playwright (e2e) separately — the vitest config just needs e2e excluded
- E2e failures stem from Radix migration (`.badge` → `.ui-badge`), StatusBar replacing TokenUsageBar (`status-bar` not `token-usage-bar`), and subagents inside collapsed Radix Collapsible
- Pure functions in renderer components will be extracted to `src/renderer/src/utils/` for testability without React deps

## Blockers

None currently.

## Commits
