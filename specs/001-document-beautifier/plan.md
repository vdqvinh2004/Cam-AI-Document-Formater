# Implementation Plan: Document Beautifier Web Refactor

**Branch**: `001-document-beautifier` | **Date**: 2026-07-29 | **Spec**: [spec.md](spec.md)

## Summary

Refactor the browser product from the monolithic `src/web/main.tsx` screen into a small multi-page SPA with focused React components, an in-memory workflow store, accessible headless UI primitives, and a macOS-inspired design system. Fix the privacy route, make preview and comparison evidence format-aware, render DOCX source/result from actual package bytes, and prevent the product from claiming a DOCX was formatted when no safe DOCX package transformation exists. PDF preview remains optional and fail-truthful.

## Technical Context

- **Language/runtime**: TypeScript, React 19, Vite 7, browser APIs; existing Yarn 1 scripts.
- **Current structure**: `src/web/main.tsx` is the single entry and owns route-less UI, workflow state, preview refs, and formatting actions. `src/web/formatting.ts`, `src/web/docx-preview.ts`, and `src/web/preview.ts` contain the primary browser logic.
- **Routing**: Add a minimal typed pathname router rather than a full routing dependency. Required routes: `/`, `/setup`, `/review`, `/settings`, `/privacy`, and not-found. Preserve `vercel.json` SPA fallback and test direct navigation/refresh.
- **UI**: Extract `AppShell`, navigation, upload, format controls, status, preview, comparison, and export components. Use one selectively adopted headless accessibility library (recommended: Radix primitives) only for interactions that benefit from tested focus/keyboard behavior. Keep the existing warm paper, restrained cards, serif display typography, green/orange accent, and macOS-like control language.
- **State**: Keep source files, result blobs, extracted text, prompts, and comparisons in memory only during the active workflow. Use a small React context/store; no document persistence.
- **DOCX**: Continue using `docx-preview` for actual package rendering and `JSZip` for safe inspection/fallback. A DOCX result is valid only when its bytes come from a real package transformation and semantic validation. Until then, show formatting unavailable and do not offer the original bytes as a formatted result.
- **Comparison**: Extend the current snapshot to distinguish content preservation, presentation changes, content changes, and unavailable evidence. Pass actual result text for TXT/Markdown and actual result bytes for DOCX. Never compare against an empty placeholder.
- **PDF**: Optional; evaluate PDF.js only after the primary refactor. If omitted, show explicit unavailable preview/comparison state.
- **Validation**: Typecheck, lint, Vitest, Playwright, and Vite build. Add route, DOCX regression, result preview, comparison, accessibility, and truthful-unavailable tests.

## Constitution Check

| Principle | Result | Evidence |
|---|---|---|
| I. Native macOS Experience | PASS | The browser keeps the existing macOS-inspired visual language and uses accessible browser controls without imitating a full desktop shell. |
| II. Privacy and User Control | PASS | Workflow documents remain in memory; only the documented API-key storage persists. Privacy route explains transmission and storage. |
| III. Reliable Document Handling | PASS | DOCX formatting claims are gated on real package transformation/validation; failed or unavailable preview states are explicit. |
| IV. Testable Quality | PASS | Route navigation, DOCX source/result bytes, comparison categories, no-404 privacy navigation, and full existing checks receive focused coverage. |
| V. Simplicity and Maintainability | PASS | Minimal route map, focused components, and selective headless primitives avoid a full visual framework and global state dependency. |

No violations requiring Complexity Tracking.

## Project Structure

```text
src/web/
  main.tsx                 # entry, route selection, shared workflow provider
  app/
    AppShell.tsx
    routes.ts
    workflow-store.tsx
    pages/
      WorkspacePage.tsx
      SetupPage.tsx
      ReviewPage.tsx
      SettingsPage.tsx
      PrivacyPage.tsx
      NotFoundPage.tsx
    components/
      AppNavigation.tsx
      FileDropzone.tsx
      FormatControls.tsx
      JobStatus.tsx
      PreviewPanel.tsx
      ComparisonSummary.tsx
      ExportActions.tsx
  docx-preview.ts
  pdf-preview.ts           # only if optional PDF phase is accepted
  preview.ts
  formatting.ts
  styles/web.css

tests/web/
  browser-product.spec.ts
  routes.test.ts
  docx-preview.test.ts
  preview.test.ts
  comparison.test.ts
  browser-boundary.test.ts
```

## Phase 0: Research Decisions

