# Format support

Cam DocFormater currently has four format adapters with different preservation guarantees.

| Format | Current behavior | Export |
| --- | --- | --- |
| TXT | UTF-8 text, line order, whitespace content, presentation-only plan | Supported |
| Markdown | Headings, paragraphs, lists (emphasis distinct per style), and block reorder (`move` ops) | Supported |
| DOCX | Package transformation: run properties (`bold`, `italic`, `fontSize`, `fontFamily`, `color`) written as `w:rPr`; block reorder via `w:p` moves | Supported |
| PDF | Reading-order/layout preservation is currently inconclusive | Blocked |

Export is enabled only when a fresh round-trip validation returns `pass`. Content must be
preserved 100% exactly: the formatted result is re-extracted and compared against the source
with order-sensitive token equality (whitespace, Markdown markers, and DOCX run properties
count as presentation, not content). When structural reorders (`move` ops, Custom style) are
applied the content check becomes order-insensitive-but-complete (multiset) — every token must
survive, reordering alone is presentation. Any word added, removed, or rewritten blocks
export and preserves the original file. Unsupported or inconclusive structure fails closed and
leaves the source untouched. The DOCX preview states, supported OOXML elements, sanitization
rules, resource limits, and the relationship between preview status and validation-gated
export are defined in [docs/preview-contract.md](preview-contract.md).

## Style application

- Named styles (simple, modern, professional, easy-to-read, academic) apply deterministically
  on-device with `src/web/formatting/style-plan.ts` — no network call.
- Custom style requires a non-empty description and a stored Gemini API key (plus the
  disclosure confirmation); it may emit structural `move` ops, which are screened for valid
  nodeIDs, bounds, and presentation-only fields before application. The Gemini prompt includes
  the document node map (each line with its node ID), so section moves target the right nodes;
  the custom plan is applied as returned by Gemini — no style is force-applied, so a request
  to keep the formatting unchanged is honored.
- Custom descriptions are first clarified by Gemini (rephrased into precise formatting steps,
  with a content-impact warning when the request renumbers or rewrites headings), then the
  formatted result is verified against the clarified description. A failed verification returns
  corrective operations that are screened and merged back into the plan and re-applied, up to
  a hard cap of 2 refinement rounds (3 verify calls); the verification outcome is shown in the
  job status and the comparison summary.
- `rewrite-text` ops (Custom style only) may retitle heading lines — full replacement line,
  1-200 characters, headings only, `#` markers kept for Markdown, plain text for DOCX. The
  comparison engine strips those exact expected heading lines (`expectedTextChanges`), so an
  intentional renumbering does not block export; any other content change still does.
- Exported files get the `_cam_formatted` suffix (`report_cam_formatted.docx`), used by
  `src/web/lib/filename.ts` in the Download action, Review header, and comparison summary.

## DOCX preview capabilities

Both products render a read-only DOCX source preview before generation and a formatted-result
preview after a successful validation pass:

- Text from paragraphs, headings, lists, tables, and hyperlinks in `word/document.xml`.
- Explicit partial-preview state with a warning when embedded OLE objects (`w:object`) exist:
  "DOCX preview is partial" / "Some embedded DOCX objects are not rendered."
- Explicit unavailable messaging for empty files, malformed packages, unreadable XML, and
  packages over the 20 MB package / 8 MB document-XML limits (browser output also capped at
  250k characters).
- Comparison is text-based only and exact: the formatted output must contain 100% of the
  source content — same words, same order — with only presentation allowed to differ. DOCX
  formatting applies `bold`, `italic`, `fontSize`, `fontFamily`, and `color` (hex) to runs and
  reorders `w:p` blocks for `move` ops. The result preview renders the formatted package with
  the same contract as the source preview.

## Unsupported OOXML features

Images, drawings, headers/footers, nested run properties, themes, and styles are not rendered.
Embedded objects degrade the preview to `partial`; they never block source-preview rendering.

## Troubleshooting

- **Malformed DOCX shows no preview** — expected fail-closed behavior. The web tester may
  report `unavailable` where macOS reports `failed` because JSZip tolerates some ZIP
  corruption that `/usr/bin/unzip` rejects.
- **Preview is `partial`** — the document contains embedded OLE objects; surrounding text
  renders and a warning lists the limitation.
- **Large documents** — linear text extraction with the limits above; a 1,600-paragraph
  fixture renders well within limits on both platforms.
- **Preview says ready but export is blocked** — correct: preview status is independent of
  validation; export requires a fresh validation `pass`.