# Browser Design Boundary

Shared presentation components accept typed platform callbacks. Browser-only controls cover
upload/drop, download, API-key persistence, preview, and privacy messaging. Native menus,
Keychain access, macOS dialogs, and native title-bar behavior remain desktop-only.

## DOCX preview

The browser renders DOCX source/result previews in memory with JSZip (see
[docs/web-security.md](web-security.md) for why it is not an export path). Statuses are
`rendered`, `partial` (embedded OLE objects present, with an explicit warning), `unavailable`
(empty, malformed, or over the 20 MB package / 8 MB XML / 250k-character limits), and `failed`.
Preview output is a sanitized text model with explicit feature warnings and no persistent
document or preview state (`tests/web/privacy-storage.spec.ts` proves nothing survives after
completion, reset, or reload). Compare mode diffs extracted text and never implies content
preservation.