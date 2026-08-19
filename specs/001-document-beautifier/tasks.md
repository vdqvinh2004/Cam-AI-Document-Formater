---
description: "Executable task list for the Document Beautifier feature"
---

# Tasks: Document Beautifier (Web + Native macOS)

**Input**: Design documents from `/specs/001-document-beautifier/`

**Status**: Waves 1–9 implemented. Only the small remaining items below are open.

---

## Completed waves

| Wave | Scope | Status |
|---|---|---|
| 1 | Web SPA refactor: routes, workflow store, DOCX/text preview, comparison, validation gate | ✅ |
| 2 | shadcn/ui + Tailwind v4 overhaul; unified `/` dashboard with upload → configure → review panels | ✅ |
| 3 | Native macOS SwiftUI app: adapters, Gemini client, Keychain, validation-gated export, packaging | ✅ |
| 4 | Cross-product preview & comparison contract (`docs/preview-contract.md`) | ✅ |
| 5 | DOCX preview partial/unavailable states; sanitized read-only rendering | ✅ |
| 6 | Content-exact verification (order-sensitive token equality); workspace UX; no-op detection | ✅ |
| 7 | Deterministic local styles; Custom `move` ops; `_cam_formatted` suffix; cleanup of dead code | ✅ |
| 8 | Custom-style AI quality loop: clarify → format → verify → refine (cap 2); heading-only `rewrite-text` | ✅ |
| 9 | Gemini retry/abort/streaming; DOCX Web Worker; lazy loading; diff view; hotkeys; a11y; native retry | ✅ |

Full per-task history (T001–T238, T300–T328) was previously recorded in this file and is
collapsed here; the code and tests remain the source of truth.

---

## Remaining open items

### Wave 9 leftovers

- [ ] **T310** Verify bundle budget after code splitting — run `yarn build`, confirm the main chunk is
  under 80 kB gzipped, and add the assertion to `tests/unit/web/bundle-budget.test.ts`.
- [ ] **T317** Add a "Keyboard shortcuts" hint (`⌘ Enter` to format) in `FormatControls.tsx`.
- [ ] **T320** Add a focus-trap hook for the settings panel / future dialogs; restore focus on close.
- [ ] **T321** Audit keyboard navigation through upload → configure → format → export; add
  `aria-describedby` links from controls to helper text.
- [ ] **T322** Add `tests/unit/web/accessibility.test.tsx` covering `aria-live` announcements and
  focus-trap behavior.

### Verification

- [ ] **T323** Run `yarn typecheck && yarn lint && yarn test && yarn test:e2e && yarn build`; record
  results in `quickstart.md`.
- [ ] **T325** Update the `quickstart.md` checklist with retry mocks, worker fallback, diff-view
  toggle, and keyboard-shortcut verification steps.

---

## Future backlog (not scheduled)

Ideas retained from the earlier optimization review, in rough value order:

1. **Interactive section reordering** — expose the existing `move` op as drag-and-drop in preview
   (data model already supports it).
2. **Style presets** — save/load named instruction presets to `localStorage`.
3. **Export HTML/RTF** — additional hand-off formats from the formatting plan.
4. **Undo/redo** — small `(source, plan)` history stack for the formatting workflow.
5. **Shared domain package** — deduplicate web/native models (`FormattingPlan`, `ValidationResult`).

---

## Verification commands

```bash
yarn typecheck && yarn lint && yarn test && yarn test:e2e && yarn build
```

Native:

```bash
swift test --package-path macos
./scripts/package-macos.sh
```

Platform gaps and prerequisites: `specs/001-document-beautifier/quickstart.md`.
