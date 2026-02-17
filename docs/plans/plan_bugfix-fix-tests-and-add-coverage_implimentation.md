# WIP: Fix Tests and Add Coverage

**Branch:** `bugfix/fix-tests-and-add-coverage`
**Started:** 2026-02-17
**Status:** Complete

## Plan

### Tasks

- [x] Fix vitest config to exclude e2e tests
- [x] Fix e2e project-discovery tests (`.badge` → `.ui-badge`, subagent collapsed check)
- [x] Fix e2e message-stream tests (`token-usage-bar` → `status-bar`)
- [x] Add data-testid to ThemeToggle component
- [x] Extract pure renderer utilities into testable modules
- [x] Add unit tests for tool formatting (MCP name parsing, icons)
- [x] Add unit tests for system-reminder parsing
- [x] Add unit tests for project sorting and activity levels
- [x] Add unit tests for session status detection
- [x] Add unit tests for StatusBar number formatting
- [x] Add e2e test for theme toggle feature

## Progress Log

### 2026-02-17T20:45
- Started work. Branch created from `dev` at `6b2a718`.

### 2026-02-17T20:47
- Fixed vitest config, e2e selectors, committed `d1b3d76`.
- Extracted pure utils from components, added testids to ThemeToggle, committed `9d2cb74`.
- Added 79 new unit tests across 4 test files, committed `ee6cca5`.
- Added e2e theme toggle tests, committed `91ec4e3`.
- All 160 unit/integration tests passing. Ready for PR.

## Decisions & Notes

- CI runs vitest (unit + integration) and Playwright (e2e) separately — the vitest config just needs e2e excluded
- E2e failures stem from Radix migration (`.badge` → `.ui-badge`), StatusBar replacing TokenUsageBar (`status-bar` not `token-usage-bar`), and subagents inside collapsed Radix Collapsible
- Pure functions in renderer components extracted to `src/renderer/src/utils/` for testability without React deps
- No new dependencies added — all tests use vitest and Playwright which are already installed

## Blockers

None.

## Commits
edc8135 - wip: start bugfix/fix-tests-and-add-coverage — init progress tracker
d1b3d76 - fix: resolve all test failures
9d2cb74 - refactor: extract pure utilities from renderer components for testability
ee6cca5 - test: add unit tests for recent renderer features
91ec4e3 - test: add e2e tests for theme toggle feature
