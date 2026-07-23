# Format support

Cam DocFormater currently has four format adapters with different preservation guarantees.

| Format | Current behavior | Export |
| --- | --- | --- |
| TXT | UTF-8 text, line order, whitespace content, presentation-only plan | Supported |
| Markdown | Headings, paragraphs, and opaque code-block lines | Supported for the represented subset |
| DOCX | Package text extraction with unsupported package parts declared | Blocked until package parts can be preserved |
| PDF | Reading-order/layout preservation is currently inconclusive | Blocked |

Export is enabled only when a fresh round-trip validation returns `pass`. Unsupported or inconclusive structure fails closed and leaves the source untouched.
