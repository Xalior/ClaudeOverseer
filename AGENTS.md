# ClaudeOverseer

## Debugging Architecture

ClaudeOverseer is an **electron-vite** app. In development:

- **Renderer**: React 19 on `http://localhost:5173` (Vite HMR — edits hot-reload instantly, no build needed)
- **Main process**: Electron with `--remote-debugging-port=19222` (dev only, set in `src/main/index.ts:6-8`)
- **CDP via MCP**: The `chrome-devtools` MCP server connects to port 19222 automatically (configured in `.mcp.json`)

**You edit source files, they hot-reload. You observe results via MCP tools. That's the entire loop.**

## MCP Tools Available

The `chrome-devtools` MCP server gives you direct access to the running Electron app. No scripts, no Playwright, no dependencies.

### Observation

| Tool | What it does |
|------|-------------|
| `list_pages` | List open pages in the app |
| `take_snapshot` | Get the full accessibility tree with element UIDs |
| `take_screenshot` | Capture a PNG of the current viewport |
| `evaluate_script` | Run arbitrary JS in the renderer and get results |
| `list_console_messages` | Read console log/warn/error output |
| `list_network_requests` | See all network activity |
| `get_network_request` | Inspect a specific request/response |
| `get_console_message` | Get details of a specific console message |

### Interaction

| Tool | What it does |
|------|-------------|
| `click` | Click an element by UID from a snapshot |
| `fill` | Type into an input or select an option |
| `fill_form` | Fill multiple form fields at once |
| `hover` | Hover over an element |
| `press_key` | Press keys or key combos (Enter, Ctrl+A, etc.) |
| `drag` | Drag one element onto another |
| `upload_file` | Upload a file through a file input |

### Navigation & Control

| Tool | What it does |
|------|-------------|
| `navigate_page` | Go to a URL, back, forward, or reload |
| `select_page` | Switch between pages/windows |
| `handle_dialog` | Accept or dismiss browser dialogs |
| `wait_for` | Wait for specific text to appear |

### Advanced

| Tool | What it does |
|------|-------------|
| `emulate` | Set viewport, dark mode, geolocation, network throttling |
| `performance_start_trace` | Record a performance trace |
| `performance_stop_trace` | Stop recording and get results |
| `performance_analyze_insight` | Analyze specific performance insights |

## The Debugging Loop

### Step 1: Confirm the app is live

```
list_pages
```

You should see a page at `http://localhost:5173/`. If not, the dev server isn't running.

### Step 2: Observe current state

```
take_snapshot          → get the full DOM tree with element UIDs
take_screenshot        → see what the user sees
evaluate_script        → run JS to inspect state, e.g.:
                         () => ({ title: document.title, url: location.href })
list_console_messages  → check for errors
```

### Step 3: Make a code change

Edit the source file directly. Vite HMR hot-reloads it. **No build step.**

### Step 4: Verify the change took effect

```
take_snapshot    → confirm new elements exist
take_screenshot  → visual confirmation
evaluate_script  → check runtime state
```

### Step 5: If something is wrong, investigate

```
list_console_messages types=["error","warn"]  → check for errors
evaluate_script: () => getComputedStyle(el)    → check styles
evaluate_script: () => el.getBoundingClientRect() → check layout
list_network_requests                          → check failed requests
```

### Step 6: Repeat from Step 3

Edit → Observe → Fix → Observe. No test harness. No timeouts. No hoping.

## Dev Server Log

`pnpm run dev` pipes all output (stdout + stderr) to `/tmp/claudeoverseer-dev.log` via `tee`. The terminal still shows output as normal, but the log file persists for inspection.

The log file contains ANSI color codes (terminal colors are preserved via `FORCE_COLOR=1`). When searching the log, be aware that color escape sequences may appear within keywords.

**Use cases for agents:**
- Check if the dev server started successfully: `Read /tmp/claudeoverseer-dev.log`
- Search for errors without MCP: `Grep pattern="error|ERR" path="/tmp/claudeoverseer-dev.log"`
- Tail recent output: `Bash: tail -20 /tmp/claudeoverseer-dev.log`
- Verify HMR reloads after edits: `Grep pattern="hmr|reload" path="/tmp/claudeoverseer-dev.log"`
- Strip colors for clean reading: `Bash: sed 's/\x1b\[[0-9;]*m//g' /tmp/claudeoverseer-dev.log`

The log resets each time `pnpm run dev` is started (tee overwrites the file).

## Key Files

| File | Purpose |
|------|---------|
| `src/main/index.ts` | Main process — creates window, enables CDP on :19222 |
| `src/main/ipc-handlers.ts` | IPC handlers for file watching, session discovery |
| `src/preload/index.ts` | Context bridge — exposes `window.overseer` API |
| `src/renderer/src/App.tsx` | Root React component |
| `src/renderer/src/main.tsx` | Renderer entry point |
| `electron.vite.config.ts` | Vite config for main/preload/renderer |
| `.mcp.json` | MCP server config — points chrome-devtools at port 19222 |

## Frontend Architecture

