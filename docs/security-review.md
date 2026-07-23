# Security review

- Electron windows use context isolation, sandboxing, disabled Node integration, web security, denied window creation, and denied navigation.
- Renderer code receives a narrow `contextBridge` API; it never receives `ipcRenderer`, filesystem access, the API key, document bytes, prompts, or temporary paths.
- The Gemini API key is stored only through macOS Keychain using `keytar`.
- Source paths are selected through native dialogs and remain in main-process job state.
- Job workspaces are OS temporary directories and stale workspaces are cleaned at startup.
- Formatting plans are schema-validated, reference existing node IDs, and reject content-changing operations.
- Export requires validation `pass`, rejects the source path, rejects existing destinations, and uses an atomic temporary-file rename.

Known release work: signing and notarization credentials/entitlements must be supplied in the release environment; DOCX/PDF adapters remain fail-closed for unsupported preservation cases.
