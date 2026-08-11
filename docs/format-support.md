# Format support

Cam DocFormater currently has four format adapters with different preservation guarantees.

| Format | Current behavior | Export |
| --- | --- | --- |
| TXT | UTF-8 text, line order, whitespace content, presentation-only plan | Supported |
| Markdown | Headings, paragraphs, and opaque code-block lines | Supported for the represented subset |
| DOCX | Read-only preview renders package text; package transformation is not yet implemented | Blocked until package parts can be preserved |
| PDF | Reading-order/layout preservation is currently inconclusive | Blocked |

Export is enabled only when a fresh round-trip validation returns `pass`. Unsupported or
inconclusive structure fails closed and leaves the source untouched. The DOCX preview states,
supported OOXML elements, sanitization rules, resource limits, and the relationship between
preview status and validation-gated export are defined in
[docs/preview-contract.md](preview-contract.md).

## DOCX preview capabilities

Both products render a read-only DOCX source preview before generation and a formatted-result
preview after a successful validation pass:

- Text from paragraphs, headings, lists, tables, and hyperlinks in `word/document.xml`.
- Explicit partial-preview state with a warning when embedded OLE objects (`w:object`) exist:
  "DOCX preview is partial" / "Some embedded DOCX objects are not rendered."
- Explicit unavailable messaging for empty files, malformed packages, unreadable XML, and
  packages over the 20 MB package / 8 MB document-XML limits (browser output also capped at
  250k characters).
- Comparison is text-based only: it summarizes extracted-text differences and never claims
  visual or content preservation.

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