### Three-Panel Layout (`App.tsx`)

| Panel | Component | Col Width | Purpose |
|-------|-----------|-----------|---------|
| 1 | `ProjectList` | xs=3 | Project sidebar — deterministic SVG icons, session count badges, modification times |
| 2 | `SessionList` | xs=3 | Sessions for selected project — hierarchical with collapsible subagents |
| 3 | `MessageStream` | xs=6 | Message display with auto-scroll, raw JSON toggle, markdown rendering |

Selection flow: Project → Sessions → Messages (no URL routing, state in `App.tsx`).

### State Management

**TanStack React Query** — primary state for server-side data:
- `useProjectsDir()` — projects directory path (staleTime: Infinity)
- `useProjects()` — project list (staleTime: 30s polling)
- `useSessions(projectEncodedName)` — sessions for selected project (staleTime: 10s)
- `useSessionMessages(sessionFilePath)` — messages with live file watcher invalidation (staleTime: Infinity)

All hooks in `src/renderer/src/hooks/queries.ts`.

**React local state** — UI concerns (selected project/session, expanded parents, scroll position, raw mode toggles).

**Zustand** — installed (v5) but currently unused.

### Real-Time Updates

Electron IPC + chokidar file watching (no WebSocket/SSE):
1. `useSessionMessages()` calls `window.overseer.watchSession()` on mount
2. Main process `JsonlWatcher` detects file changes via chokidar
3. New messages sent via `ipcRenderer.send('overseer:new-messages', ...)`
4. Hook receives event → `queryClient.invalidateQueries()` → re-fetch → re-render

### IPC API (`window.overseer`)

| Method | Direction | Purpose |
|--------|-----------|---------|
| `getProjectsDir()` | invoke | Get projects directory path |
| `scanProjects(dir)` | invoke | List all projects |
| `discoverSessions(name, dir)` | invoke | List sessions for a project |
| `getMessages(path)` | invoke | Load formatted messages from JSONL |
| `watchSession(path)` | invoke | Start file watcher for a session |
| `unwatchSession(path)` | invoke | Stop file watcher |
| `onNewMessages(cb)` | subscribe | Listen for new message events |

Defined in `src/preload/index.ts` (bridge) and `src/preload/index.d.ts` (types).

### Session Types & Status

Types: `main` (primary sessions), `background` (prefixed `agent-`), `subagent` (in `subagents/` subdirectories).

Status badges based on `lastModified`:
- Active (green): < 1 minute old
- Recent (blue): < 5 minutes old
- Stale (gray): > 5 minutes old

### Message Components

| Component | Purpose |
|-----------|---------|
| `MessageStream.tsx` | Container with auto-scroll and global raw toggle |
| `UserMessage.tsx` | User messages with text and base64 images |
| `AssistantMessage.tsx` | Claude responses with markdown, token usage, model badge |
| `ToolCallCard.tsx` | Expandable tool calls with syntax-highlighted I/O |
| `TokenUsageBar.tsx` | Cumulative token usage display |
| `RawJsonView.tsx` | Raw JSON fallback view |

### Keyboard Shortcuts

- `Cmd+1/2/3` — focus panels
- `Cmd+R` — refresh
- `Cmd+J` — toggle raw JSON mode

### Main Process Services

| Service | File | Purpose |
|---------|------|---------|
| `project-scanner.ts` | `src/main/services/` | Scans project directories, resolves encoded paths |
| `session-discovery.ts` | `src/main/services/` | Enumerates JSONL files, extracts metadata (slug, summary) |
| `jsonl-watcher.ts` | `src/main/services/` | Chokidar-based file tailing with offset tracking |
| `jsonl-parser.ts` | `src/main/services/` | Line-by-line JSONL parsing |
| `message-formatter.ts` | `src/main/services/` | Raw → formatted message transformation with tool pairing |
| `team-reader.ts` | `src/main/services/` | Team configuration file parsing |
| `path-encoder.ts` | `src/main/utils/` | Claude's dash-encoded path resolution |

## Testing Infrastructure

Three test tiers, each with different scope and speed:

### Unit Tests (`tests/unit/`)

**Runner:** Vitest (`vitest.config.ts`)
**Run:** `npm run test:unit` or `npx vitest run tests/unit`
**Speed:** ~500ms for 156 tests

Pure function tests with no Electron context. Mock `electron` module via `vi.mock('electron')`. Tests are organized by process:

| Directory | Tests | What they cover |
|-----------|-------|----------------|
| `tests/unit/main/` | jsonl-parser, message-formatter, path-encoder, team-reader, session-resume, broadcaster, remote-server | Main process services |
| `tests/unit/renderer/` | format-utils, project-utils, session-utils, tool-formatting | Renderer utility functions |

**Mocking patterns:**
- Electron: `vi.mock('electron', () => ({ BrowserWindow: { getAllWindows: () => [...] } }))`
- Node modules: `vi.mock('child_process', () => ({ spawn: vi.fn() }))`
- Services: `vi.mock('../../../src/main/services/foo', () => ({ bar: vi.fn() }))`
- Module re-import for state reset: `vi.resetModules()` then `await import(...)`

