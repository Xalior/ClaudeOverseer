# Changelog

All notable changes to ClaudeOverseer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - Unreleased (partial)

### Added
- **Dark / Light / System Theme Toggle** — Three-mode theme switcher (☀ Light, ⚙ System, 🌙 Dark) in the project sidebar header; System mode auto-follows macOS appearance (tracks sunset/sunrise changes via `prefers-color-scheme` media query listener); preference persists across sessions
- **Light Theme** — Full light colour scheme with appropriate contrast ratios, light-mode syntax highlighting for code blocks, and theme-aware tool call cards
- **Pinned Projects** — Pin favourite projects to a dedicated section at the top of the sidebar for quick access; pin state persists across sessions via preferences
- **Project Sort Controls** — Cycle through sort modes (Recent / A-Z / Sessions) for discovered projects; sort preference persists
- **Activity Indicators** — Small status dot on each project icon showing live activity state: green (active, <1min), blue (recent, <5min), gray (stale)
- **Empty Pinned State** — Friendly placeholder with dashed border and hint text when no projects are pinned
- **Preferences Persistence** — App state now survives restarts via `~/.ClaudeOverseer/prefs.json`; remembers selected project/session, window size/position, and panel widths
- **Resizable Panels** — Three-panel layout with draggable dividers; widths persist across sessions
- **Write Tool Syntax Highlighting** — Write tool calls now display file contents with highlight.js syntax highlighting instead of just a success message
- **System Reminder Detection** — `<system-reminder>` tags in tool results are parsed and displayed in a styled info box instead of raw XML
- **Smart Auto-Scroll** — Message stream only auto-scrolls when user is at the bottom; pauses when scrolled up to read older messages
- **MCP-Based CDP Debugging** — Replaced custom CDP scripts with chrome-devtools-mcp server for agent workflows; agents use native MCP tools (take_snapshot, evaluate_script, take_screenshot) for autonomous observe-edit loops
- **Redesigned Project Cards** — Styled cards with deterministic geometric SVG icons, colored accent borders, and filesystem-verified paths; click to expand shows full monospace path, verification status, and last modified time
- **Collapsible Session Groups** — Parent sessions with subagents show a collapse/expand toggle (▶/▼) with child count; all groups collapsed by default except the active session

### Fixed
- **Project Card Layout** — Compact cards now show relative time; full path only shown when expanded

### Improved
- **Enterprise Design Refresh** — Removed coloured left-edge borders from message cards and project cards; replaced with subtle background tinting and border highlights; toned-down colour palette with less saturated accents; system font stack; thinner resize handles; consistent shadow tokens across themes
- **Theme-Aware Tool Cards** — All inline styles in ToolCallCard (Bash, File, Search, AskQuestion, Generic, SystemReminder) converted from hardcoded hex colours to CSS variable references for proper light/dark rendering
- **Project Sidebar Sections** — Sidebar split into Pinned and Discovered sections with section headers, count badges, and sort controls
- **Tighter Project Cards** — More compact cards with hover shadow, smoother transitions, and pin button that appears on hover
- **Larger Project Icons** — Project icons doubled in size using CSS grid layout; collapsed icons span both text lines, expanded cards give the full path full card width below the icon
- **Slim Scrollbars** — Thin dark-themed scrollbars app-wide for a cleaner look

### Changed
- **Radix UI Migration** — Replaced React-Bootstrap with Radix UI primitives and custom styled components for a lighter, more flexible UI toolkit
- **TanStack Query Migration** — Replaced manual `useState`/`useEffect` data fetching with `@tanstack/react-query` across all three data-fetching components (ProjectList, SessionList, MessageStream)
  - New shared query hooks: `useProjectsDir()`, `useProjects()`, `useSessions()`, `useSessionMessages()`
  - `useProjectsDir()` cached and shared between Projects and Sessions (eliminates duplicate IPC calls)
  - Filesystem watcher events now invalidate the query cache instead of manual `setState`
  - ~50 lines of boilerplate removed
- **Event-Driven Filesystem Monitoring** — Replaced 30s/10s polling with chokidar directory watcher on `~/.claude/projects/` tree for near-real-time UI updates
  - New `DirectoryWatcher` service classifies filesystem events by project with 100ms per-project debouncing
  - `projects-changed` and `sessions-changed` IPC events trigger targeted React Query invalidations
  - New projects, sessions, and subagents appear within ~200ms of file creation
  - Polling kept as safety fallback (120s projects, 60s sessions)

