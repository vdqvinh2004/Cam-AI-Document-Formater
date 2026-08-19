# Security review

Cam DocFormater ships as two products with one preservation rule. This review covers the current
runtime model; the Electron prototype it replaced is retired.

## Native macOS app (`macos/`)

- SwiftUI (macOS 14+) with App Sandbox entitlements (`macos/CamDocFormater.entitlements`) and
  user-selected file access; no Node/Electron runtime.
- The Gemini API key is stored only through macOS Keychain (`KeychainCredentialStore`); it is never
  rendered, logged, or returned in job payloads.
- File access goes through a narrow `FileAccess` protocol; sources are read read-only and export
  uses a native save dialog. Export rejects the source path and existing destinations, and writes
  atomically via a temporary file + rename.
- The `JobCoordinator` actor serializes job state; formatting plans are schema-validated against the
  document and reject content-changing operations before application.
- Preview extraction uses a per-render temporary directory (`cam-docx-preview-<UUID>`) that is
  removed on every path, and stale workspaces are cleaned up.
- Export requires a fresh validation `pass`; `fail` and `inconclusive` are terminal blockers.
- Known release work: Developer ID signing and notarization must be supplied in the release
  environment; DOCX/PDF adapters remain fail-closed for unsupported preservation cases.

## Browser (Cam DocFormater Online, `src/web/`)

- No filesystem authority: uploads are held in memory, format detection is allowlisted, and export
  uses a browser download.
- The Gemini key is stored only in origin-scoped `localStorage` under `camdoc.gemini-api-key`; it is
  never rendered or logged. Keys, prompts, responses, and document text are never persisted.
- A network disclosure must be confirmed before any Gemini request. DOCX processing runs in a Web
  Worker; the boundary tests assert no `node:`, `fs`, `electron`, `keytar`, or `ipcRenderer` imports
  in browser code.
- All preview HTML is sanitized with DOMPurify before insertion. DOCX previews are read-only text
  extraction with explicit `rendered`/`partial`/`unavailable`/`failed` states and resource limits
  (20 MB package / 8 MB XML / 250k-character output).
- Vercel serves only the static bundle. It must not receive a persistent Gemini credential or
  document content through build-time environment variables. Production domains should be reviewed
  for CSP, HTTPS, allowed origins, and retention before promotion.
