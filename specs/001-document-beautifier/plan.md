# Implementation Plan: Document Beautifier

**Branch**: `001-document-beautifier` | **Date**: 2026-07-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-document-beautifier/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Build two separate products with one workflow contract. The browser product accepts TXT, Markdown,
DOCX, and PDF files, extracts each document into a canonical content-and-structure representation,
asks Gemini for a constrained formatting plan, applies that plan locally, validates a round-trip
representation, and downloads a separate file in the same format. The native product is a new
SwiftUI macOS application with the same workflow and preservation rules, but native navigation,
window behavior, menus, dialogs, and repeated-use interaction design.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Web: TypeScript 5.x, Node.js 22 LTS, React 19.x, Vite 7.x. Native: Swift
6.x, SwiftUI, Observation framework, macOS 14 Sonoma or later.

**Primary Dependencies**: Web uses `@google/genai`, `zod`, `unified`/`remark-parse`/
`remark-stringify`, `pdfjs-dist`, and `pdf-lib` where browser-compatible. Native uses Swift
Package Manager dependencies for Gemini, document adapters, and fixture processing.

**Storage**: Web uses documented browser storage for the Gemini API key only and keeps document
data in memory. Native uses Keychain for the Gemini API key and SwiftData only for permitted
non-document settings and ephemeral job metadata. No product persists document contents.

**Testing**: Web uses Vitest, Playwright/browser integration, TypeScript, and ESLint. Native uses
XCTest and Swift Testing, including packaged macOS workflow tests.

**Target Platform**: macOS 14 Sonoma and later, Apple Silicon first; signed `.app` bundled in
a notarized `.dmg`

**Project Type**: Separate browser web application and native macOS SwiftUI application.

**Performance Goals**: Renderer remains interactive during all jobs; local extraction,
validation, and serialization show progress for operations longer than 500 ms; a typical
document completes local stages within 10 seconds excluding Gemini network time

**Constraints**: No source or generated document persistence; API key never reaches logs; explicit
disclosure and user action before network transmission; fail closed on incomplete validation;
source path can never be an export path; cleanup runs on success, failure, and cancellation.
Web APIs remain browser-only. Native code uses MVVM, Observation, `async`/`await`, Actors,
`URLSession`, Swift Package Manager, and SwiftUI.

**Scale/Scope**: Single-user desktop workflow; one source document per job; four initial formats;
six predefined style profiles plus custom instructions; no accounts, analytics, sync, or update
service in feature scope

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Native macOS Experience**: PASS for planned native product. SwiftUI uses native menus/dialogs,
  drag-and-drop, keyboard navigation, window commands, and standard macOS packaging.
- **Privacy and User Control**: PASS. The user supplies the Gemini key, sees a disclosure, and
  explicitly starts transmission. Only the key persists under each product's documented secure
  storage policy; documents and job data are ephemeral.
- **Reliable Document Handling**: PASS. Format adapters operate on a canonical IR, source files
  are read-only, validation is a normalized round-trip comparison, and export is blocked unless
  validation passes.
- **Testable Quality**: PASS. Web unit/browser checks and native XCTest/Swift Testing fixture,
  integration, cleanup, and packaged smoke checks are defined in the testing strategy.
- **Simplicity and Maintainability**: PASS. Separate adapters are required because the four
  formats have incompatible semantics and fidelity limits; the common IR and adapter contract
  prevent duplicated validation logic.

No constitution violations require Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/web/
├── adapters/                # browser-only file, Gemini, storage, and download adapters
├── components/              # browser UI
├── state/                   # refresh-safe browser state
└── styles/                  # responsive browser design

macos/
├── Package.swift            # Swift Package Manager manifest
├── Sources/CamDocFormater/
│   ├── App/                 # SwiftUI shell, navigation, commands
│   ├── Features/            # workflow, settings, preview, validation, export
│   ├── Domain/              # canonical IR, formatting plans, job state
│   ├── Services/            # URLSession, Keychain, file access, cleanup
│   └── Infrastructure/      # SwiftData models and format adapters
└── Tests/                   # XCTest and Swift Testing suites

tests/
├── fixtures/                # representative documents and expected IR facts
└── web/                     # browser contract and deployment tests

package.json                 # web product scripts and dependencies
vite.config.ts               # web product build
```

**Structure Decision**: Separate products and runtime boundaries. Refactor current TypeScript code
into browser-only web code; remove Electron main/preload, IPC handlers, `keytar`, and
electron-builder from product scope. Build native macOS app as Swift Package with SwiftUI,
MVVM, Observation, Actors, `URLSession`, Keychain, and SwiftData. Shared behavior is specified
through format, formatting-plan, validation, and privacy contracts rather than shared runtime
code. Native and web UIs remain intentionally different: native uses windowed navigation,
commands, menus, focus continuity, and dense repeated-use surfaces; web uses responsive layouts,
browser navigation, touch targets, shareable routes, and refresh-safe state.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | The selected structure satisfies the constitution without an exception. |
