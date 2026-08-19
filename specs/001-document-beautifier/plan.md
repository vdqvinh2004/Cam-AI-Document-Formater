# Implementation Plan: Document Beautifier

**Branch**: `001-document-beautifier` | **Spec**: [spec.md](spec.md) | **Status**: Implemented (Waves 1–9)

## Summary

Cam DocFormater is a document formatting workspace with two products that share the same
preservation promise but not the same runtime:

- **Cam DocFormater Online** — a browser SPA (`src/web/`) built with React 19, Vite 7,
  Tailwind v4, and shadcn/ui. Named styles apply deterministically on-device; only the Custom
  style calls Gemini. Documents stay in memory and export is gated behind exact
  content-preservation validation.
- **Cam DocFormater App** — a native macOS SwiftUI product (`macos/`) with Keychain credential
  storage, protocol-based services, an actor-based `JobCoordinator`, and the same
  validation-gated export rules.

## Technical context

- **Language/runtime**: TypeScript + React 19 + Vite 7 for the browser; Swift + SwiftUI (macOS 14+)
  for native. Yarn 1 scripts; Swift Package Manager under `macos/`.
- **Browser entry**: `src/web/main.tsx` → typed pathname router (`src/web/router.tsx`) →
  `WorkflowProvider` (`src/web/state/workflow-context.tsx`) → `AppShell` → page components.
- **Browser routing**: `/` is the unified dashboard (upload → configure → review panels driven by
  `activePanel`, synced to `?panel=`); `/setup` and `/review` deep-link into the corresponding
  panel; `/settings`, `/privacy`, and a not-found page round out the route map. `vercel.json`
  provides the SPA fallback.
- **State**: in-memory `WorkflowState` in a React context/reducer. Documents, result blobs,
  extracted text, prompts, and comparisons never persist; only the Gemini key is stored
  (browser: `localStorage`; native: Keychain).
- **Formatting pipeline**: `formatting.ts` (planning, Gemini, Markdown apply) +
  `docx-formatting.ts` (DOCX transform) + `formatting/style-plan.ts` (per-style deterministic ops).
  DOCX parse/format/extract run in a Web Worker (`src/web/workers/`) with a synchronous fallback.
- **Comparison**: `comparison/comparison-engine.ts` compares re-extracted result text against
  source with order-sensitive token equality; `move` ops switch to order-insensitive-but-complete;
  `expectedTextChanges` strips exactly the planned heading rewrites.
- **UI**: shadcn/ui primitives under `src/web/components/ui/`, feature components under
  `src/web/components/`, pages under `src/web/pages/` (lazy-loaded), DOCX/text preview panes under
  `src/web/components/preview/`.

## Current structure

```text
src/web/
  main.tsx                      # entry, lazy page loading, Suspense fallback
  router.tsx                    # typed route map + resolveRoute
  formatting.ts                 # plan requests, Gemini retry/stream/abort, Markdown apply
  docx-formatting.ts            # DOCX inspect/format/extract (worker-backed)
  style-profiles.ts             # named style tokens
  api-key-storage.ts            # localStorage key adapter
  state/
    workflow-context.tsx        # reducer + context
    formatting-flow.ts          # job orchestration
  formatting/style-plan.ts      # deterministic per-style ops + AI screening
  comparison/comparison-engine.ts
  preview/                      # text + DOCX evidence renderers
  workers/                      # DOCX Web Worker + client + fallback
  lib/                          # filename, diff, format, utils, download
  components/ + pages/ + hooks/ + types/ + validation/ + styles/

macos/
  Package.swift
  Sources/CamDocFormater/
    App/                        # AppShell, DesignSystem
    Domain/                     # Document, Formatting, Workflow models
    Services/                   # Gemini, Keychain, adapters, JobCoordinator, validation
    Features/                   # DocumentWorkflow, Preview, Settings
  Tests/                        # XCTest-style Swift Testing suites

tests/
  unit/web/                     # Vitest (jsdom) unit suites
  web/                          # Playwright specs + browser-boundary vitest
  fixtures/docx/                # generated DOCX matrix
```

## Key decisions

1. **Named styles are local** — `simple | modern | professional | easy-to-read | academic` apply
   presentation only, offline. Gemini is used only for the Custom style.
2. **Custom allows structural reorder** — `move` ops relocate whole sections; the content check
   becomes order-insensitive-but-complete. Add/delete/rewrite of non-heading content is screened out.
3. **Heading-only rewrites** — `rewrite-text` may retitle heading lines (full replacement line,
   1–200 chars). Exact expected lines are stripped from comparison so intentional renumbering
   doesn't block export; any other content change still does.
4. **Custom AI quality loop** — clarify description → format → verify → refine (corrective ops
   re-screened and merged, hard cap 2 rounds). Verification is a UI signal, never a validation signal.
5. **Gemini resilience** — `geminiCall` retries 3× with exponential backoff + jitter, honors
   `Retry-After`, supports `AbortSignal` cancellation, and uses the streaming endpoint when a
   progress callback is supplied. The native `HTTPGeminiClient` mirrors this with configurable retry
   and `Task` cancellation.
6. **DOCX off the main thread** — `JSZip` + XML parsing live in a Web Worker with a synchronous
   fallback for browsers without Worker support.
7. **Export suffix** — outputs get `_cam_formatted` before the extension (`src/web/lib/filename.ts`).
8. **PDF stays fail-closed** — no safe renderer/transform, so PDF preview is unavailable and export
   is blocked; the bytes are preserved untouched.

## Constitution check

| Principle | Result | Evidence |
|---|---|---|
| I. Native macOS Experience | PASS | Native SwiftUI product with Keychain, menus, keyboard commands; browser keeps a macOS-inspired visual language. |
| II. Privacy and User Control | PASS | Documents in memory only; API key is the sole persisted credential; network disclosure before any Gemini call. |
| III. Reliable Document Handling | PASS | Exact re-extraction validation; DOCX formatted only via package transform; fail-closed preview/export states. |
| IV. Testable Quality | PASS | Vitest + Playwright for web, Swift Testing for native; fixtures and bundle budget. |
| V. Simplicity and Maintainability | PASS | Minimal route map, focused components, single orchestration path, no global state framework. |

## Risks and mitigations

- **AI nodeID mismatch** — deterministic base plans guarantee visible formatting; screened AI ops
  that reference invalid nodes are dropped with warnings.
- **DOCX move safety** — only direct `w:body` children move; content equality is re-verified before export.
- **Bundle bloat** — heavy deps (`docx-preview`, `jszip`) load on demand; pages are `React.lazy`.
- **Deployment 404** — `vercel.json` SPA rewrite + client-side not-found page.
- **Unsafe preview markup** — all preview HTML is sanitized with DOMPurify.
