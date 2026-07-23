# Research: Document Beautifier

**Date**: 2026-07-23
**Feature**: [spec.md](spec.md)

## Decision: Use a canonical document IR and format adapters

**Rationale**: TXT, Markdown, DOCX, and PDF have incompatible semantics and fidelity limits. A canonical representation keeps content identity separate from presentation metadata, lets validation use one comparator, and lets each adapter fail closed when it cannot preserve a construct.

**Alternatives considered**:
- Sending a complete formatted file to Gemini: rejected because a model can rewrite, omit, reorder, or invent content.
- Converting every format to HTML: rejected as the sole representation because DOCX relationships, PDF geometry, assets, and document structure need explicit metadata.
- Editing each format independently: rejected because formatting and validation behavior would diverge.

## Decision: Gemini returns a constrained formatting plan, never document content

**Rationale**: The main process can validate a JSON-schema-constrained plan containing only presentation operations referencing existing node IDs. Local code remains responsible for content, serialization, and preservation enforcement.

**Alternatives considered**:
- Model-generated Markdown/DOCX/PDF: rejected for loss and content-modification risk.
- Model-generated free-form style instructions: rejected because operations cannot be deterministically checked.

## Decision: Keep browser and native privileged work in separate boundaries

**Rationale**: Browser code owns browser file inputs, in-memory processing, browser storage, and
downloads. Native code owns filesystem access, document processing, temporary workspaces, Keychain
access, and Gemini requests. The native product uses SwiftUI MVVM with Observation, Actors for
isolated jobs, `URLSession` for networking, Swift Package Manager, and native system dialogs.

**Alternatives considered**:
- Keeping Electron as native shell: rejected because it duplicates browser UI and weakens native
	macOS integration compared with SwiftUI.
- Sharing privileged code between browser and native products: rejected because browser and native
	filesystem, credential, storage, and download boundaries differ.

## Decision: Store only the Gemini API key in platform-appropriate secure storage

**Rationale**: Native Keychain provides set, replace, read, and remove without plaintext fallback.
The browser product uses its documented origin-scoped storage policy. The key is read only when a
job starts, held in memory for the shortest practical duration, and never logged.

**Alternatives considered**:
- Native encrypted settings file: viable, but Keychain is clearer for this credential-only requirement.
- Persisting the browser key outside origin-scoped storage: rejected by browser privacy boundaries.
- Plaintext settings storage: rejected by the privacy and security requirements.

## Decision: Process documents in per-job ephemeral workspaces

**Rationale**: Prefer in-memory buffers; when converters require files, create a random application-owned temporary directory with restrictive permissions and delete it in `finally` blocks. Startup recovery removes only stale directories with the application prefix.

**Alternatives considered**:
- Persisting extracted IR or generated files in `userData`: rejected by the no-retention requirement.
- Untracked system temp files: rejected because cleanup cannot be audited or recovered.

## Decision: Validate semantic round-trip, not bytes

**Rationale**: Beautification intentionally changes file bytes. Re-extracting the output and comparing canonical text, assets, tables, links, and structure allows presentation changes while blocking content loss or unsupported structure changes. Export is allowed only for a complete `pass`.

**Alternatives considered**:
- Byte equality: incompatible with formatting changes.
- Plain-text comparison: misses images, tables, hyperlinks, and structure.
- Screenshot comparison: useful as a supplemental rendering check, not a preservation guarantee.

## Decision: Use fail-closed capability policies per format

**Rationale**: Markdown, DOCX, and PDF cannot represent every feature of one another. Each adapter declares supported constructs and reports unsupported or inconclusive validation rather than silently dropping content.

**Format approach**:
- TXT: UTF-8 read/write with explicit newline and whitespace rules.
- Markdown: `unified`/`remark` AST with preservation of raw links, reference definitions, code blocks, and supported extensions.
- DOCX: inspect OOXML package parts with `JSZip` and XML processing; preserve relationships and media instead of reconstructing only high-level text.
- PDF: inspect with `pdfjs-dist` and generate supported layouts with `pdf-lib`; reject encrypted, ambiguous, or unsupported constructs.

## Decision: Package products with platform-native tooling

**Rationale**: The browser product deploys as a Vite output to Vercel. The native product uses
Swift Package Manager and Xcode archive/export workflows for signed `.app` and `.dmg` releases,
Developer ID signing, hardened runtime, notarization, and stapling.

**Alternatives considered**:
- electron-builder: rejected because Electron is removed from native product scope.
- Electron Forge: rejected for same reason.

## Decision: Test from pure logic through packaged app

**Rationale**: Preservation and security risks cross product and format boundaries. Use Vitest and
browser integration tests for web contracts, XCTest and Swift Testing for native contracts, fixture
round-trips for each format, and packaged native macOS smoke tests.

**Required cases**: source hash unchanged, rejected content-changing plans, failed/inconclusive
validation blocks export, cancellation cleanup, destination conflicts, Keychain lifecycle, browser
bundle boundary checks, native security settings, and startup stale-workspace cleanup.

## Open risks and bounded assumptions

- PDF reading order, annotations, forms, encryption, and fonts require an explicit support matrix; unsupported cases fail closed.
- DOCX extension parts, tracked changes, comments, footnotes, macros, and embedded objects require fixture coverage before being marked supported.
- App Sandbox entitlements and security-scoped bookmarks require native fixture testing before release claims. Swift package adapters and file grants must be tested in signed builds.
- Temporary cleanup cannot prevent OS swap, crash dumps, backups, or third-party converter caches; the application must avoid logs and persistent caches containing document content.
