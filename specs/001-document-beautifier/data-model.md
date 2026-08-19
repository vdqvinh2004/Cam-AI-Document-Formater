# Data Model: Document Beautifier

## Existing processing entities

The existing `SourceDocument`, `FormattingProfile`, `FormattingJob`, `ValidationResult`, `ExportedDocument`, and `PreviewComparison` concepts remain ephemeral and retain the preservation rules defined by the original feature. The web refactor adds UI-facing route and evidence models without persisting document contents.

## WebRoute

| Field | Type | Rules |
|---|---|---|
| `path` | `/` \| `/setup` \| `/review` \| `/settings` \| `/privacy` \| `not-found` | Derived from `location.pathname`; unknown paths map to `not-found`. |
| `label` | string | Accessible navigation label. |
| `requiresDocument` | boolean | Route renders an empty-state recovery action when no active source exists. |
| `requiresResult` | boolean | Review route blocks result actions until a result exists and validation allows them. |

## WebWorkflowState (`WorkflowState` in `src/web/state/workflow-context.tsx`)

| Field | Type | Rules |
|---|---|---|
| `currentRoute` | `WebRoute` | Active route from the pathname router. |
| `activePanel` | `'upload' \| 'configure' \| 'review'` | Dashboard panel; synced to `?panel=` in the URL. |
| `source` | `BrowserSource \| null` | Held in memory only; original file is never mutated. |
| `result` | `BrowserResult \| null` | Held in memory only; may be unavailable for unsupported formatting. |
| `sourcePreview` | `PreviewEvidence \| null` | Read-only and derived from source bytes. |
| `resultPreview` | `PreviewEvidence \| null` | Derived from actual result bytes, never from a DOCX-to-text substitute when a package exists. |
| `comparison` | `ComparisonEvidence \| null` | Explicitly categorizes preservation, presentation changes, content changes, or unavailable evidence. |
| `jobStatus` | `'idle' \| 'ready' \| 'generating' \| 'validating' \| 'complete' \| 'blocked' \| 'failed'` | Drives progress and action availability. |
| `jobMessage` | string | User-safe status; no credentials, raw prompts, or sensitive paths. |
| `jobProgress` | number? | Optional 0–100 progress for in-flight stages. |
| `style` | `'simple' \| 'modern' \| 'professional' \| 'easy-to-read' \| 'academic' \| 'custom'` | Selected formatting style. |
| `instructions` | string | Custom-style description; required when `style === 'custom'`. |
| `disclosed` | boolean | Network-disclosure confirmation before any Gemini call. |

## PreviewEvidence

| Field | Type | Rules |
|---|---|---|
| `status` | `rendered \| partial \| unavailable \| failed` | Must be truthful about renderer capability. |
| `format` | `txt \| markdown \| docx \| pdf` | Matches source or result. |
| `html` | string | Sanitized/generated preview markup only; never raw package XML. |
| `text` | string | Semantic extraction used for comparison where reliable. |
| `featureCount` | number | Non-negative count of recognized renderable features. |
| `warnings` | string[] | Safe explanations of omitted/unsupported features. |

## ComparisonEvidence

| Field | Type | Rules |
|---|---|---|
| `status` | `preserved \| presentation-changed \| content-changed \| unavailable` | Content status is separate from visual change status. |
| `summary` | string | Plain-language explanation suitable for the review page. |
| `categories` | `content \| typography \| spacing \| layout \| structure \| assets \| unavailable`[] | Only include categories supported by evidence. |
| `rows` | `ComparisonRow`[] | Focused user-facing sections, not raw XML or empty-string noise. |
| `validation` | `pass \| fail \| inconclusive \| not-run` | Export requires `pass`. |

## ComparisonRow

| Field | Type | Rules |
|---|---|---|
| `location` | string | Human-readable section/page/paragraph reference when known. |
| `kind` | `content \| presentation \| unavailable` | Determines user-facing treatment. |
| `before` | string? | Included only when safe and meaningful. |
| `after` | string? | Included only when safe and meaningful. |
| `explanation` | string | Plain-language description of the difference or limitation. |

## UI component boundaries

- `AppShell`: navigation, route heading, global status, and responsive layout.
- `FileDropzone`: file selection/drop and supported-format messaging.
- `FormatControls`: style, custom instructions, and disclosure.
- `JobStatus`: progress, errors, retry, cancellation, and validation state.
- `PreviewPanel`: source/result rendering and renderer warnings.
- `ComparisonSummary`: preservation badge, presentation categories, and unavailable explanation.
- `ExportActions`: validation-gated download/export controls.
- `PrivacyPage` and `NotFoundPage`: static route content and recovery navigation.
