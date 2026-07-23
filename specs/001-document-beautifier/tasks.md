---
description: "Executable task list for the Document Beautifier feature"
---

# Tasks: Document Beautifier

**Input**: Design documents from `/specs/001-document-beautifier/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included because the specification defines independent test paths and the constitution requires automated or focused workflow verification.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated as an independent increment.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the Electron, React, TypeScript, Vite, testing, and packaging foundation.

- [X] T001 Create the Electron project structure from the implementation plan in `src/main/`, `src/preload/`, `src/renderer/`, `tests/`, and `scripts/`
- [X] T002 Initialize the npm project with Electron, React, TypeScript, Vite, `@google/genai`, `keytar`, `zod`, document adapter, test, and packaging dependencies in `package.json`
- [X] T003 [P] Configure TypeScript project references and strict compiler settings in `tsconfig.json`, `tsconfig.main.json`, `tsconfig.preload.json`, and `tsconfig.renderer.json`
- [X] T004 [P] Configure Vite renderer and Electron development entry points in `vite.config.ts` and `src/main/index.ts`
- [X] T005 [P] Configure ESLint and formatting rules in `eslint.config.js` and `.prettierrc.json`
- [X] T006 [P] Configure Vitest and Playwright Electron test runners in `vitest.config.ts` and `playwright.config.ts`
- [X] T007 [P] Configure signed `.app` and `.dmg` packaging targets, entitlements placeholders, and build scripts in `electron-builder.yml` and `package.json`
- [X] T008 [P] Add repository scripts for development, typecheck, lint, unit tests, Electron integration tests, packaging, and macOS smoke tests in `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the shared security, data, IPC, lifecycle, and document-processing foundations required by every user story.

**Critical**: No user story work can begin until this phase is complete.

- [X] T009 Define canonical document IR types, immutable node identities, format capabilities, and presentation-only fields in `src/main/documents/ir/types.ts`
- [X] T010 [P] Define formatting profiles, style tokens, constrained formatting-plan operations, and schema versions in `src/main/documents/ir/formatting-plan.ts`
- [X] T011 [P] Define job states, valid transitions, validation statuses, user-safe errors, progress events, and export summaries in `src/main/jobs/types.ts`
- [X] T012 [P] Define runtime-validated IPC request and response schemas for document selection, key management, jobs, progress, validation, and export in `src/main/ipc/schemas.ts`
- [X] T013 Implement the narrow typed preload `contextBridge` API without exposing `ipcRenderer`, filesystem APIs, credentials, or raw document contents in `src/preload/index.ts`
- [X] T014 Implement secure Electron window creation with `contextIsolation`, sandboxing, disabled `nodeIntegration`, local content security policy, and safe navigation rules in `src/main/window.ts`
- [X] T015 Implement macOS Keychain set, status, replace, read, and remove operations without plaintext fallback in `src/main/security/keychain.ts`
- [X] T016 [P] Implement authorized native open/save dialogs, supported-extension filtering, source-path protection, and destination tokens in `src/main/security/file-access.ts`
- [X] T017 [P] Implement per-job temporary workspace creation, ownership tracking, `finally` cleanup, cancellation cleanup, and stale startup cleanup in `src/main/jobs/temp-workspace.ts`
- [X] T018 Implement the job state machine, cancellation tokens, progress events, and renderer-safe error translation in `src/main/jobs/job-manager.ts`
- [X] T019 Implement validated IPC handlers for Keychain status/set/remove and document selection/drop in `src/main/ipc/handlers.ts`
- [X] T020 [P] Implement the generic semantic validation comparator for text, assets, tables, hyperlinks, structure, and source immutability in `src/main/documents/validation/compare.ts`
- [X] T021 [P] Implement formatting-plan schema validation, node-reference checks, and rejection of content-changing operations in `src/main/gemini/plan-schema.ts`
- [X] T022 [P] Add unit tests for IR identity, formatting-plan rejection, job transitions, IPC schemas, path authorization, and temporary cleanup in `tests/unit/foundation.test.ts`
- [X] T023 Add fixture helpers and representative TXT, Markdown, DOCX, and PDF preservation fixtures under `tests/fixtures/`
- [X] T024 [P] Add security regression tests asserting Electron configuration and preload exposure remain restricted in `tests/unit/electron-security.test.ts`

**Checkpoint**: The app can launch securely, store only the API key in Keychain, authorize a source file, create an ephemeral job, and expose typed status events without implementing beautification yet.

---

## Phase 3: User Story 1 - Beautify a Document (Priority: P1) MVP

**Goal**: Let a user select or drop one supported document, choose a predefined style, generate a formatting-only result, validate it, and export a separate same-format file.

**Independent Test**: With a valid fixture and configured test API key, complete selection, style selection, generation through a mocked Gemini response, validation, and export; verify source hash and format remain unchanged.

### Tests for User Story 1

- [X] T025 [P] [US1] Add adapter contract tests for TXT and Markdown extraction, formatting application, serialization, and semantic round-trip validation in `tests/unit/adapters-text-markdown.test.ts`
- [X] T026 [P] [US1] Add adapter contract tests for DOCX and PDF supported fixtures, unsupported-feature detection, serialization, and fail-closed validation in `tests/unit/adapters-docx-pdf.test.ts`
- [X] T027 [P] [US1] Add mocked Gemini success, timeout, malformed-plan, and network-failure tests in `tests/unit/gemini-client.test.ts`
- [X] T028 [P] [US1] Add Electron integration coverage for single-file drop/select, generation progress, validation pass, same-format export, and unchanged source in `tests/integration/beautify-document.spec.ts`

