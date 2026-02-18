# Performance: MessageStream Optimisation

## Problem

Rendering the Messages pane takes measurable seconds when switching to sessions with long threads. Every message is mounted into the DOM simultaneously — markdown parsing, syntax highlighting, and all.

---

## 1. Virtualise the message list with `@tanstack/react-virtual` — DONE

**Status:** Complete

**What:** Replace the `.map()` that renders every message with `useVirtualizer`. Only ~10-15 DOM nodes exist at any time regardless of session length.

**Changes:**
- `pnpm add @tanstack/react-virtual`
- Rewrote `MessageStream.tsx` to use `useVirtualizer` with `measureElement` for variable-height rows
- Auto-scroll uses `virtualizer.scrollToIndex()` instead of a sentinel div ref
- All existing features preserved (raw toggle, Cmd+J, session switch reset)

**Result:** A session with 126,810px of virtual height renders only 11-15 DOM nodes. Session switching is near-instant.

---

## 2. `React.memo()` on message components

**Status:** Pending

**What:** None of `UserMessage`, `AssistantMessage`, `ToolCallCard` use `React.memo()`. When `MessageStream` re-renders (new message, toggle raw, scroll), every visible child re-renders even if props haven't changed.

**Changes:**
- Wrap `AssistantMessage` in `React.memo()` — biggest win since it contains ReactMarkdown + rehype-highlight
- Wrap `UserMessage` in `React.memo()`
- Wrap `ToolCallCard` in `React.memo()`
- Stabilise callback props with `useCallback` where needed (e.g. `toggleRaw` is already done)

**Impact:** Large — prevents re-render cascade through markdown/highlight pipelines on every parent render.

---

## 3. Lazy-load raw message data

**Status:** Pending

**What:** `FormattedMessage.raw` stores the entire original `ParsedMessage` on every formatted message, roughly doubling memory. The raw view is rarely used.

**Changes:**
- Remove `raw` from `FormattedMessage`
- Store raw data in a separate `Map<uuid, ParsedMessage>` in the formatter return
- Pass raw map to `MessageStream` and look up only when user clicks "raw" on a specific message
- Alternatively, fetch raw on demand via a new IPC call `getRawMessage(sessionPath, uuid)`

**Impact:** Medium — halves the data volume passed through React props and held in query cache.

---

## 4. Memoize StatusBar cost calculation

**Status:** Pending

**What:** `StatusBar.tsx:21-25` iterates all messages to sum costs on every render. This is O(n) per render for no reason since the messages array only changes when new messages arrive.

**Changes:**
- Compute `totalCost` in the message formatter alongside `totalUsage`, or
- Wrap the cost loop in `useMemo(() => ..., [messages])` inside StatusBar

**Impact:** Small but free — avoids O(n) loop on every render.

---

## 5. Throttle scroll handler

**Status:** Pending

**What:** The scroll event handler in `MessageStream` fires on every scroll event without throttling. Minor overhead but adds up during fast scrolling through virtualised content.

**Changes:**
- Throttle the `handleScroll` callback to fire at most every ~100ms using `requestAnimationFrame` or a simple timestamp guard

**Impact:** Small — reduces scroll handler overhead during rapid scrolling.

---

## Priority Order

| # | Change | Effort | Impact | Status |
|---|--------|--------|--------|--------|
| 1 | Virtualise with react-virtual | Medium | Massive | **Done** |
| 2 | React.memo on message components | Small | Large | Pending |
| 3 | Lazy-load raw data | Small | Medium | Pending |
| 4 | Memoize StatusBar cost calc | Trivial | Small | Pending |
| 5 | Throttle scroll handler | Trivial | Small | Pending |
