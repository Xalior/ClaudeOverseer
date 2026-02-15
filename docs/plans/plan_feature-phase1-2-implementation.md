# WIP: Phase 1 & 2 - Scaffold + Project Discovery (CORRECT Implementation)

**Branch:** `feature/phase1-2-scaffold-and-discovery`
**Started:** 2026-02-15
**Status:** In Progress
**Base:** `dev` branch at `6eb455c`

## Plan

RE-implementing Phase 1 & 2 from scratch using CORRECT testing practices.

**Plan File:** [docs/plans/claude_overseer_poc.md](./claude_overseer_poc.md)

**Previous Attempt:** FAILED - used screenshots, self-modifying code, left orphaned Electron processes. All code deleted.

**This Attempt:** Following strict testing discipline:
- ✅ NO screenshots
- ✅ NO self-modifying code
- ✅ Mandatory cleanup (finally blocks)
- ✅ Fixture data only
- ✅ Native platform tools (Playwright, Accessibility Inspector, DevTools)

### Phase 1: 🏠 Scaffold & Skeleton

- [x] Create package.json with all deps (manual, since interactive tool failed)
- [x] Install runtime deps: react-bootstrap, bootstrap, zustand, react-markdown, remark-gfm, rehype-highlight, mermaid, chokidar
- [x] Install test deps: @playwright/test, vitest, @vitest/coverage-v8
- [x] Create vitest.config.ts with coverage thresholds (80%)
- [x] Create playwright.config.ts for Electron
- [x] Set up Bootstrap dark theme in custom.scss
- [x] Create App.tsx with three panels (WITH `data-testid` attributes: project-sidebar, session-list, message-stream!)
- [x] Wire up Electron main process (src/main/index.ts)
- [x] Create preload script with contextBridge stub
- [x] Create test directory structure
- [x] **TEST:** Write tests/e2e/app-launch.spec.ts (with try/finally cleanup!)
- [x] **TEST:** Run test, verify passes ✅ 2/2 tests passed
- [x] **TEST:** Verified `ps aux | grep electron` is EMPTY ✅ No orphaned processes
- [x] Verify: app launches with three empty panels ✅ PHASE 1 COMPLETE

### Phase 2: 📂 Project Discovery

- [ ] Create tests/fixtures/projects/-test-project/ structure
- [ ] Implement src/main/utils/path-encoder.ts
- [ ] **TEST:** Write tests/unit/main/path-encoder.test.ts
- [ ] Implement src/main/services/project-scanner.ts
- [ ] **TEST:** Write tests/integration/project-scanner.test.ts (uses fixtures!)
- [ ] Implement src/main/services/session-discovery.ts
- [ ] **TEST:** Write tests/integration/session-discovery.test.ts
- [ ] Wire up IPC handlers in src/main/ipc-handlers.ts
- [ ] **TEST:** Write tests/integration/ipc-contract.test.ts
- [ ] Implement ProjectList.tsx and SessionList.tsx (with `data-testid`!)
- [ ] **TEST:** Write tests/e2e/project-discovery.spec.ts
- [ ] Verify: fixture project appears in sidebar

## Progress Log

### 2026-02-15 18:45 UTC
- ✅ Branched from `dev` (corrected from initial mistake of branching from main)
- ✅ Deleted broken WIP files from failed attempt
- ✅ Deleted ALL code from failed implementation (src/, configs, package.json, everything)
- ✅ Starting completely fresh with correct testing practices
- 🚀 Ready to begin Phase 1 properly

### 2026-02-15 19:15 UTC
- ✅ Created complete Electron + React + TypeScript scaffold
- ✅ Set up all configs (electron-vite, vitest, playwright, tsconfig)
- ✅ Installed all dependencies (React 19, Bootstrap 5, testing tools)
- ✅ Created three-panel layout with data-testid attributes
- ✅ Wrote E2E test with proper cleanup (try/finally)
- ✅ Tests passed: 2/2
- ✅ Verified no orphaned processes: `ps aux | grep electron` = EMPTY
- 🎉 **PHASE 1 COMPLETE**
- 🚀 Starting Phase 2: Project Discovery

## Decisions & Notes

### Why Starting Fresh
The previous implementation (marked complete on dev) was done WRONG:
- Used screenshot testing (flaky, unmaintainable)
- Self-modified for testing (test-only code paths)
- Left hundreds of Electron processes (resource leaks)
- No proper test isolation (tested against real ~/.claude/)

### Testing Rules (STRICT)
1. **data-testid on all testable elements** - Playwright needs stable selectors
2. **Fixtures only** - NEVER test against ~/.claude/ - use tests/fixtures/
3. **Always close Electron** - Use try/finally or Playwright fixtures
4. **Verify cleanup** - After E2E suite: `ps aux | grep electron` MUST be empty
5. **No screenshots** - Ever. Use DOM assertions only.

### Architecture Decisions
- Electron 33+ + React 19 + TypeScript + Bootstrap 5
- Vite bundler (electron-vite)
- Three-panel layout: Projects | Sessions | Messages
- Read-only (never write to ~/.claude/)

## Blockers

None currently.

## Commits

(Will be logged as work progresses)
