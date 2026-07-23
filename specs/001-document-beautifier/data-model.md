# Data Model: Document Beautifier

## SourceDocument

Represents the user-selected input during one active job.

| Field | Type | Rules |
|---|---|---|
| `jobId` | string | Unique per processing attempt; never reused during a session |
| `sourcePath` | path reference | Resolved and authorized by main process; read-only |
| `format` | `txt \| markdown \| docx \| pdf` | Derived from content detection and allowlisted extension |
| `sourceHash` | SHA-256 | Captured before processing and checked after every write/export |
| `sizeBytes` | number | Positive; bounded by configured processing limit |
| `ir` | CanonicalDocument | Held ephemerally; never persisted |
| `capabilities` | FormatCapabilities | Declares supported preservation features |

## CanonicalDocument

Format-neutral representation used for formatting and validation.

| Field | Type | Rules |
|---|---|---|
| `documentId` | string | Stable only within the current job |
| `metadata` | DocumentMetadata | Metadata is preserved unless a presentation rule explicitly changes it |
| `blocks` | BlockNode[] | Ordered; node IDs are unique and immutable |
| `assets` | AssetNode[] | Stable IDs, placement references, and content hashes |
| `links` | LinkNode[] | Stable IDs, anchor references, and targets |
| `capabilities` | FormatCapabilities | Unsupported source features make validation fail or inconclusive |
| `presentation` | PresentationDefaults | Separate from content identity |

### BlockNode

A discriminated union of `paragraph`, `heading`, `list`, `table`, `caption`, `footnote`, `pageBreak`, and supported raw/opaque nodes. Every node has an immutable `nodeId`, ordered children where applicable, and presentation metadata separate from content.

### InlineNode

A discriminated union of `text`, `link`, `imageReference`, `break`, `bookmark`, and supported inline nodes. Text values and link targets are preservation data; typography is presentation data.

### TableNode

Contains ordered rows and cells, cell text/inline nodes, merged-cell topology, table identity, and presentation fields such as borders, widths, and padding.

### AssetNode

Contains `assetId`, media type, byte or decoded-content hash, dimensions, placement references, and ephemeral bytes/path. Asset bytes are never included in logs or persisted application state.

### LinkNode

Contains `linkId`, source inline node ID, anchor text reference, target URL or internal bookmark, title, and relationship metadata.

## FormattingProfile

| Field | Type | Rules |
|---|---|---|
| `style` | `simple \| modern \| professional \| easy-to-read \| academic \| custom` | Required allowlisted value |
| `instructions` | string? | Optional; bounded length; formatting-only language |
| `styleTokens` | StyleTokenSet | Resolved locally from the selected style |

Custom instructions are screened for requests to rewrite, add, remove, merge, split, reorder, or rename content. The job is rejected or the offending instruction is ignored with user feedback.

## FormattingJob

State machine for one user-initiated attempt:

```text
created -> source-loaded -> awaiting-confirmation -> generating -> validating -> ready-to-export -> exported
                    |              |                 |             |
                    +--------------+-----------------+-------------+-> failed
                    +------------------------------------------------> cancelled
```

| Field | Type | Rules |
|---|---|---|
| `jobId` | string | Correlates all IPC requests/events |
| `state` | JobState | Only valid transitions are accepted |
| `source` | SourceDocument | Ephemeral; source remains untouched |
| `profile` | FormattingProfile | Captured at generation start |
| `plan` | FormattingPlan? | Must pass schema and node-reference checks |
| `validation` | ValidationResult? | Required and `pass` before export |
| `tempWorkspace` | path reference | Main-process-owned and cleaned on terminal state |
| `error` | UserSafeError? | Must not include API key, raw document text, or sensitive paths |

## FormattingPlan

Model output accepted only after schema validation.

- `version`: contract version
- `operations`: ordered presentation operations referencing existing node IDs
- `warnings`: optional safe user-facing warnings

Allowed operations include applying style tokens, changing typography, spacing, indentation, alignment, margins, page breaks, table borders/widths/padding, and existing-node presentation. Operations that add, remove, rewrite, split, merge, reorder, or rename content are rejected.

## ValidationResult

| Field | Type | Rules |
|---|---|---|
| `status` | `pass \| fail \| inconclusive` | Only `pass` enables export |
| `sourceHash` | SHA-256 | Must match the source captured at load |
| `checks` | ValidationCheck[] | Text, assets, tables, links, structure, and source immutability |
| `issues` | ValidationIssue[] | Includes category, node/asset ID where available, and safe explanation |
| `validatedAt` | timestamp | Ephemeral diagnostic metadata |

## ExportedDocument

Represents a validated output written only after destination selection.

- Same `format` as `SourceDocument`.
- Destination must differ from `sourcePath`.
- Output is written atomically where supported.
- Existing destinations require explicit user confirmation and must never silently overwrite.
- Export completion is not application retention; the destination is controlled by the user.

## GeminiApiKey

Credential lifecycle is `missing -> configured -> replaced -> removed`. Native stores the value in
macOS Keychain; browser stores it only under documented origin-scoped browser policy. Neither
product exposes the value to UI state or logs, and each reads it only for an active generation request.
