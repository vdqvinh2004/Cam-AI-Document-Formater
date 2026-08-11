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

Focused regression checks must cover:

1. Privacy footer navigation renders a privacy page, not a server 404.
2. Unknown paths render the not-found page with a workspace link.
3. TXT/Markdown result preview uses actual result text and compare no longer compares against an empty string.
4. DOCX source/result previews are built from their actual package bytes; a result is never silently represented as plain text.
5. DOCX formatting is reported as unavailable unless a real package transformation and validation pass exist.
6. DOCX preview renders text only: images, drawings, headers/footers, and nested run properties are not shown; embedded OLE objects produce a `partial` preview with a warning.
7. DOCX preview limits are 20 MB package / 8 MB document XML (browser output also capped at 250k characters); malformed packages fail closed to `unavailable`/`failed` with no preview.
6. Compare separates preserved content from presentation changes and uses a truthful unavailable state when evidence is insufficient.
7. UI controls remain keyboard-accessible and usable at narrow viewport sizes.
8. Source and generated document contents are absent from browser storage after reload/close; only the documented API-key storage remains.

## Manual DOCX scenario

1. Upload a DOCX with visible styles and embedded content.
2. Confirm the source preview renders from the original package and lists any unsupported features.
3. Select a style and start formatting.
4. If DOCX transformation is not implemented, verify the UI says formatting/export is unavailable instead of claiming success or offering an unchanged file as formatted.
5. If transformation is implemented, verify result preview uses the output package, validation passes before export, and compare summarizes presentation changes without claiming content changes.

## Optional PDF scenario

Use a PDF fixture only when the local PDF renderer is enabled. Verify page preview and comparison evidence. Otherwise verify an explicit unavailable message and that validation-gated export behavior is unchanged.