### Technical Details
- Added `@tanstack/react-query` dependency
- `QueryClientProvider` wraps the app root with `retry: 1`, `refetchOnWindowFocus: false`
- Stale times: projectsDir=Infinity, projects=Infinity (event-driven), sessions=Infinity (event-driven), messages=Infinity (watcher-driven)
- Dev server output now logged to `/tmp/claudeoverseer-dev.log` via `tee` (terminal colors preserved with `FORCE_COLOR=1`)
- New IPC channels: `overseer:start-directory-watch`, `overseer:stop-directory-watch`, `overseer:projects-changed`, `overseer:sessions-changed`, `overseer:load-preferences`, `overseer:save-preferences`
- Preferences service: debounced writes (300ms), atomic file operations (write-to-temp + rename), merge semantics for partial updates

## [0.1.0] - 2025-02-15

### Added

#### Core Functionality
- **Live Session Monitoring** — Real-time monitoring of Claude Code sessions with automatic file watching
- **Project Scanner** — Discovers all Claude Code projects in `~/.claude/projects/` directory
- **Session Discovery** — Automatically finds main sessions and subagent sessions within projects
- **JSONL Parsing** — Parses Claude Code transcript files with support for all message types
- **Message Stream** — Chat-style interface displaying user messages, assistant responses, and tool calls

#### User Interface
- **Project List** — Sidebar showing all discovered Claude Code projects with session counts
- **Session List** — Displays all sessions for selected project with status indicators (🟢 active, 🔵 recent, ⚪ stale)
- **Message Display** — Formatted rendering of:
  - User messages with markdown support
  - Assistant messages with thinking blocks (collapsible)
  - Tool call cards (expandable) with inputs and results
  - Images and artifacts
  - Metadata display
- **Token Usage Tracking** — Input/output token counts with visual progress bars
- **Session Status** — Visual indicators showing session activity state
- **Raw JSON Toggle** — View underlying JSONL structure with `Cmd+J`

#### Team Support
- **Team Discovery** — Reads team configuration files from `~/.claude/teams/`
- **Team Display** — Shows team members with their agent types and IDs
- **Subagent Grouping** — Groups subagent sessions under their parent session

#### Keyboard Shortcuts
- `Cmd+1` — Focus Project List
- `Cmd+2` — Focus Session List
- `Cmd+3` — Focus Message Stream
- `Cmd+J` — Toggle Raw JSON View

#### Developer Features
- **Comprehensive Test Suite** — 74 tests across unit, integration, and E2E categories
- **Hot Reload** — Fast development workflow with Vite
- **Type Safety** — Full TypeScript implementation
- **Cross-Platform Builds** — Support for macOS, Linux, and Windows (x64 and ARM64)
- **Docker Build** — Cross-platform build system for Linux and Windows packages

#### Distribution Packages
- **macOS**: DMG and ZIP for Intel x64 and Apple Silicon ARM64
- **Linux**: AppImage and .deb for x64 and ARM64
- **Windows**: NSIS installers and ZIP archives for x64 and ARM64, plus universal installer

### Technical Details

#### Architecture
- **Electron 33.4.11** — Desktop shell with filesystem access
- **React 19 + TypeScript** — Component-based UI
- **React-Bootstrap + Bootstrap 5** — Styling and layout
- **Vite + electron-vite** — Fast bundling and hot-reload
- **Zustand** — Lightweight state management
- **Chokidar** — File watching for live updates
- **react-markdown + remark-gfm + rehype-highlight** — Markdown rendering with syntax highlighting
- **Mermaid 11** — Diagram support

#### Test Coverage
- **Unit Tests**: 47 tests covering parsers, formatters, and team reader
- **Integration Tests**: 18 tests for project scanner, session discovery, and JSONL watcher
- **E2E Tests**: 9 tests for app launch, project discovery, message stream, and live watching
- **All tests passing**: 74/74 ✅

### Notes
- This is the first public release of ClaudeOverseer
- Built entirely with Claude Code — monitoring itself during development
- Zero API costs — reads local transcript files only
- No internet connection required for core functionality

[0.1.1]: https://github.com/Xalior/ClaudeOverseer/releases/tag/v0.1.1
[0.1.0]: https://github.com/Xalior/ClaudeOverseer/releases/tag/v0.1.0
