# DOCX preview contract

The DOCX preview path is read-only. It extracts text and structure from the source package
in memory and reports one of four truthful states. Preview never proves content preservation
and never enables export by itself — export stays gated behind fresh round-trip validation.

## Preview states

| State | Meaning | User treatment |
| --- | --- | --- |
| `rendered` | Text extraction completed with no unsupported OOXML features detected | Full source/result preview and comparison. |
| `partial` | Text extracted, but at least one unsupported feature was detected (currently embedded OLE/`w:object` elements) | Preview shown with an explicit warning; comparison remains available on extracted text. |
| `unavailable` | The package could not be read, is empty, or exceeds limits | No preview; explicit unavailable message. |
| `failed` | Rendering raised an unexpected error | No preview; explicit failure message, source untouched. |

## Supported OOXML elements

Text is extracted from `<w:p>` paragraphs and `<w:t>` text runs in `word/document.xml`.
Headings, paragraphs, lists, tables, and hyperlinks therefore appear in preview text.
Nested formatting (bold/italic/color) is flattened to plain text in previews.

## Explicitly unsupported

- Embedded OLE objects (`<w:object>`) → partial state plus a warning; the surrounding text still renders.
- Images, drawings, and headers/footers are not rendered or extracted.
- Nested run properties, themes, and styles are flattened to text.
- The browser renderer reads the package with JSZip; the native renderer shells out to
  `/usr/bin/unzip -p`. Neither writes back into the source archive.

## Sanitization and resource limits

- Package limit: 20 MB (`MAX_PACKAGE_BYTES`). Larger inputs are `unavailable`.
- Document XML limit: 8 MB (`MAX_XML_BYTES`). Larger XML is `unavailable`.
- Browser preview output is capped at 250,000 characters.
- Native rendering writes the package and extracted XML to a per-render temporary
  directory (`cam-docx-preview-<UUID>`) that is removed as soon as rendering returns,
  on every path including failures.
- No extracted text, rendered resources, or preview state is persisted on either platform.

## Status vs. export

Preview `rendered`/`partial`/`unavailable`/`failed` status is independent of validation.
`compareAvailable` and the export button are driven only by a fresh validation `pass` after a
real package transformation. A preview status of `rendered` never implies export eligibility.

## Known platform differences

- The browser (JSZip) tolerates some ZIP corruption that `/usr/bin/unzip` rejects, so a
  tampered package may yield `unavailable` on the web and `failed` on macOS. Tests accept
  either state as a valid fail-closed result.