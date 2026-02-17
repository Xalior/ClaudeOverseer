# Radix UI Migration Plan

## Goal
Replace Bootstrap/react-bootstrap in the renderer with Radix primitives and local chadcn-style components while preserving existing three-panel behavior, interactions, and overall dark desktop look.

## Scope
- Remove `bootstrap` and `react-bootstrap` dependencies.
- Add Radix primitives for switch and collapsible interactions.
- Introduce local UI components for cards, badges, buttons, and controls.
- Migrate project, session, message, and error-boundary components.
- Replace global styles with tokenized desktop-focused SCSS.

## Implementation Strategy
1. Create reusable UI primitives (`Badge`, `Card`, `Button`, `Switch`, `Collapsible`).
2. Port renderer components off bootstrap classes/components.
3. Rewrite `custom.scss` to style the primitives and preserve visual hierarchy.
4. Validate with TypeScript checks and UI behavior smoke testing.

## Risks
- Visual regressions in panel spacing/typography.
- Collapsible behavior differences vs Bootstrap.
- Missing utility classes previously inherited from Bootstrap.

## Validation
- `npx tsc --noEmit`
- Manual interaction smoke checks for project selection, session expansion, raw toggle, and tool card collapse sections.
