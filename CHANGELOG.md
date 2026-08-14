# Changelog

## Unreleased — Document Beautifier Web Refactor

- Added pathname-routed browser workspace, setup, review, settings, privacy, and not-found pages.
- Added truthful DOCX preview/comparison evidence and fail-closed export validation.
- Added macOS-inspired design tokens, Radix keyboard-accessible format controls, job status feedback, and privacy/storage coverage.
- Named styles (simple/modern/professional/easy-to-read/academic) now apply deterministically on-device via a per-style plan — no Gemini call; Gemini is used only for the Custom style, which requires a description, the disclosure confirmation, and a stored API key.
- Custom plans may emit structural `move` ops (block reorder in Markdown and `w:p` in DOCX); Gemini output is screened for valid nodeIDs, bounds, and presentation-only fields, and list markers are kept outside emphasis so formatted content tokenizes exactly.
- DOCX transformation implemented: run properties (`bold`, `italic`, `fontSize`, `fontFamily`, `color`) and block moves written into the package; result preview renders the transformed package under the same contract.
- Export filenames carry the `_cam_formatted` suffix via `src/web/lib/filename.ts`.
- Comparison engine reports `noChangesApplied` from the applied-op count, treats Markdown as presentation-tolerant, and falls back to an order-insensitive-but-complete (multiset) content check when structural moves are present.
- Kept PDF preview explicitly unavailable until a safe, justified PDF renderer is added.

Validation: `yarn lint`, `yarn typecheck`, `yarn test` (13 files / 102 tests), `yarn test:e2e` (49 tests), and `yarn build` all pass.
