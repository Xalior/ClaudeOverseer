# Implementation Tracker: Radix UI Migration

## Metadata
- Date: 2026-02-17
- Branch: `feature/chadcn-radix-ui`
- Plan: `docs/plans/radix-ui-migration.md`

## Tasks
- [x] Create migration branch.
- [x] Add Radix primitives (`@radix-ui/react-switch`, `@radix-ui/react-collapsible`).
- [x] Add local UI layer (`src/renderer/src/components/ui/*`).
- [x] Migrate renderer components off `react-bootstrap`.
- [x] Replace global styling with custom tokenized SCSS.
- [x] Remove Bootstrap dependencies from `package.json`.
- [ ] Full project typecheck passes.

## Validation Notes
- `npx tsc --noEmit` still fails due existing repository-wide TypeScript issues unrelated to this migration (main process and legacy renderer typing issues).
- Renderer bootstrap usage removed (`react-bootstrap` imports and bootstrap SCSS import removed).

## Files Changed
- `package.json`
- `pnpm-lock.yaml`
- `src/renderer/src/App.tsx`
- `src/renderer/src/components/ErrorBoundary.tsx`
- `src/renderer/src/components/ProjectList.tsx`
- `src/renderer/src/components/SessionList.tsx`
- `src/renderer/src/components/messages/AssistantMessage.tsx`
- `src/renderer/src/components/messages/MessageStream.tsx`
- `src/renderer/src/components/messages/RawJsonView.tsx`
- `src/renderer/src/components/messages/TokenUsageBar.tsx`
- `src/renderer/src/components/messages/ToolCallCard.tsx`
- `src/renderer/src/components/messages/UserMessage.tsx`
- `src/renderer/src/components/ui/badge.tsx`
- `src/renderer/src/components/ui/button.tsx`
- `src/renderer/src/components/ui/card.tsx`
- `src/renderer/src/components/ui/collapsible.tsx`
- `src/renderer/src/components/ui/switch.tsx`
- `src/renderer/src/styles/custom.scss`