### Implementation for User Story 1

- [X] T029 [P] [US1] Implement the TXT format adapter with encoding/newline preservation and presentation-only formatting in `src/main/documents/adapters/txt-adapter.ts`
- [X] T030 [P] [US1] Implement the Markdown format adapter with AST extraction, raw-node preservation, and same-format serialization in `src/main/documents/adapters/markdown-adapter.ts`
- [X] T031 [P] [US1] Implement the DOCX format adapter with OOXML package extraction, relationship/media preservation, and supported serialization in `src/main/documents/adapters/docx-adapter.ts`
- [X] T032 [P] [US1] Implement the PDF format adapter with supported text/image/link/page-geometry extraction and fail-closed capability handling in `src/main/documents/adapters/pdf-adapter.ts`
- [X] T033 Implement the adapter registry, content detection, source hashing, read-only loading, and source summary creation in `src/main/documents/adapter-registry.ts`
- [X] T034 Implement the Gemini main-process client with API-key retrieval, disclosure-gated request construction, timeouts, cancellation, bounded responses, and secret-safe errors in `src/main/gemini/client.ts`
- [X] T035 Implement the local formatting pipeline that extracts IR, requests a formatting plan, validates and applies it, serializes output, re-extracts output, and returns a validation result in `src/main/documents/beautify-pipeline.ts`
- [X] T036 Implement job IPC handlers for start, progress, cancellation, validation, and terminal states in `src/main/ipc/handlers.ts`
- [X] T037 Implement the macOS document drop/select, style selection, generation, progress, validation result, and export workflow UI in `src/renderer/main.tsx`
- [X] T038 [P] [US1] Implement renderer state transitions and typed preload event subscriptions without storing credentials or raw document contents in `src/renderer/state/beautify-store.ts`
- [X] T039 [P] [US1] Add accessible macOS-oriented layout, keyboard navigation, status messaging, and responsive in-progress states in `src/renderer/styles/workspace.css`
- [X] T040 Implement native save dialog authorization, atomic same-format output write, destination conflict handling, and source-path rejection in `src/main/exports/export-service.ts`

**Checkpoint**: User Story 1 is independently functional: a supported file can be beautified with a predefined style, validated, and exported without modifying the source.

---

## Phase 4: User Story 2 - Control the Formatting Result (Priority: P2)

**Goal**: Let users select all named styles, provide custom formatting-only instructions, and receive safe feedback when instructions request content changes.

**Independent Test**: Load a fixture, select each named style and Custom, enter formatting instructions, inspect the generated constrained plan request, and confirm content-changing instructions are rejected or ignored without altering the source.

### Tests for User Story 2

- [X] T041 [P] [US2] Add style-profile tests for Simple, Modern, Professional, Easy to Read, Academic, and Custom token resolution in `tests/unit/formatting-profiles.test.ts`
- [X] T042 [P] [US2] Add custom-instruction screening tests for rewrite, add, remove, merge, split, reorder, and rename requests in `tests/unit/custom-instructions.test.ts`
- [X] T043 [US2] Add Electron integration coverage for style switching, Custom instructions, disclosure text, and safe rejection feedback in `tests/integration/formatting-controls.spec.ts`

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
- [X] T070 Define preview/diff contracts for before/after content, changed presentation fields, preserved content, and validation status in `src/main/documents/validation/diff.ts` and `src/main/ipc/schemas.ts`
- [X] T071 Implement read-only before/after preview with formatting changes, validation state, and unavailable-preview handling in `src/renderer/components/PreviewPanel.tsx`
- [X] T072 Add bounded preview IPC flow with cancellation and safe error translation in `src/main/ipc/handlers.ts` and `src/preload/index.ts`
- [X] T073 Add integration tests proving preview reflects changes, content stays identical, source stays untouched, and export remains validation-gated in `tests/integration/preview-diff.spec.ts`
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
- **Phase 9**: Depends on Phase 8 contracts and workflow behavior. T109-T112 establish the Swift package and native contracts. T113-T117 implement native services and workflow. T118-T122 implement and validate the native SwiftUI experience. T123 is the final cross-product validation gate.

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
- [X] T142 [US3] Implement before/after read-only preview models and unavailable-preview handling using validation result and presentation-only differences in `macos/Sources/CamDocFormater/Features/Preview/PreviewModel.swift`
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

## Phase 10 Dependencies and Parallel Execution

- **Native foundation**: T124-T126 block native workflow integration. T127-T129 can run in parallel after the domain contracts are stable.
- **User Story 1**: T130-T132 depend on adapter and domain contracts. T133 should be written before final implementation validation. T134-T135 depend on job and service APIs.
- **User Story 2**: T136-T140 can proceed after native formatting and service contracts exist; T140 is independent from workflow UI work.
- **User Story 3**: T141-T146 depend on the completed workflow and export contracts. Validation, preview, and accessibility work can proceed in parallel after T131.
- **Packaging**: T147-T150 can proceed in parallel after the executable target and resources are defined. T151 waits for all native stories and packaging tasks.

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
- T141-T142: Validation and preview
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
