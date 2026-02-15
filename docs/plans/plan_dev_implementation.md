# WIP: ClaudeOverseer POC Implementation

**Branch:** `dev`
**Started:** 2026-02-15
**Status:** In Progress
**Plan:** [claude_overseer_poc.md](claude_overseer_poc.md)

## Plan Summary

Building ClaudeOverseer - an Electron + React + TypeScript desktop app that monitors Claude Code background agents in real-time by reading local JSONL log files. Zero API calls, zero tokens spent.

**Key Features:**
- Three-panel UI: Projects sidebar, Sessions list, Message stream
- Live file watching with `chokidar` for real-time updates
- Markdown rendering with Mermaid diagram support
- Team/subagent discovery and display
- Dark mode by default (Bootstrap 5)

**Tech Stack:**
- Electron 33+
- React 19 + TypeScript
- React-Bootstrap 2.x + Bootstrap 5
- Vite bundler (via electron-vite)
- Zustand for state management
- react-markdown + remark-gfm + rehype-highlight
- chokidar for file watching

### Tasks

**Phase 1: Scaffold & Skeleton**
- [ ] Initialize Electron + Vite + React project
- [ ] Install dependencies (react-bootstrap, zustand, markdown libs, chokidar)
- [ ] Set up Bootstrap dark theme
- [ ] Create three-panel AppShell layout
- [ ] Verify app launches with Bootstrap styling

**Phase 2: Project Discovery**
- [ ] Implement path encoder/decoder utilities
- [ ] Implement project scanner service
- [ ] Implement session discovery service
- [ ] Wire up IPC handlers
- [ ] Build ProjectList and SessionList components
- [ ] Verify project/session discovery works

**Phase 3: JSONL Parsing & Display**
- [ ] Implement JSONL parser with TypeScript types
- [ ] Implement message formatter (grouping, matching tool calls/results)
- [ ] Build message display components (UserMessage, AssistantMessage, ToolCallCard, ToolResultCard)
- [ ] Build MessageStream component
- [ ] Implement raw JSON toggle (per-message + global)
- [ ] Verify formatted conversation display

**Phase 4: Live Watching**
- [ ] Implement JSONL watcher with chokidar
- [ ] Wire up IPC events for new messages
- [ ] Implement useIpcMessages hook
- [ ] Implement auto-scroll behavior
- [ ] Add session status detection (active/recent/stale badges)
- [ ] Verify live message streaming

**Phase 5: Polish & Teams**
- [ ] Add team support (config reader, UI components)
- [ ] Add token usage summary bar
- [ ] Add keyboard shortcuts
- [ ] Handle edge cases (corrupt JSONL, large files, etc.)
- [ ] Add app icon and About dialog

**Phase 6: Packaging**
- [ ] Configure electron-builder for macOS
- [ ] Test .dmg build
- [ ] Add Linux build targets (optional)
- [ ] Create README with screenshots

## Progress Log

### 2026-02-15 - Project Start
- Initialized WIP tracker
- Working tree clean, on `dev` branch
- Ready to begin Phase 1: Scaffold & Skeleton

## Decisions & Notes

- **Working directly on `dev` branch** per user request (not creating a feature branch)
- **Using electron-vite template** for fastest setup
- **Bootstrap over custom CSS** - user specifically requested React-Bootstrap
- **No Next.js** - unnecessary complexity for Electron (no server needed)
- **Read-only approach** - never write to Claude's files, zero corruption risk

## Blockers

None currently.

## Commits

(Commits will be logged here as implementation progresses)
