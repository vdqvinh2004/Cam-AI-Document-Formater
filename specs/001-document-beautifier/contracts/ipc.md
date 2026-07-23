# IPC Contract: Document Beautifier

The renderer accesses the main process only through a narrow typed preload API. All inbound payloads are runtime-validated and all operations are correlated by `jobId`. No generic IPC, filesystem API, shell execution, API key, raw document content, or unrestricted Electron object is exposed to the renderer.

## Renderer to Main

### `documents:select`

Opens a native macOS file dialog filtered to TXT, Markdown, DOCX, and PDF. Returns a safe `SourceSummary` or a user-safe cancellation/error result. The renderer never supplies an arbitrary path for privileged access.

### `documents:accept-drop`

Accepts a drag/drop file reference after main-process path authorization and format detection. Rejects folders, multiple files, unsupported formats, unreadable files, and source paths outside the user-authorized selection.

### `settings:key-status`

Returns `{ configured: boolean }`; never returns the key.

### `settings:set-key`

Payload: `{ apiKey: string }`. Validates non-empty bounded input, stores it in macOS Keychain, and returns `{ configured: true }`.

### `settings:remove-key`

Deletes the Keychain value and returns `{ configured: false }`.

### `jobs:start`

Payload: `{ jobId: string, profile: FormattingProfile, disclosureAccepted: true }`. Main re-reads the Keychain value, resolves the source from the active job, sends only the necessary formatting context after explicit confirmation, and returns an accepted job state. The renderer cannot provide the credential or arbitrary document bytes.

### `jobs:cancel`

Payload: `{ jobId: string }`. Requests cancellation. Main transitions the job to `cancelled` after active operations stop and cleans the temporary workspace.

### `exports:choose-destination`

Payload: `{ jobId: string }`. Opens a native save dialog using the source format extension. Main rejects the source path and any destination that cannot be safely written.

### `exports:commit`

Payload: `{ jobId: string, destinationPath: authorized-save-token }`. Main accepts only a destination token issued by the native save dialog and only when validation status is `pass`; writes atomically and returns an `ExportSummary`.

## Main to Renderer Events

### `jobs:progress`

`{ jobId, stage: 'loading' | 'extracting' | 'generating' | 'applying' | 'validating' | 'exporting' | 'cleaning', percent?: number, message: string }`

### `jobs:validation`

`{ jobId, result: ValidationResultSummary }`, where issues contain categories and safe descriptions but no raw document content.

### `jobs:state`

`{ jobId, state: JobState, error?: UserSafeError }`

## Safety Rules

- API keys, prompts, Gemini responses, document text, temporary paths, and full source paths MUST NOT appear in renderer event payloads or logs.
- Every handler rejects unknown fields, oversized strings, invalid IDs, invalid state transitions, and requests for inactive jobs.
- A renderer restart does not grant access to an existing job; main reauthorizes job ownership and can clean abandoned state.
- Export requires a complete validation `pass`; `fail` and `inconclusive` are terminal blockers.
