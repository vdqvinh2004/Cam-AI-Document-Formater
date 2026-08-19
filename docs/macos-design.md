# macOS Design Notes

The desktop surface uses a safe title-bar inset, native menu roles, compact toolbar controls,
system focus rings, a minimum 900x620 window, and restrained translucent surfaces where the
platform supports them. Keyboard navigation remains equivalent to pointer interaction, and
reduced-motion preferences disable decorative transitions.

## DOCX preview

Native DOCX source/result preview renders read-only by extracting `word/document.xml` with
`/usr/bin/unzip -p` under a 20 MB package / 8 MB XML limit. Each render owns a
`cam-docx-preview-<UUID>` temporary directory that is removed on every path (success, partial,
and failure) before `render` returns. Embedded OLE objects degrade the preview to `partial`
with a warning; malformed packages and empty inputs report `unavailable`. Preview status stays
independent of validation-gated export, and no extracted text or preview state is persisted.