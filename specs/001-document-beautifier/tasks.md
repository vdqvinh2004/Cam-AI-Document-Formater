---
description: "Executable task list for the Document Beautifier feature"
---

# Tasks: Document Beautifier (Web + Native macOS)

**Input**: Design documents from `/specs/001-document-beautifier/`

**Status**: All historical phases COMPLETE (verified in code and tests). Backlog is open for new work.

**Format**: `[ ] T### [P?] [Story] Description`

---

## Delivery Waves (All Complete)

### Wave 1 - Web Refactor MVP (Setup/Foundational + US1-US4) ✅
- [x] T001-T005 Setup: feature branch, Radix + `docx-preview`/`jszip` deps, TS path aliases, `vercel.json` SPA fallback, Vitest/Playwright scripts
- [x] T006-T016 Foundational: router, route/workflow/evidence/comparison/job types, format adapter, DOCX/text preview renderers, comparison engine, validation gate
- [x] T017-T028 [US1] Multi-page workspace: AppShell, Navigation, FileDropzone, Workspace/Privacy/NotFound pages; docs and tests in `tests/web/browser-boundary.test.ts`
- [x] T029-T040 [US2] DOCX/cross-format: renderers use actual package bytes; formatting `blocked` (no safe DOCX transformation); export gated by validation; rich DOCX fixture
- [x] T041-T055 [US3] UI/UX: design tokens, FormatControls, JobStatus, ComparisonSummary, ExportActions, Setup/Review/Settings pages, accessibility + responsive verification
- [x] T056-T067 [US4] Bug fixes: `/privacy` route, unknown-route handling, real result text in comparison, preservation vs presentation separated, PDF unavailable state, storage inspection test

### Wave 2 - shadcn/ui Overhaul & Unified Dashboard (US6) ✅
- [x] T100-T105 Tests: `tests/unit/web/shadcn-components.test.tsx`, `tests/web/shadcn-flow.spec.ts`, `tests/unit/web/bundle-budget.test.ts`
- [x] T106-T110 Tailwind v4 + shadcn/ui: deps in `package.json` (`tailwindcss`, `@tailwindcss/vite`, `lucide-react`, `tailwind-merge`; Radix kept as shadcn deps), `components.json`, `tailwind.config.ts`, `src/web/styles/globals.css`, `vite.web.config.ts`
- [x] T111-T112 Generate `src/web/components/ui/*` primitives (button, card, dialog, tabs, toast, sonner, etc.)
- [x] T113-T120 Rewrite feature components on shadcn/ui: FileDropzone, FormatControls, JobStatus, PreviewPanel, ComparisonSummary, ExportActions, Navigation, AppShell
- [x] T121-T126 `DashboardPage.tsx` at `/` with progressive panels (upload → configure → review), `activePanel` in workflow context synced to URL, deep-links to `/setup` `/review`
- [x] T127-T130 Playwright selectors updated, interaction tests added, bundle < 100 kB verified, full suite green

### Wave 3 - Native macOS SwiftUI App (Phases 9-10) ✅
- [x] T109-T123 Native foundation: Swift package, domain models, service protocols, Gemini/Keychain/adapters/export services, SwiftUI shell, packaging + smoke
- [x] T124-T135 [US1] Native workflow: file access/panels, 4-format adapters, Gemini plan client, job coordinator, validation-gated export, connected views (`macos/Sources/CamDocFormater/`)
- [x] T136-T140 [US2] Style profiles + instruction policy + Keychain lifecycle + settings UI
- [x] T141-T146 [US3] Validation comparator, recovery, accessibility identifiers, privacy-retention tests, packaged smoke
- [x] T147-T151 Packaging: entitlements, `CamDocFormater.app` build, signed-app/DMG verification; Xcode/Developer ID gaps recorded in `quickstart.md`

### Wave 4 - Cross-Product Preview & Comparison (Phase 11) ✅
- [x] T152-T165 Preview contract in `docs/preview-contract.md`; browser + native source/formatted/compare modes; fixture-matrix measurement; documented in `docs/format-support.md`

### Wave 5 - DOCX Preview Enhancement (Phase 12) ✅
- [x] T166-T181 DOCX partial/unavailable states, sanitized read-only rendering (browser `src/web/docx-preview.ts`, native `DocxPreviewRenderer`), privacy + accessibility coverage, documentation

### Wave 6 - Content-Exact Verification & Workspace UX (Phase 13) ✅
- [x] T182-T185 Exact 100% content-preservation check (order-sensitive token equality); post-AI re-extraction verification blocks export on content drift
- [x] T186-T188 Step-gated workspace, hover/active/focus states, reduced-motion support
- [x] T189-T190 DOCX preview layout matching real document; golden fixture coverage
- [x] T191 No-op formatting investigation: root cause recorded; explicit "no changes applied" state

### Superseded / Not Applicable
- [x] T068 [US5] PDF preview test - N/A: PDF.js rejected, explicit unavailable state retained (see T069-T074, `research.md`)
- [x] T070-T074, T060, T094-T099 Historical Electron-era records superseded by browser extraction (Phase 8) and native product (Phase 9)
- [x] Old Electron product phases (original Fr/Electron Phases 4-7): completed then retired; duplicate IDs kept for history only

---

## Wave 7: System Optimization & Formatting Reliability (Priority: P1)

**Goal**: Remove dead code/dependencies, render DOCX preview through `docx-preview` (before and after),
make every style produce a real, different result (deterministic local application; custom style allows
structural reorder via Gemini), require a description for Custom, append `_cam_formatted` to export
filenames, and split components/services for maintainability.

