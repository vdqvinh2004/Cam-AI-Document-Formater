# Research: Document Beautifier

**Date**: 2026-07-29
**Feature**: [spec.md](spec.md)

## Decision: Use a focused internal page/component architecture with a minimal pathname router

**Rationale**: The browser product is a Vite/React SPA with a small number of static workflow pages and no existing routing dependency. A typed route map and shared in-memory workflow context satisfy navigation, privacy, and not-found requirements with less bundle and maintenance cost than a full routing framework. The route layer must render `/`, `/setup`, `/review`, `/settings`, `/privacy`, and a not-found page, while Vercel's existing SPA rewrite remains deployment support.

**Alternatives considered**:
- React Router: conventional but adds dependency and abstraction not required by the current route set.
- TanStack Router: strong type safety but excessive for this small static route graph.
- Pathname conditionals inside one component: rejected because it preserves the current monolith and makes route accessibility and testing harder.

## Decision: Extract product components while keeping document state ephemeral

**Rationale**: Split the current `main.tsx` into route pages and focused components for app shell/navigation, upload, formatting controls, status, preview, comparison, and export. Share one in-memory workflow store/context between pages. Refresh loses document state by design; pages must show a clear empty-state recovery action rather than persisting document contents.

**Alternatives considered**:
- Persisting source/result state in localStorage or IndexedDB: rejected by the no-document-retention requirement.
- Introducing a global state framework: rejected until the in-memory context becomes insufficient.

## Decision: Use selective headless accessible UI primitives, styled by the existing macOS-inspired design system

**Rationale**: A headless library supplies difficult keyboard, focus, dialog, tab, and disclosure behavior without imposing a competing visual theme. Radix UI primitives are recommended for the small set of required interactions; product components retain the warm paper, restrained cards, typography, spacing, and control styling already aligned with macOS conventions. Dependency adoption should be limited to primitives with a concrete accessibility need.

**Alternatives considered**:
- Full visual frameworks such as MUI, Ant Design, or Chakra: rejected because they impose a different visual language and increase bundle/runtime surface.
- Ariakit or React Aria Components: viable alternatives; choose one after validating package weight and integration effort, but do not mix libraries unnecessarily.
- Custom keyboard/focus behavior for every widget: rejected because it increases accessibility regression risk.

## Decision: Treat DOCX formatting capability and DOCX preview capability as separate contracts

**Rationale**: The current browser implementation returns the original DOCX blob from `formatSource`, so it cannot produce a changed DOCX. The current `docx-preview` fallback extracts text and cannot prove rich formatting. The refactor must render source/result from actual package bytes and truthfully distinguish preview-only behavior from real formatting/export. A DOCX output may only be called formatted after a safe OOXML package transformation and semantic round-trip validation; otherwise export remains unavailable with an actionable explanation.

**Alternatives considered**:
- Rebuild DOCX from extracted text: rejected because it loses relationships, media, tables, hyperlinks, numbering, and unsupported OOXML parts.
- Claim the unchanged source blob as a formatted result: rejected as misleading and the direct cause of the reported bug.
- Use screenshot comparison as preservation proof: rejected; useful only as supplemental presentation evidence.

## Decision: Model comparison as content evidence plus presentation summary

**Rationale**: The current compare input passes an empty output string for TXT/Markdown, and the generic line diff cannot explain formatting. Pass actual result text, compare semantic content separately from presentation metadata, and return explicit categories: content preserved, presentation changed, content changed, and unavailable. Render concise human-readable summaries with affected sections/format features rather than raw XML or meaningless line noise.

**Alternatives considered**:
- Generic line diff for every format: rejected because formatting markup and package XML produce noisy, misleading output.
- Screenshot-only diff: rejected because it cannot prove semantic content preservation.
- No comparison: rejected because users need to understand the result before export.

## Decision: Keep PDF preview optional and fail truthful

**Rationale**: PDF preview can be added with a dedicated local renderer such as PDF.js only if bundle size, worker configuration, and security behavior are acceptable. It must not block the primary page refactor, DOCX fix, or user-friendly compare work. Until implemented and tested, PDF receives an explicit preview-unavailable state and remains governed by validation/export capability.

**Evaluation outcome (2026-07-29)**: Rejected for this refactor. PDF.js would add a worker/runtime bundle and CSP configuration that are not justified while PDF formatting is not implemented. The browser currently preserves PDF bytes, reports preview unavailable and validation inconclusive, and blocks export. No PDF.js dependency or fixture is added; this fail-closed behavior is covered by the preview/comparison contracts.


**Alternatives considered**:
- Extract PDF text and display it as a preview: rejected when it would imply faithful page/layout rendering.
- Add PDF.js before stabilizing current workflow: rejected because it expands scope and can delay core bug fixes.

## Decision: Provide explicit privacy and not-found routes plus SPA fallback verification

**Rationale**: `/privacy` currently has an absolute footer link but no route/page. Add a real privacy page and client-side fallback, then test direct navigation and refresh through the Vite/Vercel deployment path. Unknown paths render a helpful not-found page. Keep the rewrite in `vercel.json` as defense in depth and verify the active deployment uses it.

**Alternatives considered**:
- Footer link to an external static document: rejected because it does not solve in-app navigation and deployment behavior.
- Rely only on Vercel rewrite: rejected because the application still lacks route semantics and non-Vercel hosts may return 404.
