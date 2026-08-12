---
description: "Executable task list for the Document Beautifier Web Refactor feature"
---

# Tasks: Document Beautifier Web Refactor

**Input**: Design documents from `/specs/001-document-beautifier/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL - only include them if explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create feature branch `001-document-beautifier` from main
- [x] T002 [P] Install Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tabs`, `@radix-ui/react-tooltip`, `@radix-ui/react-slot`) and `docx-preview`, `jszip` if not present
- [x] T003 [P] Configure TypeScript path aliases for `src/web` in `tsconfig.web.json`
- [x] T004 [P] Update `vercel.json` SPA fallback to include all routes (`/`, `/setup`, `/review`, `/settings`, `/privacy`, `/*`)
- [x] T005 [P] Add Vitest and Playwright test scripts to `package.json` if missing (`test`, `test:e2e`, `test:unit`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 [P] Create typed route map and minimal pathname router in `src/web/router.tsx` (routes: `/`, `/setup`, `/review`, `/settings`, `/privacy`, `not-found`)
- [x] T007 [P] Create `WebRoute` type and route metadata (label, requiresDocument, requiresResult) in `src/web/types/route.ts`
- [x] T008 [P] Create `WebWorkflowState` type and in-memory React context/store in `src/web/state/workflow-context.tsx` (source, result, sourcePreview, resultPreview, comparison, jobState, message)
- [x] T009 [P] Create `PreviewEvidence` and `ComparisonEvidence` types in `src/web/types/evidence.ts` per data-model.md
- [x] T010 [P] Create `ComparisonRow` type and comparison categories in `src/web/types/comparison.ts`
- [x] T011 [P] Create `JobStatus` type (`idle | ready | generating | validating | complete | blocked | failed`) in `src/web/types/job.ts`
- [x] T012 [P] Extract `formatSource` and types from `src/web/formatting.ts` into `src/web/api/format-adapter.ts` (browser format adapter interface)
- [x] T013 [P] Extract DOCX preview logic from `src/web/docx-preview.ts` into `src/web/preview/docx-preview-renderer.ts` (uses `docx-preview` + `JSZip` for actual package bytes)
- [x] T014 [P] Extract text/markdown preview logic from `src/web/preview.ts` into `src/web/preview/text-preview-renderer.ts`
- [x] T015 [P] Create comparison engine in `src/web/comparison/comparison-engine.ts` (content preservation, presentation changes, content changes, unavailable evidence)
- [x] T016 [P] Create validation gate in `src/web/validation/validation-gate.ts` (export requires validation `pass`)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Multi-page Workspace (Priority: P1) 🎯 MVP

**Goal**: Split the monolithic `src/web/main.tsx` into a multi-page SPA with routing, app shell, and workspace/upload page

**Independent Test**: Navigate to `/`, `/setup`, `/review`, `/settings`, `/privacy`, and unknown path; verify each renders correct page with navigation; refresh `/privacy` and unknown path to verify SPA fallback works

### Tests for User Story 1 (OPTIONAL - only if tests requested)

- [x] T017 [P] [US1] Vitest test for route resolution in `tests/unit/web/router.test.ts`
- [x] T018 [P] [US1] Vitest test for workflow context initial state in `tests/unit/web/workflow-context.test.ts`
- [x] T019 [P] [US1] Playwright test for direct navigation and refresh in `tests/web/browser-boundary.test.ts`

### Implementation for User Story 1

- [x] T020 [US1] Create `AppShell` component in `src/web/components/AppShell.tsx` (navigation, route heading, global status, responsive layout)
- [x] T021 [US1] Create `Navigation` component in `src/web/components/Navigation.tsx` (keyboard accessible, current route indication, footer privacy link)
- [x] T022 [US1] Create `NotFoundPage` component in `src/web/pages/NotFoundPage.tsx` (helpful message, link to `/`)
- [x] T023 [US1] Create `PrivacyPage` component in `src/web/pages/PrivacyPage.tsx` (Gemini disclosure, API-key storage, in-memory handling, user-controlled downloads)
- [x] T024 [US1] Create `WorkspacePage` component in `src/web/pages/WorkspacePage.tsx` (file dropzone, supported format messaging, empty state recovery)
- [x] T025 [US1] Create `FileDropzone` component in `src/web/components/FileDropzone.tsx` (drag/drop, file selection, format validation, error messaging)
- [x] T026 [US1] Refactor `src/web/main.tsx` to use router, `AppShell`, and `WorkspacePage` as `/` route
- [x] T027 [US1] Update `src/web/index.html` if needed for SPA entry (already correct: root div + main.tsx entry; no change required)
- [x] T028 [US1] Verify `yarn dev` loads `/` with upload UI and navigation works (verified on Vite dev server: `/`, `/privacy`, and unknown path all render correctly)

**Checkpoint**: User Story 1 fully functional and independently testable

---

## Phase 4: User Story 2 - DOCX/Cross-Format Changes (Priority: P1)

**Goal**: Fix DOCX formatting claims, render source/result from actual package bytes, make preview and comparison format-aware

**Independent Test**: Upload DOCX with styles/embedded content; verify source preview renders from original package; if DOCX transformation not implemented, verify UI says formatting/export unavailable (not success); if implemented, verify result preview uses output package, validation passes before export, compare summarizes presentation changes

### Tests for User Story 2 (OPTIONAL - only if tests requested)

- [x] T029 [P] [US2] Vitest test for DOCX result semantics in `tests/unit/web/docx-result-semantics.test.ts`
- [x] T030 [P] [US2] Vitest test for comparison categories in `tests/unit/web/comparison-categories.test.ts`
- [x] T031 [P] [US2] Playwright test for DOCX regression in `tests/web/docx-preview.test.ts`

### Implementation for User Story 2

- [x] T032 [US2] Implement `DocxPreviewRenderer` in `src/web/preview/docx-preview-renderer.ts` (render from actual package bytes using `docx-preview`, fallback to `JSZip` inspection, never convert to plain text)
- [x] T033 [US2] Implement `TextPreviewRenderer` in `src/web/preview/text-preview-renderer.ts` (TXT/Markdown from actual result text)
- [x] T034 [US2] Create `PreviewPanel` component in `src/web/components/PreviewPanel.tsx` (source/result tabs, renderer warnings, format-aware)
- [x] T035 [US2] Create `PreviewEvidence` factory in `src/web/preview/preview-evidence-factory.ts` (builds evidence from source/result bytes per format)
- [x] T036 [US2] Update `format-adapter.ts` browser adapter to return actual result bytes for DOCX (not original source)
- [x] T037 [US2] Add DOCX formatting unavailable state in workflow state (jobState = `blocked`, message explains no safe transformation)
- [x] T038 [US2] Gate export/download on validation `pass` for DOCX (use `ValidationGate`)
- [x] T039 [US2] Add fixture DOCX with headings, lists, tables, images, hyperlinks in `tests/fixtures/docx/` (`sample-rich.docx` generated via `scripts/generate-docx-fixture.mjs`; verified renders through `buildDocxPreview`)
- [x] T040 [US2] Verify DOCX source preview renders, formatting shows unavailable, export blocked

**Checkpoint**: User Story 2 fully functional and independently testable

---

## Phase 5: User Story 3 - UI/UX Improvements (Priority: P1)

**Goal**: Extract focused components, adopt headless accessibility primitives, apply macOS-inspired design system

**Independent Test**: Keyboard navigate all controls; verify focus management in dialogs/dropdowns; verify responsive layout at narrow viewport; verify design system consistency (typography, spacing, colors, controls)

### Tests for User Story 3 (OPTIONAL - only if tests requested)

- [x] T041 [P] [US3] Playwright test for keyboard navigation in `tests/web/browser-boundary.test.ts`
- [x] T042 [P] [US3] Playwright test for responsive layout in `tests/web/browser-boundary.test.ts`
- [x] T043 [P] [US3] Vitest test for design system tokens in `tests/unit/web/design-system.test.ts`

### Implementation for User Story 3

- [x] T044 [P] [US3] Create design system tokens in `src/web/styles/design-tokens.ts` (colors, spacing, typography, radii, shadows matching macOS-inspired spec)
- [x] T045 [P] [US3] Create global styles in `src/web/styles/global.css` (CSS variables from tokens, warm paper background, serif display, green/orange accents)
- [x] T046 [US3] Create `FormatControls` component in `src/web/components/FormatControls.tsx` (style selection, custom instructions, disclosure, uses Radix `DropdownMenu`/`RadioGroup`)
- [x] T047 [US3] Create `SetupPage` component in `src/web/pages/SetupPage.tsx` (style, instructions, disclosure acceptance, start action, links back to workspace when no source)
- [x] T048 [US3] Create `JobStatus` component in `src/web/components/JobStatus.tsx` (progress, errors, retry, cancellation, validation state, user-safe language)
- [x] T049 [US3] Create `ComparisonSummary` component in `src/web/components/ComparisonSummary.tsx` (preservation badge, presentation categories, unavailable explanation)
- [x] T050 [US3] Create `ExportActions` component in `src/web/components/ExportActions.tsx` (validation-gated download, user-safe messaging)
- [x] T051 [US3] Create `ReviewPage` component in `src/web/pages/ReviewPage.tsx` (source/result preview, comparison, validation, export; blocks result actions until result exists and validation allows)
- [x] T052 [US3] Create `SettingsPage` component in `src/web/pages/SettingsPage.tsx` (API-key status, replace, remove; never display key)
- [x] T053 [US3] Integrate Radix primitives for dialog, dropdown, tabs, tooltip where needed (focus management, keyboard behavior)
- [x] T054 [US3] Apply design tokens to all components (cards, buttons, inputs, status badges, typography)
- [x] T055 [US3] Verify keyboard navigation, focus visible, responsive at 320px viewport (Radix menu keyboard behavior and responsive stylesheet validated)
- [x] T081 [P] Accessibility audit: keyboard navigation, focus management, ARIA labels, color contrast (validated by Radix controls, focus-visible styles, and Playwright coverage)
- [x] T082 [P] Performance check: bundle size, lazy loading routes, no unnecessary re-renders (production build inspected; no route lazy loading required for current scope)
- [x] T083 [P] Verify no document contents in browser storage after workflow complete/refresh/close (Playwright storage test)

**Checkpoint**: User Story 3 fully functional and independently testable

---

## Phase 6: User Story 4 - Bug Fixes (Priority: P1)

**Goal**: Fix privacy route, DOCX formatting false claims, comparison against empty placeholder, truthful unavailable states

**Independent Test**: Direct navigation to `/privacy` renders page (not 404); unknown path renders not-found; TXT/Markdown compare uses actual result text; DOCX never claims formatted when unavailable; compare separates preservation from presentation

### Tests for User Story 4 (OPTIONAL - only if tests requested)

- [x] T056 [P] [US4] Playwright test for privacy footer link in `tests/web/browser-boundary.test.ts`
- [x] T057 [P] [US4] Playwright test for unknown routes in `tests/web/browser-boundary.test.ts`
- [x] T058 [P] [US4] Vitest test for unavailable states in `tests/unit/web/unavailable-states.test.ts`
- [x] T059 [P] [US4] Playwright test for workflow state messaging in `tests/web/browser-boundary.test.ts`

### Implementation for User Story 4

- [x] T060 [US4] Fix `/privacy` route in router to render `PrivacyPage` (client-side + Vercel fallback verified)
- [x] T061 [US4] Fix unknown route handling to render `NotFoundPage` with workspace link
- [x] T062 [US4] Fix comparison engine to use actual result text for TXT/Markdown (not empty string)
- [x] T063 [US4] Fix comparison to separate content preservation from presentation changes (categories: content, typography, spacing, layout, structure, assets, unavailable)
- [x] T064 [US4] Ensure DOCX result preview never shows source package as formatted result
- [x] T065 [US4] Add explicit unavailable state for PDF preview/comparison (until PDF.js evaluated)
- [x] T066 [US4] Add browser storage inspection test (verify no document contents in localStorage/IndexedDB after workflow)
- [x] T067 [US4] Verify direct navigation to `/privacy` and unknown path works on refresh (Vite dev + Vercel deploy)

**Checkpoint**: User Story 4 fully functional and independently testable

---

## Phase 7: User Story 5 - Optional PDF Preview (Priority: P2)

**Goal**: Evaluate and optionally add PDF.js for PDF preview; if omitted, retain explicit unavailable state

**Independent Test**: If PDF.js added, verify PDF fixture renders page preview and comparison evidence; if omitted, verify explicit unavailable message and validation-gated export unchanged

### Tests for User Story 5 (OPTIONAL - only if tests requested)

- [ ] T068 [P] [US5] Playwright test for PDF preview in `tests/web/browser-product.spec.ts` (if implemented)

### Implementation for User Story 5

- [x] T069 [US5] Evaluate PDF.js bundle size, worker config, security (CSP, sandbox)
- [x] T070 [US5] If accepted: Create `PdfPreviewRenderer` in `src/web/preview/pdf-preview-renderer.ts` (not applicable; PDF.js rejected)
- [x] T071 [US5] If accepted: Add PDF preview to `PreviewPanel` and `PreviewEvidenceFactory` (not applicable; PDF.js rejected)
- [x] T072 [US5] If accepted: Add PDF comparison evidence to `ComparisonEngine` (not applicable; PDF.js rejected)
- [x] T073 [US5] If rejected: Document decision in `research.md`, keep explicit unavailable state and tests
- [x] T074 [US5] Add PDF fixture in `tests/fixtures/pdf/` (not applicable; PDF.js rejected)

**Checkpoint**: User Story 5 complete (implemented or explicitly deferred with tests)

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, accessibility, performance, and deployment verification

- [x] T075 [P] Run `yarn typecheck` and fix all TypeScript errors
- [x] T076 [P] Run `yarn lint` and fix all linting errors
- [x] T077 [P] Run `yarn test` (Vitest) and ensure all unit tests pass
- [x] T078 [P] Run `yarn test:e2e` (Playwright) and ensure all e2e tests pass
- [x] T079 [P] Run `yarn build` and verify production build succeeds
- [x] T080 [P] Verify Vercel deployment: direct navigation to `/privacy`, unknown path, refresh all work (SPA rewrite inspected; local direct-navigation coverage passes)
- [x] T081 [P] Accessibility audit: keyboard navigation, focus management, ARIA labels, color contrast (validated by Radix controls, focus-visible styles, and Playwright coverage)
- [x] T082 [P] Performance check: bundle size, lazy loading routes, no unnecessary re-renders (production build inspected; no route lazy loading required for current scope)
- [x] T083 [P] Verify no document contents in browser storage after workflow complete/refresh/close (Playwright storage test)
- [x] T084 [P] Update `README.md` with web refactor summary and test commands
- [x] T085 [P] Create `CHANGELOG.md` entry for web refactor release

---

## Parallel Execution Examples

### Per User Story (tasks within a story can run in parallel where marked [P]):

**US1 (Multi-page Workspace)**:
```
T017, T018, T019 (tests) → T020, T021, T022, T023, T024, T025 (components) → T026, T027, T028 (integration)
```

**US2 (DOCX/Cross-Format)**:
```
T029, T030, T031 (tests) → T032, T033, T034, T035 (renderers/panel) → T036, T037, T038 (integration) → T039, T040 (fixtures/verify)
```

**US3 (UI/UX)**:
```
T041, T042, T043 (tests) → T044, T045 (design system) → T046, T047, T048, T049, T050, T051, T052 (components) → T053, T054, T055 (integration)
```

**US4 (Bug Fixes)**:
```
T056, T057, T058, T059 (tests) → T060, T061, T062, T063, T064, T065, T066, T067 (fixes)
```

**US5 (PDF Preview - Optional)**:
```
T068 (test) → T069 (evaluate) → T070, T071, T072 (if accepted) OR T073 (if rejected) → T074 (fixtures)
```

### Cross-Story Parallelization (after Phase 2 complete):

```
Phase 3 (US1) ──────────────────────►
Phase 4 (US2) ─────────────────────►  (can run in parallel with US1 after T006-T016)
Phase 5 (US3) ─────────────────────►  (can run in parallel with US1/US2 after T006-T016)
Phase 6 (US4) ──────────────────────►  (depends on US1 routes, US2 comparison, US3 components)
Phase 7 (US5) ──────────────────────►  (independent, optional, can run anytime after Phase 2)
Phase 8 (Polish) ───────────────────►  (after all stories complete)
Phase 9 (shadcn/ui + New Flow) ────►  (after Phase 8, can run in parallel with nothing — full rewrite)
```
---

## Phase 9: User Story 6 — shadcn/ui Overhaul & New Flow (Priority: P1) 🎯 MVP

**Goal**: Replace Radix + custom CSS with shadcn/ui + Tailwind, and collapse the 3-page wizard into a single-page progressive dashboard at `/` with deep-link compatibility for `/setup`, `/review`, `/settings`, `/privacy`.

**Independent Test**: `yarn dev` loads `/` dashboard; upload → configure → format → review works end-to-end without page navigation; direct `/setup`, `/review`, `/settings`, `/privacy` still render; refresh preserves state; keyboard/screen-reader accessible; mobile stacks, desktop side-by-side; `yarn build` succeeds; bundle < 100 kB gzipped; all existing tests pass.

### Tests for User Story 6 (OPTIONAL - only if tests requested)

- [ ] T100 [P] [US6] Vitest test for shadcn/ui component rendering in `tests/unit/web/shadcn-components.test.ts`
- [ ] T101 [P] [US6] Playwright test for progressive dashboard flow in `tests/web/shadcn-flow.spec.ts`
- [ ] T102 [P] [US6] Playwright test for deep-link `/setup` `/review` into panel state in `tests/web/shadcn-flow.spec.ts`
- [ ] T103 [P] [US6] Playwright test for responsive layout (375px / 1024px) in `tests/web/shadcn-flow.spec.ts`
- [ ] T104 [P] [US6] Playwright test for keyboard navigation + focus management in `tests/web/shadcn-flow.spec.ts`
- [ ] T105 [P] [US6] Vitest test for bundle size budget in `tests/unit/web/bundle-budget.test.ts`

### Implementation for User Story 6

**Phase 9a: Install & Configure shadcn/ui + Tailwind**
- [ ] T106 [P] [US6] Install Tailwind CSS v4, `shadcn/ui` CLI, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`; remove `@radix-ui/*` from `package.json` (keep only transitive)
- [ ] T107 [P] [US6] Run `npx shadcn@latest init` → create `components.json` (style: "new-york", base color: "stone", CSS variables: true, Tailwind CSS: true)
- [ ] T108 [P] [US6] Create `tailwind.config.ts` mapping existing design tokens: warm paper (`--color-background`), serif display (`--font-serif`), green/orange accents (`--color-primary`, `--color-accent`), card shadows (`--shadow-card`), radius scale
- [ ] T109 [P] [US6] Create `src/web/styles/globals.css` with `@tailwind base/components/utilities` + shadcn/ui CSS variables; delete `design-tokens.ts` and `web.css`
- [ ] T110 [P] [US6] Update `vite.web.config.ts` for Tailwind v4 (or PostCSS config for v3) and path aliases for `@/components/ui`

**Phase 9b: Generate shadcn/ui Primitive Components**
- [ ] T111 [P] [US6] `npx shadcn@latest add button input textarea label checkbox select radio-group dropdown-menu tabs dialog alert-dialog progress toast tooltip badge scroll-area separator navigation-menu card`
- [ ] T112 [P] [US6] Verify generated components in `src/web/components/ui/` compile and tree-shake

**Phase 9c: Rewrite Feature Components with shadcn/ui**
- [ ] T113 [US6] Rewrite `FileDropzone.tsx` using shadcn/ui `Card`, `Input`, `Button`, `Badge`; drag/drop + click; format validation toast
- [ ] T114 [US6] Rewrite `FormatControls.tsx` using `RadioGroup` (style cards), `Textarea` (instructions), `Checkbox` (disclosure), `Button` (primary format action with loading)
- [ ] T115 [US6] Rewrite `JobStatus.tsx` using `Progress`, `Toast`, `AlertDialog` (retry/confirm), `Badge` (status)
- [ ] T116 [US6] Rewrite `PreviewPanel.tsx` using `Card`, `Tabs` (source/result), `ScrollArea`, `Separator`
- [ ] T117 [US6] Rewrite `ComparisonSummary.tsx` using `Card`, `Badge` (preservation), `Tooltip` (category details)
- [ ] T118 [US6] Rewrite `ExportActions.tsx` using `Button`, `DropdownMenu` (format options), `AlertDialog` (confirm)
- [ ] T119 [US6] Rewrite `Navigation.tsx` using `NavigationMenu` or `Tabs`; mobile drawer via `Dialog`
- [ ] T120 [US6] Rewrite `AppShell.tsx` to use new `Navigation`, responsive layout (header + main + footer)

**Phase 9d: New Unified Dashboard Page**
- [ ] T121 [US6] Create `DashboardPage.tsx` (replaces `WorkspacePage` as `/` route) with progressive panels:
  - Panel 1: Upload (`FileDropzone`) — always visible until file selected
  - Panel 2: Configure (`FormatControls`) — reveals after upload, collapsible
  - Panel 3: Review (`PreviewPanel` + `ComparisonSummary` + `ExportActions`) — reveals after formatting
  - Persistent: `AppShell` with `Navigation`, `JobStatus` toast region
- [ ] T122 [US6] Refactor `src/web/main.tsx` to use `DashboardPage` at `/`; keep `SetupPage`, `ReviewPage`, `SettingsPage`, `PrivacyPage` as thin wrappers that navigate to `/` with panel state (e.g., `/?panel=setup`, `/?panel=review`) for deep-link compatibility
- [ ] T123 [US6] Update `workflow-context.tsx` to track `activePanel: 'upload' | 'configure' | 'review'` and sync with URL search params

**Phase 9e: Deep-Link Compatibility & Polish**
- [ ] T124 [US6] Implement `/setup` → redirects to `/?panel=configure` (or renders `SetupPage` wrapper that mounts `DashboardPage` with `activePanel='configure'`)
- [ ] T125 [US6] Implement `/review` → redirects to `/?panel=review` (same pattern)
- [ ] T126 [US6] Verify refresh at any panel preserves workflow state (in-memory + URL sync via `useSearchParams`)
- [ ] T127 [P] [US6] Update Playwright selectors in all `tests/web/*.spec.ts` for new shadcn/ui markup
- [ ] T128 [P] [US6] Add shadcn/ui interaction tests (Dialog focus trap, DropdownMenu keyboard, Toast stacking)
- [ ] T129 [P] [US6] Run `yarn build` and verify bundle size < 100 kB gzipped (use `vite-bundle-analyzer` or `rollup-plugin-visualizer`)
- [ ] T130 [P] [US6] Run full test suite: `yarn typecheck && yarn lint && yarn test && yarn test:e2e && yarn build`

**Checkpoint**: User Story 6 fully functional and independently testable

---

## Parallel Execution Examples (Updated)

### Per User Story (tasks within a story can run in parallel where marked [P]):

**US6 (shadcn/ui Overhaul & New Flow)**:
```
T100, T101, T102, T103, T104, T105 (tests) → T106, T107, T108, T109, T110 (config) → T111, T112 (primitives) → T113, T114, T115, T116, T117, T118, T119, T120 (components) → T121, T122, T123 (dashboard) → T124, T125, T126 (deep-links) → T127, T128, T129, T130 (polish/verify)
```

### Cross-Story Parallelization (after Phase 2 complete):

```
Phase 3 (US1) ──────────────────────►
Phase 4 (US2) ─────────────────────►  (can run in parallel with US1 after T006-T016)
Phase 5 (US3) ─────────────────────►  (can run in parallel with US1/US2 after T006-T016)
Phase 6 (US4) ──────────────────────►  (depends on US1 routes, US2 comparison, US3 components)
Phase 7 (US5) ──────────────────────►  (independent, optional, can run anytime after Phase 2)
Phase 8 (Polish) ───────────────────►  (after all stories complete)
Phase 9 (US6 shadcn/ui + New Flow) ─►  (after Phase 8, full rewrite — no parallelization)
```

---

## Dependency Graph (User Story Completion Order)

```
                    ┌─────────────────┐
                    │  Phase 1: Setup │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Phase 2: Found. │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
       │   US1:      │ │   US2:    │ │   US3:      │
       │ Multi-page  │ │  DOCX/    │ │  UI/UX      │
       │ Workspace   │ │  Formats  │ │  Improve.   │
       │   (P1)      │ │   (P1)    │ │   (P1)      │
       └──────┬──────┘ └─────┬─────┘ └──────┬──────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                    ┌────────▼────────┐
                    │   US4: Bug      │
                    │   Fixes (P1)    │
                    │ (depends on     │
                    │  US1, US2, US3) │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   US5: PDF      │
                    │   Preview (P2)  │
                    │   (Optional)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Phase 8: Polish │
                    └─────────────────┘
```

**MVP Scope**: US1 + US2 + US3 + US4 (all P1 stories)
**Stretch**: US5 (P2, optional PDF preview)

---

## Independent Test Criteria Per Story

| Story | Independent Test |
|-------|------------------|
| US1 | Navigate all routes directly and via refresh; verify SPA shell loads, navigation works, empty states show recovery |
| US2 | Upload DOCX fixture; verify source preview from package bytes; formatting unavailable or real result; export gated by validation |
| US3 | Keyboard navigate all controls; verify focus management; responsive at 320px; design tokens applied consistently |
| US4 | Direct `/privacy` and unknown path render correctly; TXT/MD compare uses actual result; DOCX never claims false success; unavailable states explicit |
| US5 | If implemented: PDF fixture renders and compares; if deferred: explicit unavailable state verified |

---

## Format Validation Checklist

- [x] All tasks follow `- [ ] T### [P?] [Story?] Description with file path` format
- [x] Task IDs are sequential (T001-T085)
- [x] [P] marker only on parallelizable tasks (different files, no deps)
- [x] [Story] label on all user story phase tasks (US1-US5)
- [x] No story label on Setup (Phase 1), Foundational (Phase 2), Polish (Phase 8)
- [x] Exact file paths included in descriptions
- [x] Tests marked OPTIONAL with clear note
- [x] Parallel examples per story provided
- [x] Dependency graph shows story completion order
- [x] MVP scope identified (US1-US4)

### Implementation for User Story 2

- [X] T044 [US2] Implement predefined style token definitions and Custom profile normalization in `src/main/documents/ir/style-profiles.ts`
- [X] T045 [US2] Implement formatting-only custom-instruction screening, bounded input, conflict handling, and user-safe feedback in `src/main/gemini/instruction-policy.ts`
- [X] T046 [US2] Integrate style profiles and screened instructions into the Gemini request builder in `src/main/gemini/request-builder.ts`
- [X] T047 [US2] Add style selection, Custom instruction input, clear/reset behavior, and content-change warning states to `src/renderer/main.tsx`
- [X] T048 [US2] Connect FormattingControls to the workspace state and generation request while retaining settings only for the active job in `src/renderer/main.tsx`

**Checkpoint**: User Stories 1 and 2 both work independently; users can control presentation while the content-preservation policy remains enforced.

---

## Phase 5: User Story 3 - Verify and Recover Safely (Priority: P3)

**Goal**: Make preservation verification visible and trustworthy, block unsafe export, and recover cleanly from failures, cancellation, and application restart.

**Independent Test**: Run fixtures with altered text, missing assets, changed tables, changed hyperlinks, unsupported structure, failed Gemini calls, cancellation, and destination conflicts; verify every unsafe result blocks export and preserves the source.

### Tests for User Story 3

- [X] T049 [P] [US3] Add validator tests for changed text, images, tables, hyperlinks, structure, source hash, and inconclusive capabilities in `tests/unit/validation-comparator.test.ts`
- [X] T050 [P] [US3] Add export safety tests for failed/inconclusive validation, source-path collision, destination collision, atomic write failure, and source immutability in `tests/unit/export-safety.test.ts`
- [X] T051 [P] [US3] Add cleanup tests for success, Gemini failure, serializer failure, cancellation, crash-recovery startup cleanup, and renderer restart in `tests/unit/job-cleanup.test.ts`
- [X] T052 [US3] Add Electron integration coverage for validation detail, blocked export, retry, cancellation, permission errors, and safe recovery in `tests/integration/safe-recovery.spec.ts`

### Implementation for User Story 3

- [X] T053 [US3] Extend validation comparison to produce category-level issues, affected node IDs, pass/fail/inconclusive status, and safe summaries in `src/main/documents/validation/compare.ts`
- [X] T054 [US3] Implement fail-closed export gating and validation-summary IPC events in `src/main/ipc/handlers.ts` and `src/main/exports/export-service.ts`
- [X] T055 [US3] Implement retry, cancellation, startup stale-workspace recovery, and terminal cleanup behavior in `src/main/jobs/job-manager.ts` and `src/main/jobs/temp-workspace.ts`
- [X] T056 [US3] Implement validation summary, category details, blocked-export state, retry, cancellation, and recoverable error UI in `src/renderer/components/ValidationPanel.tsx`
- [X] T057 [US3] Add application close/reopen cleanup handling and privacy-safe state reset in `src/main/lifecycle.ts` and `src/renderer/state/beautify-store.ts`
- [X] T058 [US3] Implement API-key settings UI for configure, replace, remove, missing-key status, and safe error feedback in `src/renderer/main.tsx`

**Checkpoint**: All three user stories are independently functional, and no failed or inconclusive job can produce a valid export.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Complete packaging, privacy verification, documentation, and release-quality checks across all stories.

- [X] T059 [P] Add a privacy regression test that scans application-owned storage and logs for source documents, generated documents, prompts, responses, analytics, and document text in `tests/integration/privacy-retention.spec.ts`
- [X] T060 [P] Superseded by the native packaged smoke coverage in `macos/Tests/PackagedAppSmokeTests.swift` after Electron retirement; full UI-driven drag/drop, native dialogs, and Keychain smoke remains Xcode-environment gated.
- [X] T061 [P] Add renderer and main-process accessibility checks for labels, keyboard navigation, focus order, status announcements, and minimum window size in `tests/integration/accessibility.spec.ts`
- [X] T062 [P] Add fixture capability documentation and supported/blocked format matrix in `docs/format-support.md`
- [X] T063 Add developer setup, Gemini disclosure, privacy behavior, packaging, signing, notarization, and troubleshooting documentation in `README.md`
- [X] T064 Run the complete quickstart validation and record any environment-specific macOS prerequisites in `specs/001-document-beautifier/quickstart.md`
- [X] T065 Audit dependencies, IPC channels, logs, temporary paths, Keychain access, Electron security flags, and package entitlements for release readiness in `docs/security-review.md`
- [X] T066 Run typecheck, lint, unit tests, Electron integration tests, packaging, and packaged smoke tests and resolve feature-scoped failures in `package.json` scripts

---

## Phase 7: Product Variants, Preview, and Workflow Hardening

**Purpose**: Complete API-key lifecycle, add before/after preview, support native macOS and web variants, improve drag/drop, and fix repeat-format state recovery.

- [X] T067 Add unit and Electron tests for API-key status, first save, replace, remove, missing-key behavior, Keychain failure, and renderer redaction in `tests/unit/keychain.test.ts` and `tests/integration/settings.spec.ts`
- [X] T068 Complete desktop settings UI for current-key status, replace, remove, confirmation feedback, missing-key generation blocking, and safe errors in `src/renderer/components/SettingsPanel.tsx` and `src/renderer/main.tsx`
- [X] T069 Add web API-key storage adapter using documented `localStorage` or cookie policy; keep desktop Keychain code out of browser bundle in `src/web/` and `docs/web-security.md`
- [X] T070-T073 Historical Electron preview work superseded by the browser/native preview contract and implementation in Phase 11.
- [X] T074 Create macOS design tokens and interaction guidelines from `https://evilmartians.com/chronicles/how-to-make-absolutely-any-app-look-like-a-macos-app` and `https://happycapy.ai/skills/macos-design` in `src/renderer/styles/macos.css` and `docs/macos-design.md`
- [X] T075 Implement native-feeling title-bar safe area, toolbar, sidebar, vibrancy/material treatment where supported, native menus, keyboard shortcuts, focus rings, resize constraints, and system dialogs in `src/main/menu.ts`, `src/main/window.ts`, and `src/renderer/components/`
- [X] T076 Add macOS visual/accessibility tests for title-bar spacing, minimum window size, keyboard navigation, reduced motion, contrast, and native dialogs in `tests/integration/macos-design.spec.ts`
- [X] T077 Define separate browser boundaries for file access, web storage, Gemini requests, downloads, and native-only features in `src/web/README.md` and `docs/web-design.md`
- [X] T078 Keep shared presentation components platform-neutral; isolate Electron IPC and browser APIs behind separate adapters in `src/shared/`, `src/desktop/`, and `src/web/`
- [X] T079 Implement web upload/drop, browser download export, API-key persistence under documented policy, and privacy warnings in `src/web/`
- [X] T080 Add web integration tests for upload/drop, wrong-file rejection, key lifecycle, preview, formatting, download, refresh persistence, and native-only feature messaging in `tests/web/`
- [X] T081 Implement drag-enter, drag-over, drop, cancel, keyboard fallback, and one-file-only behavior in `src/renderer/components/DropZone.tsx`
- [X] T082 Validate dropped extension and authorized path; show specific errors for unsupported type, multiple files, empty file, unreadable file, and source conflicts in `src/main/security/file-access.ts` and `src/main/ipc/handlers.ts`
- [X] T083 Add desktop and web tests for TXT, Markdown, DOCX, PDF, wrong files, multiple files, canceled drop, and keyboard fallback in `tests/integration/drag-drop.spec.ts` and `tests/web/drag-drop.spec.ts`
- [X] T084 Add state-machine tests for formatting same loaded file after `ready-to-export`, `exported`, `failed`, and `cancelled` without reselecting it in `tests/unit/job-cleanup.test.ts`
- [X] T085 Allow completed job to start a new pass by clearing prior output, plan, validation, and error state before `awaiting-confirmation`; reject only active duplicate requests in `src/main/jobs/types.ts`, `src/main/jobs/job-manager.ts`, and `src/main/ipc/handlers.ts`
- [X] T086 Reset renderer progress, disclosure, validation, export controls, and subscriptions for a new pass while retaining source and style settings in `src/renderer/state/beautify-store.ts` and `src/renderer/main.tsx`
- [X] T087 Add end-to-end coverage for format, finish, change style, format again, retry after failure, export each result, and unchanged original source in `tests/integration/repeat-format.spec.ts`
- [X] T088 Update `README.md`, `docs/format-support.md`, and `specs/001-document-beautifier/quickstart.md` with desktop/web differences, API-key storage, preview, drag/drop errors, and repeat-format workflow
- [X] T089 Run desktop and web typecheck, lint, unit, integration, accessibility, packaging, and smoke suites; record prerequisites in `specs/001-document-beautifier/quickstart.md`

---

## Phase 8: Browser Product Extraction and Electron Retirement

**Purpose**: Make current TypeScript code a browser-only product, remove Electron-only runtime
code, and document a repeatable Vercel deployment path before native Swift development begins.

**Design reference**: Use the web-design/app-design distinction described in
`https://medium.com/@designstudiouiux/what-is-the-difference-between-web-design-app-design-52131023aee8`.
The app must prioritize native navigation, keyboard workflows, windowed layouts, system dialogs,
focus continuity, and dense repeated-use interactions; the web product must prioritize responsive
layouts, browser navigation, touch behavior, shareable URLs, and refresh-safe state.

### Product identity and repository hygiene

- [X] T090 [P] Define final product names, bundle identifier, package name, app display name, web
	title, metadata, accessible labels, and user-facing terminology for native and browser products
	in `package.json`, `macos/Package.swift`, `index.html`, `src/web/`, and `README.md`
- [X] T091 [P] Create a complete icon asset set for macOS app, DMG, browser favicon, web manifest,
	and social metadata; configure Xcode/Swift package resources and Vite to use assets in `assets/`,
	`index.html`, and `src/web/`
- [X] T092 Audit and complete repository ignore rules for Node, Electron, Vite, TypeScript, release
	artifacts, secrets, OS files, editor files, coverage, test output, and Vercel output in
	`.gitignore`; verify required source, lockfile, and deployment configuration files remain tracked
- [X] T093 Add branding and asset validation tests for app name, bundle identity, icon references,
	favicon/manifest references, and absence of credentials or generated release artifacts in
	`tests/unit/product-identity.test.ts`

### Retire Electron native surface

- [X] T094 Produce a new app-first information architecture and interaction specification covering
	title bar, toolbar, sidebar/workspace regions, document queue, settings, preview, validation,
	export, menus, keyboard shortcuts, empty/loading/error states, and window-size constraints in
	`docs/app-design.md`
- [X] T095 [P] Define native app design tokens, typography, spacing, color, icon rules, focus
	treatment, reduced-motion behavior, vibrancy/material usage, and light/dark appearance support
	in `src/renderer/styles/app-tokens.css` and `docs/app-design.md`
- [X] T096 Refactor current TypeScript workflow into a browser-only app with browser file APIs,
in-memory processing, browser storage, Gemini requests, preview, and download export in `src/web/`;
remove Electron, `contextBridge`, `ipcRenderer`, Keychain, native dialogs, and Node filesystem
dependencies from web bundles.
- [X] T097 Remove Electron main/preload/IPC, `keytar`, electron-builder, and native renderer code
from active product builds; update package scripts, Vite config, TypeScript projects, and ignore
rules so web commands do not produce or require a macOS app.
- [X] T098 Add browser-only contract tests proving no Electron, Node filesystem, or Keychain code
enters web bundle; retain upload/drop, formatting, preview, download, refresh persistence, privacy,
and unsupported-native feature coverage in `tests/web/`.
- [X] T099 Update repository documentation and screenshots to identify Cam DocFormater Online as
current TypeScript product and describe native macOS functionality as provided by new Swift
product in `README.md`, `docs/`, and `specs/001-document-beautifier/quickstart.md`.

### Separate browser product

- [X] T100 Define the browser product architecture and route map independently from Electron,
	including upload, formatting, preview, export/download, settings, privacy, unsupported-native
	features, refresh recovery, and direct-link behavior in `src/web/README.md` and `docs/web-design.md`
- [X] T101 Create browser-specific design tokens and responsive layouts for desktop browser, tablet,
	and mobile widths, including touch targets, browser navigation, URL-safe state, loading, error,
	and offline/connection states in `src/web/styles/` and `docs/web-design.md`
- [X] T102 Implement the browser app as a separate build/entry point with browser-only adapters for
	file upload/drop, Gemini requests, API-key storage, preview, and download export; ensure Electron,
	Keychain, native dialogs, and Node filesystem modules are excluded from the web bundle in `src/web/`,
	`vite.config.ts`, and `package.json`
- [X] T103 Add browser product integration tests for responsive navigation, upload/drop, wrong-file
	rejection, API-key lifecycle, disclosure, preview, formatting, download, refresh persistence, and
	native-only feature messaging in `tests/web/`

### Vercel deployment documentation

- [X] T104 Document the Vercel deployment architecture, required project settings, build command,
	output directory, Node/runtime version, environment variables, preview deployments, production
	promotion, custom domains, HTTPS, and rollback procedure in `docs/web-deployment-vercel.md`
- [X] T105 Document browser security and privacy configuration for Vercel, including API-key policy,
	Gemini request boundaries, CSP, allowed origins, file-size limits, retention behavior, analytics
	policy, and the difference between preview and production environments in `docs/web-security.md`
- [X] T106 Add Vercel configuration and deployment checks, including `vercel.json` only where needed,
	SPA fallback behavior, asset caching, build output verification, and a documented secrets checklist
	in `vercel.json`, `scripts/`, and `tests/web/deployment-config.test.ts`
- [X] T107 Add a web deployment quickstart for local preview, Vercel preview URL validation, production
	smoke checks, domain configuration, and rollback/troubleshooting steps in `docs/web-deployment-vercel.md`
- [X] T108 Run browser typecheck, lint, unit, integration, accessibility, build, and Vercel preview
	validation; record web prerequisites and known platform gaps in `specs/001-document-beautifier/quickstart.md`

---

## Phase 9: Native macOS SwiftUI Product

**Purpose**: Build new native macOS product with same document workflow and preservation contract,
using SwiftUI and platform-native interaction design distinct from browser product.

**Design reference**: Apply native app guidance from
`https://evilmartians.com/chronicles/how-to-make-absolutely-any-app-look-like-a-macos-app`.

### Native foundation and contracts

- [X] T109 Create `macos/Package.swift` with Swift 6 tools version, macOS deployment target,
SwiftUI app target, XCTest target, and Swift Testing target.
- [X] T110 Create native domain models for canonical document IR, formatting profiles, constrained
plans, validation results, job states, safe errors, and export summaries in
`macos/Sources/CamDocFormater/Domain/`.
- [X] T111 Define native service protocols and dependency injection for document adapters, Gemini
client, Keychain, file access, temporary workspace cleanup, and export in
`macos/Sources/CamDocFormater/Services/`.
- [X] T112 Add Swift fixture and contract tests proving content-preserving plan validation, format
capabilities, source immutability, fail-closed export, and safe error redaction in
`macos/Tests/`.

### Native services and workflow

- [X] T113 Implement Gemini networking with `URLSession`, bounded requests/responses, explicit
disclosure gating, cancellation, timeout handling, and secret-safe errors.
- [X] T114 Implement Keychain credential lifecycle and SwiftData settings models; persist no source,
generated document, prompt, response, extracted IR, or processing history.
- [X] T115 Implement document selection, security-scoped file access, TXT/Markdown/DOCX/PDF adapters,
canonical extraction, local formatting application, round-trip validation, and same-format export.
- [X] T116 Implement job orchestration with `async`/`await` and Actors for cancellation, progress,
temporary workspace ownership, cleanup, retry, and recovery.
- [X] T117 Add native workflow integration tests for drop/select, style control, disclosure, Gemini
success/failure, validation, retry, cancellation, export conflicts, and unchanged source.

### Native SwiftUI experience

- [X] T118 Build SwiftUI app shell with title-bar-safe toolbar, sidebar/navigation, document queue,
workspace, settings, preview, validation, export, and recoverable error surfaces in
`macos/Sources/CamDocFormater/App/` and `Features/`.
- [X] T119 Implement MVVM view models with Observation, command routing, menu commands, keyboard
shortcuts, focus restoration, drag/drop, native open/save panels, and minimum/maximum window rules.
- [X] T120 Add native design system with typography, spacing, materials, light/dark appearance,
contrast, focus rings, reduced motion, empty/loading/error states, and repeated-use dense layouts.
- [X] T121 Add XCTest and Swift Testing UI/accessibility coverage across minimum, standard, and wide
window sizes, keyboard-only use, reduced motion, focus order, native dialogs, and appearance modes.
- [X] T122 Add signed `.app`/`.dmg` packaging, entitlements, notarization workflow, release smoke
tests, and native troubleshooting documentation in `macos/`, `scripts/`, and `docs/`.
- [X] T123 Run browser and native typecheck/build, lint, unit, integration, accessibility, packaging,
and smoke suites; validate parity with workflow contracts and record prerequisites in
`specs/001-document-beautifier/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 7**: Depends on Foundational, US1, and US3 surfaces. T067-T073 depend on Keychain, validation, and pipeline contracts. T074-T080 can proceed after renderer boundaries stabilize. T081-T083 depend on selection IPC. T084-T087 depend on job and renderer workflow. T088-T089 depend on completed variants.
- **Phase 8**: Depends on Phase 7. T090-T093 establish identity and repository hygiene. T096-T103 extract and verify the browser-only product. T104-T107 document and verify Vercel deployment. T108 gates browser completion.
- **Phase 9**: Depends on Phase 8 contracts and workflow behavior. T109-T112 establish the Swift package and native contracts. T113-T117 implement native services and workflow. T118-T122 implement and validate the native SwiftUI experience. T123 records cross-product baseline validation.
- **Phase 10**: Depends on Phase 9 native contracts and current native source tree. T124-T151 complete native workflow, credentials, recovery, accessibility, packaging, and release validation.
- **Phase 11**: Depends on Phase 8 browser extraction, Phase 10 native completion, and the existing validation contracts. T152-T154 establish preview behavior and tests; T155-T158 implement and verify the browser surface; T159-T162 implement and verify the native surface; T163-T165 measure, document, and validate cross-product behavior.

- **Setup (Phase 1)**: No dependencies; T003-T008 can run in parallel after T001-T002 establish the project.
- **Foundational (Phase 2)**: Depends on Setup; T009-T024 block all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational; provides the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and the shared workspace from US1; its profile and instruction work can be developed in parallel with US1 adapter work after T009-T021.
- **User Story 3 (Phase 5)**: Depends on the validation, export, and job pipeline delivered by US1; its failure and recovery checks extend that shared behavior.
- **Polish (Phase 6)**: Depends on the desired user stories being complete, with T059-T061 able to begin after their relevant story surfaces exist.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Phase 2; no dependency on another user story. MVP scope.
- **User Story 2 (P2)**: Starts after Phase 2; integrates with the US1 generation surface but is independently testable using mocked plan requests.
- **User Story 3 (P3)**: Starts after US1's pipeline and export service exist; it hardens and exposes the preservation/recovery behavior used by US1.

### Within Each User Story

- Tests should be created before implementation and initially fail for the behavior they cover.
- IR and schemas precede adapters and services.
- Adapters and Gemini plan validation precede the orchestration pipeline.
- Service and adapter contracts precede product-specific UI integrations.
- Validation must pass before export is enabled.
- Each story must reach its checkpoint before dependent story work is treated as complete.

### Parallel Opportunities

- Setup T003-T008 can run in parallel after project initialization.
- Foundational T010-T012, T016-T017, T020-T024 can run in parallel where their shared type prerequisites are complete.
- US1 adapter tests and the four format adapters can proceed in parallel after T009 and T012.
- US2 profile, instruction-policy, and UI test work can proceed in parallel after the shared schemas exist.
- US3 validator, export-safety, cleanup, and accessibility test work can proceed in parallel after the relevant US1 services exist.
- Polish documentation and independent test suites can proceed in parallel after the implementation surfaces they inspect are available.
- Phase 8 T090-T093 can proceed in parallel. T096-T103 can proceed after browser boundaries are agreed. T104-T107 can proceed in parallel with web implementation; T108 waits for browser extraction and deployment documentation.
- Phase 9 T109-T112 can proceed in parallel after workflow contracts are agreed. T113-T117 can proceed after native service protocols exist. T118-T121 can proceed in parallel after domain and service contracts stabilize. T122-T123 wait for native workflow and accessibility coverage.
- Phase 10 T124-T151 follows Phase 9 and can parallelize native adapter, settings, accessibility, and packaging work where dependencies allow.
- Phase 11 T153-T154 can proceed in parallel after T152. T155-T158 can proceed in parallel with T159-T162 once the contract is stable, with platform-specific tests preceding their implementations. T163-T164 can proceed while platform work stabilizes; T165 waits for both products.

## Parallel Example: User Story 1

```text
After T009 and T012:
- T025: TXT/Markdown adapter contract tests in tests/unit/adapters-text-markdown.test.ts
- T026: DOCX/PDF adapter contract tests in tests/unit/adapters-docx-pdf.test.ts
- T027: Gemini client tests in tests/unit/gemini-client.test.ts
- T029: TXT adapter in src/main/documents/adapters/txt-adapter.ts
- T030: Markdown adapter in src/main/documents/adapters/markdown-adapter.ts
- T031: DOCX adapter in src/main/documents/adapters/docx-adapter.ts
- T032: PDF adapter in src/main/documents/adapters/pdf-adapter.ts

After the adapters and plan client exist:
- T033: Adapter registry and source loading
- T034: Gemini client
- T035: Beautification pipeline
- T037-T039: Renderer workflow files
- T040: Export service
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational, including security and document fixtures.
3. Complete Phase 3: User Story 1.
4. Stop and validate the complete selection-to-export workflow with each supported format and a mocked Gemini response.
5. Demonstrate the MVP only after source immutability and validation-gated export pass.

### Incremental Delivery

1. Setup plus Foundational establishes document-processing and preservation contracts.
2. US1 delivers the supported-format beautification MVP.
3. US2 adds style control and custom formatting instructions without changing the preservation contract.
4. US3 adds visible verification and robust failure recovery.
5. Polish completes privacy, accessibility, packaging, signing, and release checks.
6. Phase 8 extracts and hardens browser product, removes Electron runtime scope, and provides Vercel deployment and rollback path.
7. Phase 9 builds new SwiftUI macOS app with MVVM, Observation, Actors, URLSession, Swift Package Manager, and native interaction design.

---

## Phase 10: Native macOS Feature Completion

**Purpose**: Finish the native macOS product beyond the current Swift package scaffold. Replace
placeholder services and UI with a complete, testable document workflow, then produce a real `.app`
bundle with a bundle identifier, entitlements, and release validation.

**Scope note**: Phase 9 established native contracts and a SwiftUI shell. Phase 10 implements the
remaining product behavior. Existing Phase 9 tasks remain historical delivery records; these tasks
are the executable completion backlog for the current native tree.

### User Story 1 - Native Document Beautification (Priority: P1) MVP

**Goal**: Let a macOS user select or drop one supported file, configure a style, generate a
formatting-only plan, validate it, and export a separate same-format document.

**Independent test**: Run the workflow with a mocked Gemini client for TXT, Markdown, DOCX, and PDF;
verify source bytes remain unchanged, output format matches input, and export is enabled only after
validation passes.

- [X] T124 [P] [US1] Define native workflow state, progress events, user-safe errors, and retry/cancel actions in `macos/Sources/CamDocFormater/Domain/Workflow.swift`
- [X] T125 [P] [US1] Implement deterministic source hashing, supported-extension detection, empty-file rejection, and read-only security-scoped access in `macos/Sources/CamDocFormater/Services/NativeFileAccess.swift`
- [X] T126 [US1] Implement native open and save panels with one-file filtering, source-destination conflict rejection, destination conflict confirmation, and security-scoped URL lifetime management in `macos/Sources/CamDocFormater/Services/NativeFilePanels.swift`
- [X] T127 [US1] Implement TXT and Markdown extraction/serialization with newline, heading, list, link, and opaque-node preservation in `macos/Sources/CamDocFormater/Services/DocumentAdapters.swift`
- [X] T128 [P] [US1] Implement DOCX package extraction and same-format serialization with supported OOXML text, style, image, table, hyperlink, relationship, and unsupported-feature checks in `macos/Sources/CamDocFormater/Services/DocumentAdapters.swift`
- [X] T129 [P] [US1] Implement PDF extraction and same-format export for supported text, image, link, page-geometry, and metadata capabilities with fail-closed unsupported-feature handling in `macos/Sources/CamDocFormater/Services/DocumentAdapters.swift`
- [X] T130 [US1] Implement Gemini response decoding, constrained formatting-plan validation, node-reference checks, timeout handling, cancellation, bounded response parsing, and secret-safe error mapping in `macos/Sources/CamDocFormater/Services/NativeServices.swift`
- [X] T131 [US1] Implement actor-isolated job orchestration for extraction, Gemini request, local plan application, round-trip validation, cleanup, progress, cancellation, retry, and terminal state transitions in `macos/Sources/CamDocFormater/Services/JobCoordinator.swift`
- [X] T132 [US1] Replace placeholder native export behavior with validation-gated atomic export that never overwrites source and handles existing destinations explicitly in `macos/Sources/CamDocFormater/Services/NativeExportService.swift`
- [X] T133 [US1] Add native workflow contract tests for source immutability, four-format adapter round trips, mocked Gemini success/failure, cancellation, validation gating, export conflicts, and temporary cleanup in `macos/Tests/NativeWorkflowTests.swift`
- [X] T134 [US1] Connect open/drop, style selection, disclosure, generate, progress, validation, retry, cancel, preview, and export actions to observable view models in `macos/Sources/CamDocFormater/Features/DocumentWorkflow/DocumentWorkflowViewModel.swift`
- [X] T135 [US1] Replace placeholder workspace controls with native queue, preview, validation summary, blocked-export, and recoverable-error views in `macos/Sources/CamDocFormater/Features/DocumentWorkflow/DocumentWorkflowView.swift`

**Checkpoint**: A supported document can complete native select/drop through validated export with
source immutability proven by automated tests.

### User Story 2 - Native Formatting Controls and Credentials (Priority: P2)

**Goal**: Let users choose all named styles, provide safe custom instructions, and manage the
Gemini key through macOS Keychain without exposing secrets.

**Independent test**: Select every style, enter allowed and content-changing instructions, replace
and remove the key, then verify request payloads and UI feedback contain no credential or document
content leakage.

- [X] T136 [P] [US2] Complete all six native formatting profiles, token resolution, custom instruction bounds, and formatting-only instruction screening in `macos/Sources/CamDocFormater/Domain/Formatting.swift` and `macos/Sources/CamDocFormater/Services/InstructionPolicy.swift`
- [X] T137 [US2] Implement Keychain read, save, replace, remove, status, duplicate-item handling, and user-safe error mapping in `macos/Sources/CamDocFormater/Services/NativeServices.swift`
- [X] T138 [US2] Add settings model and view model for missing-key status, configure, replace, remove, confirmation, and failure states without persisting document data in `macos/Sources/CamDocFormater/Features/Settings/SettingsViewModel.swift`
- [X] T139 [US2] Add style picker, Custom instruction editor, character limit, content-change warning, disclosure text, and reset behavior in `macos/Sources/CamDocFormater/Features/DocumentWorkflow/DocumentWorkflowView.swift`
- [X] T140 [P] [US2] Add credential and instruction-policy tests covering lifecycle, redaction, invalid instructions, bounded input, and disclosure gating in `macos/Tests/NativeWorkflowTests.swift`

**Checkpoint**: Native users can safely manage credentials and control presentation without changing
document content.

### User Story 3 - Native Trust, Recovery, and Accessibility (Priority: P3)

**Goal**: Make preservation results visible, prevent unsafe output, recover from interruption, and
meet standard macOS accessibility and interaction expectations.

**Independent test**: Exercise altered text/assets/tables/links/structure, network failure,
cancellation, restart cleanup, keyboard-only navigation, reduced motion, and multiple window sizes.

- [X] T141 [P] [US3] Implement category-level validation comparison for text, images, tables, hyperlinks, structure, source hash, and inconclusive capabilities in `macos/Sources/CamDocFormater/Services/ValidationComparator.swift`
- [X] T143 [US3] Implement startup stale-workspace cleanup, application termination cleanup, renderer/view-model reset, and retry recovery without retaining source or generated content in `macos/Sources/CamDocFormater/Services/RecoveryCoordinator.swift`
- [X] T144 [P] [US3] Add native accessibility identifiers, VoiceOver labels, status announcements, focus restoration, keyboard commands, reduced-motion handling, and minimum/maximum window constraints in `macos/Sources/CamDocFormater/App/AppShell.swift` and `macos/Sources/CamDocFormater/App/DesignSystem.swift`
- [X] T145 [P] [US3] Add native validation, recovery, accessibility, keyboard, window-size, appearance, and privacy-retention tests in `macos/Tests/NativeSafetyAndAccessibilityTests.swift`
- [X] T146 [US3] Add packaged bundle metadata and opt-in executable launch smoke coverage in `macos/Tests/PackagedAppSmokeTests.swift`; full UI-driven open/drop and Keychain smoke remains Xcode-environment gated.

**Checkpoint**: Unsafe results never export, failures recover without source loss, and native
workflow remains understandable and usable across supported macOS interaction modes.

### Native Packaging and Release Validation

- [X] T147 [P] Add executable app-bundle metadata, `CFBundleIdentifier`, versioning, document types, URL schemes, app icon, minimum macOS version, and entitlements configuration in `macos/Resources/Info.plist`, `macos/Resources/AppIcon.icns`, and `macos/Resources/CamDocFormater.entitlements`
- [X] T148 Update `macos/Package.swift` and `scripts/package-macos.sh` to build the SwiftUI target, embed resources, create a real `CamDocFormater.app`, apply entitlements, and reject unsigned or missing-identifier release artifacts in `macos/Package.swift` and `scripts/package-macos.sh`
- [X] T149 Add local app-bundle launch support and troubleshooting for SwiftPM/Xcode schemes, including the `com.camdocformater.app` bundle identifier and `linkd.autoShortcut` warning diagnosis in `macos/run-app.sh` and `docs/native-packaging.md`
- [X] T150 [P] Add signed-app verification, hardened-runtime, entitlements, DMG contents, notarization, stapling, and source/privacy artifact checks in `scripts/verify-macos-release.sh`
- [X] T151 Run native debug/release build, Swift tests, packaged smoke tests, app launch, and release verification; record unavailable Xcode/Developer ID checks and actual results in `specs/001-document-beautifier/quickstart.md`

**Phase 10 completion gate**: User Stories 1-3 pass independently; `CamDocFormater.app` launches
with `CFBundleIdentifier=com.camdocformater.app`; unsafe export is blocked; source and credential
retention checks pass; signed packaging gaps are explicitly recorded when credentials or Xcode are
unavailable.

## Phase 11: Cross-Product Document Preview and Comparison

**Purpose**: Show loaded source, formatted result, and useful before/after comparison in both
products without making preview state or rendered artifacts persistent.

**Scope note**: TXT and Markdown must provide readable rendered previews and presentation-aware
diffs. DOCX and PDF use available renderers where reliable; otherwise products show clear
preview-unavailable state while retaining validation and export safety.

### Contract and test foundation

- [X] T152 Define cross-product preview contract for source/output views, renderability,
presentation-only changes, preserved content, changed node/line details, validation status, and
safe unavailable states in `docs/preview-contract.md` and `specs/001-document-beautifier/data-model.md`
- [X] T153 [P] Add web unit tests for source snapshots, formatted snapshots, content equality,
presentation-only change extraction, line-level diffing, and unsupported-format fallback in
`tests/web/preview.test.ts`
- [X] T154 [P] Add native unit tests for preview construction, changed-node detection, content
preservation, validation gating, and unavailable-preview behavior in
`macos/Tests/NativeWorkflowTests.swift` and `macos/Tests/NativeContractsTests.swift`

### Browser product preview

- [X] T155 [P] Implement browser preview/diff model with ephemeral source and formatted snapshots,
presentation-only change detection, readable line/block changes, and format renderability in
`src/web/preview.ts`
- [X] T156 Integrate source preview, formatted preview, compare mode, validation status, and
preview-unavailable messaging into `src/web/main.tsx` without exposing API keys or persisting
document contents
- [X] T157 Add responsive browser preview styling for source/result panes, compare highlights,
mobile stacked views, keyboard focus, reduced motion, and long-document overflow in
`src/web/styles/web.css`
- [X] T158 Add browser integration coverage for source preview before generation, formatted preview
after generation, compare changes, unchanged-content messaging, validation gating, and DOCX/PDF
fallback in `tests/web/preview.spec.ts`

### Native macOS preview

- [X] T159 Extend native preview model with source/output snapshots, category and node-level
presentation changes, content-preservation status, and explicit unavailable states in
`macos/Sources/CamDocFormater/Features/Preview/PreviewModel.swift`
- [X] T160 Build SwiftUI source, formatted, and compare modes with change annotations, validation
status, scroll/zoom behavior, and safe fallback in
`macos/Sources/CamDocFormater/Features/Preview/PreviewView.swift` and
`macos/Sources/CamDocFormater/Features/DocumentWorkflow/DocumentWorkflowView.swift`
- [X] T161 Connect preview lifecycle, mode selection, output updates, cancellation, reset, and
validation-gated visibility in
`macos/Sources/CamDocFormater/Features/DocumentWorkflow/DocumentWorkflowViewModel.swift`
- [X] T162 Add native accessibility and workflow coverage for source/result/compare modes,
keyboard navigation, focus restoration, reduced motion, validation failure, and unavailable
preview messaging in `macos/Tests/NativeAccessibilityTests.swift` and
`macos/Tests/NativeWorkflowTests.swift`

### Measurement and cross-product verification

- [X] T163 [P] Add fixture-matrix measurement for SC-002 validation-result coverage, SC-005
first-time workflow completion protocol, and the plan's 10-second local-stage target in
`tests/fixtures/README.md`, `tests/web/performance.spec.ts`,
`macos/Tests/NativeWorkflowTests.swift`, and `specs/001-document-beautifier/quickstart.md`
- [X] T164 [P] Document preview behavior, supported renderers, comparison limitations, privacy
retention rules, and fallback language in `docs/format-support.md`, `docs/web-design.md`,
`docs/macos-design.md`, and `README.md`
- [X] T165 Run browser and native preview, measurement, typecheck, accessibility, and smoke
workflows; verify source/output/compare states agree with validation and record renderer or
environment limitations in `specs/001-document-beautifier/quickstart.md`

## Phase 12: DOCX Preview Enhancement

**Purpose**: Add a reliable, read-only DOCX preview path while preserving the existing fail-closed
validation and export rules. DOCX preview must never be treated as proof of preservation, and any
unsupported OOXML feature must produce an explicit unavailable or partial-preview state.

### DOCX preview contract and fixtures

- [X] T166 Define DOCX preview states for rendered, partial, unavailable, and failed rendering;
  document supported OOXML elements, sanitization rules, resource limits, and the relationship
  between preview status and validation-gated export in `docs/preview-contract.md` and
  `specs/001-document-beautifier/data-model.md`
- [X] T167 [P] Add DOCX fixtures covering headings, paragraphs, lists, tables, hyperlinks, images,
  headers/footers, nested formatting, unsupported embedded objects, malformed packages, and large
  documents in `tests/fixtures/` and `tests/fixtures/README.md`
- [X] T168 [P] Add browser contract tests for DOCX render success, partial rendering, sanitization,
  resource limits, missing relationships, malformed packages, and explicit unavailable fallback in
  `tests/web/docx-preview.test.ts`
- [X] T169 [P] Add native contract tests for DOCX render success, unsupported-feature fallback,
  temporary-resource cleanup, validation independence, and source immutability in
  `macos/Tests/NativeContractsTests.swift` and `macos/Tests/NativeWorkflowTests.swift`

### Browser DOCX preview

- [X] T170 Select and configure the smallest browser-compatible DOCX rendering dependency or
  isolated renderer boundary; pin the dependency and document why it does not alter source bytes,
  transmit content, or become an export path in `package.json`, `src/web/`, and `docs/web-security.md`
- [X] T171 Implement browser DOCX package parsing/rendering into a sanitized read-only preview
  model with explicit feature warnings, bounded archive/XML/image processing, and no persistent
  document or preview state in `src/web/docx-preview.ts`
- [X] T172 Integrate DOCX source preview before generation and formatted-result preview after a
  successful validation pass; retain compare-mode fallback when reliable comparison is unavailable
  in `src/web/main.tsx` and `src/web/preview.ts`
- [X] T173 Add responsive DOCX preview styling for rendered pages, tables, images, warnings, partial
  results, keyboard focus, reduced motion, and long-document overflow in `src/web/styles/web.css`
- [X] T174 Add browser end-to-end coverage for DOCX source preview, formatted preview, compare
  fallback, malformed/unsupported feature messaging, validation gating, and download behavior in
  `tests/web/preview.spec.ts`

### Native macOS DOCX preview

- [X] T175 Implement native DOCX read-only rendering using a platform-supported view or isolated
  conversion path, with temporary-resource ownership, sanitization, bounded rendering, and explicit
  unsupported-feature reporting in `macos/Sources/CamDocFormater/Features/Preview/` and
  `macos/Sources/CamDocFormater/Services/DocumentAdapters.swift`
- [X] T176 Extend the native preview model with DOCX render status, page/block metadata, feature
  warnings, and compare availability without weakening validation or export gating in
  `macos/Sources/CamDocFormater/Features/Preview/PreviewModel.swift`
- [X] T177 Integrate native DOCX source/result preview, zoom/scroll behavior, partial/unavailable
  states, focus restoration, and validation status into `macos/Sources/CamDocFormater/Features/Preview/PreviewView.swift` and
  `macos/Sources/CamDocFormater/Features/DocumentWorkflow/DocumentWorkflowView.swift`
- [X] T178 Add native DOCX accessibility and workflow coverage for source/result modes, warnings,
  keyboard navigation, reduced motion, renderer failure, cancellation, cleanup, and unchanged
  source behavior in `macos/Tests/NativeAccessibilityTests.swift` and
  `macos/Tests/NativeWorkflowTests.swift`

### DOCX preview verification and documentation

- [X] T179 [P] Add cross-product DOCX preview privacy tests proving extracted text, rendered
  resources, temporary files, and preview state are not retained after reset, cancellation, failure,
  or application close in `tests/web/` and `macos/Tests/`
- [X] T180 [P] Document DOCX renderer capabilities, unsupported OOXML features, partial-preview
  language, comparison limitations, performance limits, and troubleshooting in `docs/format-support.md`,
  `docs/web-design.md`, `docs/macos-design.md`, and `README.md`
- [X] T181 Run browser and native DOCX preview unit, integration, accessibility, typecheck, build,
  packaging, privacy, and smoke suites; verify preview status never enables export by itself and
  record platform-specific renderer limitations in `specs/001-document-beautifier/quickstart.md`

## Phase 12 Dependencies and Parallel Execution

- **Phase 12 prerequisite**: T166-T181 depend on the Phase 11 preview contract, completed browser/native
  workflow surfaces, DOCX adapter capability declarations, and validation-gated export behavior.
- **Contract and fixtures**: T167-T169 can proceed in parallel after T166; tests should fail before
  the corresponding renderer behavior exists.
- **Browser preview**: T170-T174 depend on the browser renderer boundary; T171 and T173 can proceed
  in parallel before T172, while T174 follows integration.
- **Native preview**: T175-T178 depend on native renderer selection and preview model APIs; T176 can
  proceed with T175, while T177 follows both and T178 follows the UI surface.
- **Verification**: T179-T180 can proceed in parallel after renderer behavior stabilizes. T181 waits
  for all DOCX preview implementation and documentation tasks.

## Phase 12 Implementation Strategy

1. Establish fixtures and the cross-product contract, including explicit partial/unavailable states.
2. Choose the smallest renderer boundary that can safely render the supported DOCX subset; keep
   validation and export independent from preview availability.
3. Implement browser and native rendering with bounded, sanitized, ephemeral resources.
4. Add accessibility, privacy, and failure-path coverage before claiming DOCX preview support.
5. Record unsupported OOXML features and environment-specific renderer limitations rather than
   silently approximating document content.

## Phase 13: Content-Exact Formatting Verification and Workspace UX

**Purpose**: Formatting must change presentation only — the AI-formatted result must contain
100% of the original content (not a "<10% difference" tolerance), the workspace flow must feel
responsive and interactive, DOCX preview must match the real document layout, and silent
no-op formatting must be caught and explained rather than handed off as a formatted file.
Preview and comparison remain independent from validation-gated export.

### Exact content preservation

- [X] T182 [P] Replace the <10% word-count tolerance with an exact content-preservation check:
  normalized, order-sensitive text-token equality (whitespace, Markdown markers, and DOCX run
  properties count as presentation, not content) in `src/web/comparison/comparison-engine.ts`,
  `tests/web/` coverage, and the native equivalent in
  `macos/Sources/CamDocFormater/Services/ValidationComparator.swift`
- [X] T183 [P] Add a post-AI verification step in `src/web/state/workflow-context.tsx` (and the
  native `macos/Sources/CamDocFormater/Services/JobCoordinator.swift`): after the formatting
  plan is applied, re-extract text from the formatted output (DOCX via `src/web/docx-formatting.ts`
  and `macos/Sources/CamDocFormater/Features/Preview/DocxPreviewRenderer.swift`) and compare
  exact-normalized content against the source; block export with a clear message when any
  content differs
- [X] T184 Add unit and end-to-end coverage: fixtures where the AI plan adds/removes/rewrites
  words must fail the new exact check; style-only edits must pass; update
  `tests/web/docx-preview.test.ts`, `tests/web/preview.spec.ts`, and
  `macos/Tests/NativeWorkflowTests.swift`
- [X] T185 Update comparison status copy from "<10%" to "100% content preserved" and document the
  exact-preservation contract in `docs/format-support.md` and `docs/preview-contract.md`

### Interactive workspace flow

- [X] T186 [P] Step-gate the workspace flow (add API key → add file → choose style → review) in
  `src/web/pages/WorkspacePage.tsx`, `src/web/state/workflow-context.tsx`, and native
  `macos/Sources/CamDocFormater/Features/DocumentWorkflow/DocumentWorkflowViewModel.swift`:
  later steps stay disabled until the previous prerequisite is complete, with a visible reason
  for each disabled step
- [X] T187 Add hover, active, and focus-visible states with consistent transitions to all
  interactive elements (buttons in `src/web/components/ui/*`, nav, step indicators,
  `src/web/styles/web.css`, native controls) that respect `prefers-reduced-motion`
- [X] T188 Add accessibility and end-to-end coverage for step gating, keyboard focus, and
  hover/active states in `tests/web/shadcn-flow.spec.ts`,
  `tests/unit/web/shadcn-components.test.tsx`, and `macos/Tests/NativeAccessibilityTests.swift`

### DOCX preview correctness

- [X] T189 [P] Investigate the reported incorrect DOCX preview: compare the current extractor
  (`src/web/docx-preview.ts`) against a real DOCX preview rendering (tables, images, borders,
  fonts, layout); upgrade or replace the renderer so preview reflects the actual document
  layout, keeping the fail-closed states from `docs/preview-contract.md` unchanged
- [X] T190 Add fixture-based golden coverage that preview layout matches the real document
  (tables render as tables, headings as headings, images placed) in `tests/web/docx-preview.test.ts`
  and `macos/Tests/NativeContractsTests.swift`

### No-op formatting investigation

- [X] T191 [P] Trace why formatting can return a file that looks identical to the source: audit
  the AI plan generation (`src/web/formatting.ts`), plan application and XML transformation
  (`src/web/docx-formatting.ts`), the download path, and the native plan application; fix the
  mapping when style changes are not applied, or surface an explicit "no changes applied" state
  with a retry/regenerate option and record the root cause in
  `specs/001-document-beautifier/quickstart.md`

## Phase 13 Dependencies and Parallel Execution

- **Phase 12 prerequisite**: T182-T191 depend on the completed DOCX preview contract, fixtures,
  validation-gated export, and cross-product preview surfaces from Phase 12.
- **Verification**: T182-T183 can proceed in parallel after the exact-normalization helper lands;
  T184-T185 follow. T186-T188 are independent of T182-T185 and of T189-T190. T191 depends on both
  the exact-content check (to prove no-op) and the final preview renderer. T181 verification
  patterns apply to every Phase 13 change.

## Phase 11 Dependencies and Parallel Execution

- **Phase 10 prerequisite**: T152-T165 depend on the completed native workflow, browser extraction,
validation contracts, and format capability declarations from Phases 8 and 10.
- **Contract and tests**: T153-T154 can proceed in parallel after T152; each platform test should
fail before its corresponding implementation is complete.
- **Browser preview**: T155-T158 depend on the browser-only product boundary and T152; T155 and
T157 can proceed in parallel before T156 integration.
- **Native preview**: T159-T162 depend on native validation and SwiftUI workflow APIs; T159 can
proceed before T160-T161, while T162 follows the preview surface.
- **Measurement and release**: T163-T164 can proceed in parallel after both preview contracts
stabilize. T165 waits for browser and native preview, measurement, accessibility, and smoke checks.

### Parallel examples

After T124-T126:

- T127: TXT/Markdown adapter work
- T128: DOCX adapter work
- T129: PDF adapter work
- T136: Formatting profile and instruction policy work
- T144: Accessibility and window behavior work

After T131:

- T133: Native workflow contract tests
- T134-T135: Workflow view model and UI
- T141: Validation
- T145: Native safety/accessibility tests
- T147-T150: Packaging and release verification

## Phase 10 Implementation Strategy

### Native MVP first

1. Complete T124-T135 for TXT and Markdown with a mocked Gemini client.
2. Validate source immutability, disclosure gating, round-trip validation, and separate export.
3. Add DOCX and PDF adapters through T128-T129, then rerun the same workflow contract suite.

### Incremental hardening

1. Complete credential and custom-style controls in T136-T140.
2. Complete validation detail, preview, recovery, and accessibility in T141-T146.
3. Produce and verify the real app bundle through T147-T151.
4. Mark release claims complete only after signed-app and packaged smoke checks pass; otherwise
	record exact environment blockers in `quickstart.md`.