### Phase 7a - Cleanup & dependencies
- [x] T200 Delete dead files: `src/web/formatting-fixed.ts`, legacy `src/web/docx-preview.ts`, `src/web/api/format-adapter.ts`, `src/web/preview.ts`
- [x] T201 Remove unused shadcn/ui files (`select`, `tabs`, `scroll-area`, `navigation-menu`, `radio-group`, `alert-dialog`, `dialog`, `tooltip`, `separator`) and their `@radix-ui/*` deps from `package.json`
- [x] T202 Migrate orphaned tests (`tests/web/preview.test.ts`, `tests/unit/web/docx-result-semantics.test.ts`, `tests/web/docx-preview.test.ts`) onto surviving modules
- [x] T203 Verify `yarn build` + bundle budget; prune `yarn.lock`

### Phase 7b - Real DOCX preview via docx-preview
- [x] T205 Create `src/web/components/preview/DocxPreviewPane.tsx` rendering source AND result DOCX with `renderAsync` into the live DOM (no serialization/sanitize round-trip)
- [x] T206 Create `src/web/components/preview/TextPreviewPane.tsx`; rewrite `PreviewPanel.tsx` to use both panes
- [x] T207 Move DOCX evidence to text-only extraction in `src/web/preview/docx-preview-renderer.ts` (no `renderAsync` in evidence path)
- [x] T208 Add coverage proving DOCX before/after render through `docx-preview` with fallback states

### Phase 7c - Deterministic styles + custom structural reorder
- [x] T209 Create `src/web/formatting/style-plan.ts`: per-style presentation ops for every node (no Gemini nodeID guessing); markdown emphasis map distinct per style
- [x] T210 Custom style requires non-empty description: `FormatControls` validation + guard in the formatting flow
- [x] T211 Extend plan schema with `move` ops; screen Gemini output (valid nodeIDs, bounds, presentation-only fields)
- [x] T212 Apply moves in Markdown (block reorder) and DOCX (`w:p` reorder in `docx-formatting.ts`)
- [x] T213 Fix `noChangesApplied` in `comparison-engine.ts` using applied-op count instead of heading-count heuristics
- [x] T214 Comparison contract: order-insensitive-but-complete (multiset) content check when structural moves are present
- [x] T215 Named styles format locally (no Gemini call); Gemini only for Custom style

### Phase 7d - Export filename suffix
- [x] T217 Create `src/web/lib/filename.ts` with `withFormattedSuffix` → `report_cam_formatted.docx`
- [x] T218 Use it in `ExportActions` download, Review header, and `ComparisonSummary`; remove unused `downloadBlob` from `formatting.ts`

### Phase 7e - Structure & performance
- [x] T219 Extract `StepIndicator` component and `formatBytes` util from `DashboardPage`
- [x] T220 Extract `src/web/state/formatting-flow.ts` (job orchestration) out of `workflow-context.tsx`
- [x] T222 Memoize API-key presence (reactive `hasApiKey` in context); remove duplicate `arrayBuffer()` reads
- [x] T223 Remove `src/web/lib/download.ts` helper use; keep single download path

### Phase 7f - Tests & verification
- [x] T224 Add `tests/unit/web/style-application.test.ts`: every style differs from source (Markdown + DOCX), content 100% preserved, DOCX outputs pairwise distinct
- [x] T225 Add custom-style tests: empty description rejected; move op reorders with content complete; invalid AI ops screened out
- [x] T226 Add `tests/unit/web/filename.test.ts` for the export suffix
- [x] T227 Update `tests/web/shadcn-flow.spec.ts` + `tests/web/browser-product.spec.ts` + `tests/web/ui.spec.ts` for local named-style flow and custom gating
- [x] T229 Run `yarn typecheck && yarn lint && yarn test && yarn test:e2e && yarn build`; record results in `specs/001-document-beautifier/quickstart.md`
- [x] T230 Update `docs/format-support.md`, `docs/preview-contract.md`, `CHANGELOG.md`

### Phase 8 - AI quality verification loop for Custom style
- [x] T231 Add `rewrite-text` op to `style-plan.ts`: headings-only screening (node exists, starts with `h`), 1-200 printable chars, full replacement line
- [x] T232 Apply `rewrite-text` in Markdown (full-line replacement with `#` markers) and DOCX (replace runs with a single `w:r`/`w:t`, keep `w:pPr`)
- [x] T233 Extract `geminiCall` helper; add `clarifyCustomInstructions` (description rephrase + `affectsContent`/reason) and `verifyCustomResult` (matches flag + corrective ops) in `formatting.ts`
- [x] T234 `runCustomFormatting` orchestration: clarify → plan → verify/refine loop with corrective ops re-screened and merged, hard cap 2 refinement rounds, progress stages 10 → 20 → 65 → 70+(n/2) → 90 → 100
- [x] T235 Comparison engine: `expectedTextChanges` strips exact expected heading lines; "Rewritten headings" row; unintended content changes still block export
- [x] T236 Surface verification in `formatting-flow.ts` (job messages + `verificationNote` on the result) and `ComparisonSummary.tsx` (`data-testid="verification-note"`)
- [x] T237 Tests: `tests/unit/web/custom-verification.test.ts` (screening, apply, clarify, verify, loop cap, correction screening, comparison stripping); stage-aware Gemini mocks in `tests/web/shadcn-flow.spec.ts` (move flow + renumber refinement e2e)
- [x] T238 Run `yarn typecheck && yarn lint && yarn test && yarn test:e2e && yarn build`; update `docs/format-support.md`, `docs/preview-contract.md`, `CHANGELOG.md`, `quickstart.md`

---

## Verification Commands

- `yarn typecheck && yarn lint && yarn test && yarn test:e2e && yarn build`
- Native: `swift test` under `macos/`, `./scripts/package-macos.sh`
- Platform gaps and prerequisites: `specs/001-document-beautifier/quickstart.md`