1. Confirm the active deployment uses `vercel.json` and the `dist/web` output; document SPA fallback requirements for direct `/privacy` and unknown-path loads.
2. Confirm the selected headless primitive library supports React 19, Vite tree-shaking, keyboard navigation, focus management, and current TypeScript configuration. Install only required primitives.
3. Define DOCX capability states: actual formatted/validated, preview-only, formatting unavailable, and preview unavailable. Do not silently treat the source package as output.
4. Define comparison evidence for text, Markdown, and DOCX; record PDF renderer decision as optional and non-blocking.

## Phase 1: Data Model and Contracts

1. Add typed route definitions and workflow state/context interfaces.
2. Extend preview/comparison contracts with format, status, validation, categories, human-readable summary, and meaningful rows.
3. Define component input/output contracts so pages do not directly manipulate DOCX DOM refs or formatting internals.
4. Update format adapter/preview documentation to state that actual DOCX bytes are mandatory for result preview and that unavailable formatting must block export.

## Phase 2: Routing and Application Shell

1. Replace the monolithic render path with a route resolver and shared `AppShell`.
2. Add workspace, setup, review, settings, privacy, and not-found pages.
3. Add active-route navigation, back-to-workspace recovery, headings, status landmarks, keyboard focus behavior, and responsive layout.
4. Verify `/privacy` and unknown paths under local Vite and deployed SPA fallback.

## Phase 3: Component and UI Refactor

1. Extract upload/drop handling into `FileDropzone`.
2. Extract style/instruction/disclosure controls into `FormatControls`.
3. Extract progress/errors/retry/cancel/validation into `JobStatus`.
4. Extract source/result rendering into `PreviewPanel` and export gating into `ExportActions`.
5. Add `ComparisonSummary` with badges and plain-language categories.
6. Apply the selected headless primitives selectively and update CSS for macOS-style hierarchy, clearer primary actions, reduced visual noise, responsive spacing, focus rings, and touch-sized controls.

## Phase 4: DOCX Correctness

1. Ensure source and result DOCX previews always use the corresponding package bytes and clear stale containers before rendering.
2. Remove any path that converts a successful DOCX result into plain text for preview.
3. Change `formatSource`/job result semantics so unchanged DOCX bytes are not reported as a formatted result. Keep source available and show a corrective unavailable message until safe DOCX transformation exists.
4. If implementing DOCX transformation in this feature, mutate only allowlisted OOXML presentation properties while preserving all other ZIP parts and relationships; re-extract and validate before enabling export.
5. Add fixtures/tests for headings, lists, tables, images, links, unsupported parts, malformed packages, changed bytes, and unavailable formatting.

## Phase 5: Comparison and Preview UX

1. Fix TXT/Markdown result extraction and pass actual result content into comparison.
2. Render actual formatted TXT/Markdown output rather than the current placeholder.
3. Compare semantic content independently from presentation metadata.
4. Group differences as content, typography, spacing, layout, structure, assets, or unavailable; suppress raw XML and empty-string noise.
5. Show preservation/validation status separately from presentation changes.
6. Add optional PDF.js evaluation behind a capability check; if not accepted, retain explicit unavailable state and tests.

## Phase 6: Privacy and Regression Verification

1. Add privacy-page content covering Gemini disclosure, API-key storage, in-memory document handling, and user-controlled downloads.
2. Add Playwright tests for direct navigation, footer privacy link, unknown routes, refresh, responsive layout, keyboard navigation, and workflow state messaging.
3. Add Vitest tests for route resolution, workflow state, DOCX result semantics, comparison categories, and unavailable states.
4. Run `yarn typecheck`, `yarn lint`, `yarn test`, `yarn test:e2e`, and `yarn build`.
5. Inspect browser storage after successful, failed, and refreshed workflows to verify no document contents or history persist.

## Risks and Mitigations

- **No safe DOCX writer**: Keep formatting/export unavailable rather than claiming success; implement package-preserving OOXML edits only with fixtures and round-trip checks.
- **Deployment 404**: Test the configured Vercel rewrite and route fallback independently; include a client-side not-found page.
- **UI dependency bloat**: Adopt one headless library selectively; prefer native HTML for simple controls.
- **Refresh state loss**: Explain ephemeral state in empty states; do not persist documents to “fix” navigation.
- **Unsafe preview markup**: Keep rendered DOCX output isolated and sanitize/generated markup boundaries before any new HTML insertion path.
- **PDF scope expansion**: Treat PDF rendering as optional and do not delay the primary refactor.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| None | The plan satisfies the constitution without exception. | N/A |