**Key rule:** Unit tests must never touch the filesystem, network, or real Electron APIs. Everything external is mocked.

### Integration Tests (`tests/integration/`)

**Runner:** Vitest (same config, different directory)
**Run:** `npm run test:integration` or `npx vitest run tests/integration`
**Speed:** ~1.5s for 21 tests

Tests that exercise real service code against fixture data on disk. No Electron, no mocks — real file I/O against `tests/fixtures/`.

| Test file | What it covers |
|-----------|---------------|
| `ipc-contract.test.ts` | Verifies service return shapes match the IPC contract |
| `project-scanner.test.ts` | Real directory scanning against fixture projects |
| `session-discovery.test.ts` | Real session enumeration with subagents |
| `jsonl-watcher.test.ts` | Real chokidar file watching (creates temp files) |

### E2E Tests (`tests/e2e/`)

**Runner:** Playwright (`playwright.config.ts`)
**Run:** `npm run test:e2e` (builds first!) or `npm run build && playwright test tests/e2e`
**Speed:** ~18s for 11 tests (serial, 1 worker)

Full Electron app tests — builds the app, launches it, interacts via Playwright's Electron API.

| Test file | What it covers |
|-----------|---------------|
| `app-launch.spec.ts` | Three panels visible, correct headings, cleanup on close |
| `message-stream.spec.ts` | Message rendering, raw toggle, tool cards |
| `project-discovery.spec.ts` | Project list from fixtures, session list |
| `theme-toggle.spec.ts` | Theme buttons visible, switching applies `data-theme` |
| `live-watching.spec.ts` | New messages appear when JSONL is appended |

**Important caveats:**
- E2E tests require `npm run build` first (they launch from `out/`)
- They read the user's real `~/.ClaudeOverseer/prefs.json` — **do not assert on saved preference values** like theme or selected project. Assert on behavior (e.g., "one button is active") not specific state.
- Use `PATHS_FILE` env var to point to fixture data instead of the user's real Claude projects
- Playwright config: serial execution, 1 worker (Electron can't run parallel instances reliably)
- Always wrap in try/finally with `app.close()` to prevent orphaned Electron processes

### Test Fixtures (`tests/fixtures/`)

```
tests/fixtures/
  projects/
    -test-project/
      session-test-123.jsonl        # Main session with user + assistant + tool messages
      session-935ce02d.jsonl        # Additional main session
      session-ac1708b5.jsonl        # Parent session (has subagents)
      session-ac1708b5/subagents/
        agent-a8af19b.jsonl         # Subagent session
      agent-atest99.jsonl           # Background agent session
  tasks/
    test-team/                      # Task fixtures for team-reader tests
  teams/
    test-team/config.json           # Team config fixture
```

### Running All Tests

| Command | What runs | When to use |
|---------|-----------|-------------|
| `npx vitest run` | Unit + integration | After any code change (fast feedback) |
| `npm run test:unit` | Unit only | Quick check during development |
| `npm run test:e2e` | Build + e2e | Before commits, after UI changes |
| `npm run test:all` | Unit + integration + e2e | Full validation before merge |
| `npx vitest watch` | Unit (watch mode) | During active development |

### Writing New Tests

- **New main process service?** Add unit test in `tests/unit/main/`. Mock Electron and external deps.
- **New renderer utility?** Add unit test in `tests/unit/renderer/`.
- **New IPC handler?** Add contract test in `tests/integration/ipc-contract.test.ts`.
- **New UI component or interaction?** Add e2e test in `tests/e2e/`. Remember: build first.
- **Changed existing behavior?** Update existing test assertions to match. Rule 7 applies.

## Rules

1. **Never build** during development. Vite HMR handles everything.
2. **Never use Playwright.** MCP tools give you everything directly.
3. **Never add UI debug indicators.** Use `take_snapshot`, `evaluate_script`, `take_screenshot` to observe.
4. **Never commit** unless explicitly told to.
5. **Edit → Observe → Fix → Observe.** That's the loop.
6. **Don't changelog agent metafiles.** Changes to `AGENTS.md`, `CLAUDE.md`, `docs/plans/`, and other agent-facing documentation are not user-facing and should not be recorded in `docs/CHANGELOG.md`.
7. **Always update tests** when making codebase changes. Run `npx vitest run` after changes and fix any broken tests. When renaming UI text, updating components, or changing behavior, update the corresponding test assertions and descriptions to match.

## Plan Management Workflow

When beginning work on a new feature or refactor:

1. **Create plan** in `docs/plans/` - architectural design and approach (e.g., `feature-name.md`)
2. **Create implementation tracking file** in `docs/plans/` - track progress with git commits, WIP status, task lists (e.g., `plan_feature-name-implementation.md`)
3. **Move both to done** when complete - `mv docs/plans/plan-name* docs/plans/done/`

The implementation file goes into git and serves as the single source of truth for progress monitoring.

**Note:** `~/.claude/plans/` is Claude's temporary workspace for plan mode - leave those files alone.
