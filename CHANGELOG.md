# Changelog

## Unreleased — Document Beautifier Web Refactor

- Added pathname-routed browser workspace, setup, review, settings, privacy, and not-found pages.
- Added truthful DOCX preview/comparison evidence and fail-closed export validation.
- Added macOS-inspired design tokens, Radix keyboard-accessible format controls, job status feedback, and privacy/storage coverage.
- Named styles (simple/modern/professional/easy-to-read/academic) now apply deterministically on-device via a per-style plan — no Gemini call; Gemini is used only for the Custom style, which requires a description, the disclosure confirmation, and a stored API key.
- Custom plans may emit structural `move` ops (block reorder in Markdown and `w:p` in DOCX); Gemini output is screened for valid nodeIDs, bounds, and presentation-only fields, and list markers are kept outside emphasis so formatted content tokenizes exactly.
- Custom-style prompts now include the document node map (line/node texts), so move instructions like "move section 2.6 before 2.4" target the right nodes; the custom plan is applied as returned by Gemini without forcing a base style, so "keep the formatting" instructions are honored.
- DOCX previews render fitted to the preview column (no horizontal overflow) with per-pane vertical scrolling, eliminating Before/After overlap.
- DOCX transformation implemented: run properties (`bold`, `italic`, `fontSize`, `fontFamily`, `color`) and block moves written into the package; result preview renders the transformed package under the same contract.
- Export filenames carry the `_cam_formatted` suffix via `src/web/lib/filename.ts`.
- Comparison engine reports `noChangesApplied` from the applied-op count, treats Markdown as presentation-tolerant, and falls back to an order-insensitive-but-complete (multiset) content check when structural moves are present.
- Custom-style results now go through an AI quality gate: the description is clarified (with a content-impact warning when it would renumber/reword headings), the formatted result is verified against the description, and corrective operations are screened and re-applied up to 2 refinement rounds (hard cap) before the result is finalized.
- Custom plans may now emit `rewrite-text` ops limited to heading nodes (full replacement line, 1-200 characters); the comparison engine strips those exact expected heading lines (`expectedTextChanges`) so intentional renumbering no longer blocks export, while any other content change still does.
- Kept PDF preview explicitly unavailable until a safe, justified PDF renderer is added.

Validation: `yarn lint`, `yarn typecheck`, `yarn test` (14 files / 116 tests), `yarn test:e2e` (51 tests), and `yarn build` all pass.
