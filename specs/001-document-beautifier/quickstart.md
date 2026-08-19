# Quickstart Validation: Document Beautifier Web Refactor

## Prerequisites

- Node.js 22 LTS and Yarn.
- A Gemini API key for live generation; browser tests use a mocked response.
- DOCX fixtures containing headings, paragraphs, lists, tables, images, hyperlinks, and style differences.
- Optional PDF fixtures for renderer capability tests.

## Install and run

```bash
yarn install
yarn dev
```

Open the local URL and verify `/`, `/setup`, `/review`, `/settings`, `/privacy`, and an unknown path. Refresh `/privacy` and an unknown path to verify the Vite/Vercel SPA fallback. The active document and result must remain memory-only; a refresh should show a clear empty-state rather than restore document contents.

## Automated checks

```bash
yarn typecheck
yarn lint
yarn test
yarn test:e2e
yarn build
```

Latest validation (Wave 9): `yarn typecheck` pass; `yarn lint` pass; `yarn test` — unit suites
including `diff.test.ts`, `gemini-retry.test.ts`, and `hotkeys.test.tsx`; `yarn test:e2e` —
Playwright specs across shadcn-flow, browser-product, ui, docx-preview, and preview; `yarn build`
pass with lazy-loaded pages. Native: `swift test --package-path macos` including
`NativeRetryAndCancellationTests.swift`.

Focused regression checks must cover:

1. Privacy footer navigation renders a privacy page, not a server 404.
2. Unknown paths render the not-found page with a workspace link.
3. TXT/Markdown result preview uses actual result text and compare no longer compares against an empty string.
4. DOCX source/result previews are built from their actual package bytes; a result is never silently represented as plain text.
5. DOCX formatting applies run properties and moves from the plan and, when it succeeds, validation passes and export offers `*_cam_formatted.docx`; the result preview renders the transformed package.
6. DOCX preview renders text only: images, drawings, headers/footers, and nested run properties are not shown; embedded OLE objects produce a `partial` preview with a warning.
7. DOCX preview limits are 20 MB package / 8 MB document XML (browser output also capped at 250k characters); malformed packages fail closed to `unavailable`/`failed` with no preview.
8. Content must survive formatting 100% exactly (order-sensitive token equality). Any word changed, added, removed, or reordered blocks export; when structural `move` ops were applied, the content check is order-insensitive-but-complete (multiset) and reordering alone reports `presentation-changed`, never `content-changed`.
9. Named styles (simple, modern, professional, easy-to-read, academic) format locally without an API key or disclosure; every style produces a different, valid result (Markdown + DOCX), and list markers survive emphasis-wrapped formatting unchanged.
10. Custom style stays disabled until a stored API key, the disclosure confirmation, and a non-empty description exist; a mocked Gemini plan with a `move` op reorders sections and the comparison reports `Section order` while content stays complete.
11. Compare separates preserved content from presentation changes, reports `noChangesApplied` from the applied-op count, and uses a truthful unavailable state when evidence is insufficient.
12. UI controls remain keyboard-accessible and usable at narrow viewport sizes; deep links `/setup` and `/review` redirect to the dashboard with the right panel.
13. Source and generated document contents are absent from browser storage after reload/close; only the documented API-key storage remains.
14. Custom style runs the AI quality loop: description clarify → format → verify → (refine up to 2 rounds). A mocked verify that first fails then matches applies the corrective `rewrite-text` to a heading, reports `Rewritten headings` in the comparison, shows "AI verified the result matches your description." in the status and comparison summary, and export stays enabled only when the content check passes.
15. An intentional heading rewrite via `expectedTextChanges` strips exactly the expected source and replacement lines; any other content difference still blocks export.
16. Gemini calls retry on transient 429/500 (3 attempts, exponential backoff + jitter, `Retry-After`
    honored) and abort when the workflow is reset; `gemini-retry.test.ts` mocks each scenario.
17. DOCX inspect/format/extract run in a Web Worker (`src/web/workers/`) with a synchronous fallback
    when `Worker` is unavailable; results match the synchronous path on fixtures.
18. The review panel offers a `toggle-diff` button that renders a word-level diff (additions green,
    removals red) between source and result text.
19. Keyboard shortcuts work: `⌘+Enter` starts formatting, `⌘+1/2/3` switch panels,
    `⌘+Shift+R` resets the workflow (Ctrl on non-macOS).

## Manual DOCX scenario

1. Upload a DOCX with visible styles and embedded content.
2. Confirm the source preview renders from the original package and lists any unsupported features.
3. Select a style and start formatting.
4. If DOCX transformation is not implemented, verify the UI says formatting/export is unavailable instead of claiming success or offering an unchanged file as formatted.
5. If transformation is implemented, verify result preview uses the output package, validation passes before export, and compare summarizes presentation changes without claiming content changes.

## Optional PDF scenario

Use a PDF fixture only when the local PDF renderer is enabled. Verify page preview and comparison evidence. Otherwise verify an explicit unavailable message and that validation-gated export behavior is unchanged.
