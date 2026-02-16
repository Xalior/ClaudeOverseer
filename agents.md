# Agent Debugging Guide: ClaudeOverseer

## Architecture

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

## Rules

1. **Never build** during development. Vite HMR handles everything.
2. **Never use Playwright.** MCP tools give you everything directly.
3. **Never add UI debug indicators.** Use `take_snapshot`, `evaluate_script`, `take_screenshot` to observe.
4. **Never commit** unless explicitly told to.
5. **Edit → Observe → Fix → Observe.** That's the loop.
