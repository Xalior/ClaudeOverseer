# 🔭 ClaudeOverseer

> **Monitor Claude Code background agents in real-time — without spending a single extra token.**

ClaudeOverseer is a desktop application that reads Claude Code's local JSONL transcript files and presents them as a live-updating, beautifully formatted chat interface. Watch your background agents work, debug sessions, and understand exactly what Claude is doing behind the scenes — all from your filesystem, with zero API calls.

[![Tests](https://github.com/Xalior/ClaudeOverseer/workflows/Test/badge.svg)](https://github.com/Xalior/ClaudeOverseer/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## ✨ Features

- **Live Session Monitoring** — Watch Claude Code sessions update in real-time as agents work
- **Chat-Style Interface** — Familiar message stream with user messages, assistant responses, and tool calls
- **Team Support** — Discover and display team configurations with member details
- **Session Status** — Visual indicators for active (🟢), recent (🔵), and stale (⚪) sessions
- **Tool Call Visualization** — Expandable cards showing tool invocations and results
- **Token Usage Tracking** — Input/output token counts with visual bars
- **Keyboard Shortcuts** — Navigate projects and sessions with `Cmd+1/2/3`, `Cmd+J`
- **Raw JSON Toggle** — View the underlying JSONL structure when debugging
- **Zero Cost** — Reads local files only, no API calls required
- **Cross-Platform** — macOS, Linux, and Windows (both x64 and ARM64)

---

## 🚀 Quick Start

### Installation

#### macOS

```bash
# Download the latest .dmg from releases (available for Intel x64 and Apple Silicon ARM64)
# Or install via source:
git clone https://github.com/Xalior/ClaudeOverseer.git
cd ClaudeOverseer
pnpm install
pnpm run build
pnpm run dist:mac
```

#### Linux

```bash
# Download the AppImage or .deb from releases (available for x64 and ARM64)
# Or build from source:
git clone https://github.com/Xalior/ClaudeOverseer.git
cd ClaudeOverseer
pnpm install
pnpm run build
pnpm run dist:linux
```

#### Windows

```bash
# Download the installer (.exe) or .zip from releases (available for x64 and ARM64)
# Or build from source:
git clone https://github.com/Xalior/ClaudeOverseer.git
cd ClaudeOverseer
pnpm install
pnpm run build
pnpm run dist:win
```

### Prerequisites

- **Node.js** 20 or higher
- **pnpm** 9+ (`npm install -g pnpm`)
- **Claude Code** installed with active or historical sessions in `~/.claude/projects/`

---

## 📖 Usage

### Launch the App

```bash
# Development mode (with hot-reload)
pnpm run dev

# Or run the packaged app after building
./release/ClaudeOverseer.app  # macOS
./release/ClaudeOverseer       # Linux
```

### Configure Data Directory

By default, ClaudeOverseer reads from `~/.claude/projects/`. To point it at a custom location:

1. Create or edit `paths.txt` in the project root:
   ```
   Claude Project Dir = /path/to/your/.claude/projects
   ```
2. Restart the app

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+1` | Focus Project List |
| `Cmd+2` | Focus Session List |
| `Cmd+3` | Focus Message Stream |
| `Cmd+J` | Toggle Raw JSON View |

---

## 🏗️ Architecture

ClaudeOverseer is built with:

- **Electron** — Desktop shell with filesystem access
- **React 19 + TypeScript** — Component-based UI
- **React-Bootstrap + Bootstrap 5** — Styling and widgets
- **Vite + electron-vite** — Fast bundling and hot-reload
- **Zustand** — Lightweight state management
- **Chokidar** — File watching for live updates
- **react-markdown + remark-gfm + rehype-highlight** — Markdown rendering
- **Mermaid** — Diagram support

### Process Architecture

```
┌─────────────────────────────────────┐
│   Electron Main Process             │
│  ┌───────────────────────────────┐  │
│  │ Project Scanner               │  │
│  │ - Reads ~/.claude/projects/   │  │
│  │ - Discovers sessions/subagents│  │
│  │ - Reads team configs          │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ JSONL Watcher                 │  │
│  │ - Watches .jsonl files        │  │
│  │ - Parses new lines            │  │
│  │ - Streams via IPC             │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
              ▼ IPC
┌─────────────────────────────────────┐
│   Electron Renderer                 │
│  ┌───────────────────────────────┐  │
│  │ React App                     │  │
│  │ - Project List                │  │
│  │ - Session List                │  │
│  │ - Message Stream              │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## 🧪 Development

### Setup

```bash
# Clone the repository
git clone https://github.com/Xalior/ClaudeOverseer.git
cd ClaudeOverseer

# Install dependencies
pnpm install

# Install Playwright browsers for E2E tests
pnpm exec playwright install
```

### Run Tests

```bash
# Unit tests only (~0.3s)
pnpm run test:unit

# Integration tests only (~1.7s)
pnpm run test:integration

# E2E tests (requires build first, ~15s)
pnpm run build
pnpm run test:e2e

# All tests in sequence
pnpm run test:all

# Watch mode for development
pnpm run test:watch

# Coverage report
pnpm run test:coverage
```

**Current Test Status:** 74/74 passing
- Unit: 47 tests (parsers, formatters, team reader)
- Integration: 18 tests (project scanner, session discovery, JSONL watcher)
- E2E: 9 tests (app launch, project discovery, message stream, live watching)

### Build for Distribution

```bash
# Package without installer (for testing)
pnpm run pack

# Build macOS .dmg + .zip
pnpm run dist:mac

# Build Linux AppImage + .deb
pnpm run dist:linux

# Build Windows installer + .zip
pnpm run dist:win
```

Artifacts will be in the `dist/` directory.

---

## 📂 Project Structure

```
ClaudeOverseer/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # App entry point
│   │   ├── scanner/    # Project/session scanner
│   │   └── watcher/    # JSONL file watcher
│   ├── preload/        # Electron preload (contextBridge)
│   └── renderer/       # React UI
│       ├── components/ # React components
│       │   ├── ProjectList.tsx
│       │   ├── SessionList.tsx
│       │   └── messages/
│       │       ├── MessageStream.tsx
│       │       ├── UserMessage.tsx
│       │       ├── AssistantMessage.tsx
│       │       ├── ToolCallCard.tsx
│       │       └── TokenUsageBar.tsx
│       └── store/      # Zustand state
├── tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   ├── e2e/            # Playwright E2E tests
│   └── fixtures/       # Test data
├── docs/               # Documentation
│   └── plans/          # Implementation plans
└── resources/          # App icons and assets
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`pnpm run test:all`)
4. Commit your changes (`git commit -m 'feat: add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New features
- `fix:` — Bug fixes
- `docs:` — Documentation changes
- `test:` — Test additions or fixes
- `refactor:` — Code refactoring
- `chore:` — Build process or tooling changes

---

## 📋 Roadmap

- [x] Phase 1-2: Project scanning, session discovery, basic UI
- [x] Phase 3: JSONL parsing and message stream display
- [x] Phase 4: Live file watching with incremental updates
- [x] Phase 5: UX polish, teams support, keyboard shortcuts
- [x] Phase 6: Packaging and CI/CD
- [x] Windows support
- [ ] Message search and filtering
- [ ] Export session transcripts
- [ ] Dark/light theme toggle
- [ ] Session comparison view

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Built with [Claude Code](https://claude.com/claude-code) — the very tool it monitors.

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/Xalior/ClaudeOverseer/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Xalior/ClaudeOverseer/discussions)

---

**Made with ❤️ by the ClaudeOverseer team**
