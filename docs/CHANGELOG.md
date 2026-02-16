# Changelog

All notable changes to ClaudeOverseer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - Unreleased (partial)

### Added
- **Collapsible Session Groups** — Parent sessions with subagents now show a collapse/expand toggle (▶/▼) with child count; all groups collapsed by default except the active session

### Changed
- **TanStack Query Migration** — Replaced manual `useState`/`useEffect` data fetching with `@tanstack/react-query` across all three data-fetching components (ProjectList, SessionList, MessageStream)
  - New shared query hooks: `useProjectsDir()`, `useProjects()`, `useSessions()`, `useSessionMessages()`
  - `useProjectsDir()` cached and shared between Projects and Sessions (eliminates duplicate IPC calls)
  - Filesystem watcher events now invalidate the query cache instead of manual `setState`
  - ~50 lines of boilerplate removed

### Technical Details
- Added `@tanstack/react-query` dependency
- `QueryClientProvider` wraps the app root with `retry: 1`, `refetchOnWindowFocus: false`
- Stale times: projectsDir=Infinity, projects=30s, sessions=10s, messages=Infinity (watcher-driven)

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
