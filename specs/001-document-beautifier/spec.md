# Feature Specification: Document Beautifier

**Feature Branch**: `001-document-beautifier`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Build a native macOS desktop application that automatically beautifies and standardizes the formatting of documents while preserving all original content. Users can simply drag and drop a supported document (TXT, DOCX, PDF, Markdown, etc.), choose a formatting style (such as Simple, Modern, Professional, Easy to Read, Academic, or Custom), optionally provide additional formatting instructions, and generate a polished version of the document in the same file format. The application focuses solely on improving layout, spacing, alignment, typography, headings, lists, tables, and overall readability without rewriting, adding, or removing any content. Before exporting, the application validates that no content, images, tables, hyperlinks, or document structure have been lost or modified. The original file is never changed, and the application does not collect or store user documents. To use the application, users must provide their own Gemini API key, which is the only user data stored locally on the device for future use."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Beautify a Document (Priority: P1)

As a macOS user, I want to drop a supported document into the application, choose a formatting style, and export a polished copy in the original format without changing the document's content.

**Why this priority**: This is the core value of the application and must work as a complete, independently useful workflow.

**Independent Test**: Provide a valid supported document and a valid Gemini API key, select a predefined style, generate the result, and verify that a new file is created in the same format while the source remains unchanged and all original content is preserved.

**Acceptance Scenarios**:

1. **Given** the application is open and a valid Gemini API key is available, **When** the user drops a supported document and selects a predefined style, **Then** the application shows the selected file and style and enables document generation.
2. **Given** a supported document and selected style, **When** the user starts generation, **Then** the application produces a polished copy in the same file format without changing the original file.
3. **Given** generation has completed successfully, **When** the user chooses the export destination, **Then** the application saves only the validated output and reports its location.
4. **Given** the input document is unsupported, unreadable, or invalid, **When** the user drops it into the application, **Then** the application explains the problem and does not start generation.

---

### User Story 2 - Control the Formatting Result (Priority: P2)

As a macOS user, I want to choose among named formatting styles or define additional instructions so the result suits the document's purpose and audience.

**Why this priority**: Different documents require different presentation choices, while the content-preservation promise remains constant.

**Independent Test**: Load a valid document, switch among Simple, Modern, Professional, Easy to Read, Academic, and Custom styles, optionally enter additional formatting instructions, and verify that the selected options are reflected in the generated formatting without content edits.

**Acceptance Scenarios**:

1. **Given** a valid document is loaded, **When** the user selects a named style, **Then** the application clearly indicates that style as active and uses it for generation.
2. **Given** the Custom style is selected, **When** the user provides additional formatting instructions, **Then** the application includes those instructions in the formatting request and retains them until the current job is completed or reset.
3. **Given** additional instructions request rewriting, adding, or removing content, **When** the user starts generation, **Then** the application rejects or safely ignores the content-changing instruction and informs the user that only formatting changes are supported, except that instructions which renumber or rephrase *headings only* may be applied as `rewrite-text` operations (full heading-line replacement, 1-200 characters, headings only); those exact expected lines are stripped from the content comparison so the intentional rewrite does not block export. Any other content change still blocks export.

---

### User Story 3 - Verify and Recover Safely (Priority: P3)

As a macOS user, I want the application to prove that the output retains the source content and to recover clearly when verification or generation fails.

**Why this priority**: Trust is essential when processing important documents, and a failed validation must never result in an unsafe export.

**Independent Test**: Process documents containing text, images, tables, hyperlinks, and structural elements, then verify the validation result and confirm that any failed validation prevents export while leaving the source available.

**Acceptance Scenarios**:

1. **Given** generation produces an output, **When** validation compares it with the source, **Then** the application checks text content, images, tables, hyperlinks, and document structure and displays a clear pass or failure result before export.
2. **Given** validation detects missing or modified content or structure, **When** the user attempts to export, **Then** export is blocked, the reason is shown, and no output is presented as valid.
3. **Given** the Gemini request, conversion, validation, or export fails, **When** the failure occurs, **Then** the application preserves the original file, explains the failure in user-facing language, and offers a retry or corrective next step.
4. **Given** the application is closed after processing, **When** the user later opens it, **Then** no source documents, generated documents, or document contents are available from application storage.

---

### User Story 4 - Inspect Formatting Changes (Priority: P2)

As a user, I want to inspect the current document, formatted document, and their differences so
I can understand presentation changes before exporting.

**Why this priority**: Visible comparison makes formatting-only behavior understandable and helps
users trust the preservation result.

**Independent Test**: Load TXT, Markdown, DOCX, and PDF fixtures; verify source preview before
generation, formatted preview after validation, compare behavior where supported, and explicit
unavailable messaging where rendering or comparison is unsafe.

**Acceptance Scenarios**:

1. **Given** a readable supported document is loaded, **When** the user opens preview, **Then** the
	product shows a read-only source view and does not modify or upload the document.
2. **Given** formatting and validation complete with a pass, **When** the user opens formatted
	preview, **Then** the product shows the formatted result and preserves validation status.
3. **Given** source and formatted previews are renderable and comparable, **When** the user opens
	compare view, **Then** the product identifies presentation-only changes and confirms preserved
	content without exposing raw credentials or persisting preview data.
4. **Given** a format or feature cannot be rendered or compared reliably, **When** the user opens
	preview or compare view, **Then** the product explains that preview is unavailable and keeps
	export controlled by validation.

### Edge Cases

- A file has a supported extension but is corrupt, password-protected, encrypted, or otherwise unreadable.
- A document contains embedded images, tables, hyperlinks, lists, headings, footnotes, comments, or other structure that the selected format cannot fully represent.
- A document has no extractable text or contains only images.
- The input file is very large or takes a long time to process; the application must show progress and remain responsive.
- The user drops multiple files, a folder, or a file type outside the supported set.
- The user cancels while generation, validation, or export is in progress.
- The API key is missing, invalid, revoked, or rejected by the Gemini service.
- The network is unavailable or the Gemini service is unavailable after the user requests generation.
- The output file already exists at the chosen destination.
- The user attempts to overwrite the source file or export before validation passes.
- Custom instructions are ambiguous, conflict with the selected style, or ask for content changes (beyond heading-only rewrites).
- The application lacks a required macOS permission or cannot access the selected file or destination.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The native macOS product MUST provide native selection and drag-and-drop for one supported document. The browser product MUST provide browser selection and drag-and-drop for the same workflow.
- **FR-002**: The application MUST support TXT, DOCX, PDF, and Markdown documents in the initial release and MUST clearly identify unsupported formats.
- **FR-003**: Each product MUST require a Gemini API key before starting a formatting request and MUST use only its documented platform-appropriate secure storage for future use.
- **FR-004**: The application MUST protect the stored API key using macOS-appropriate secure storage and MUST provide a way for the user to replace or remove it.
- **FR-005**: The application MUST disclose that document content is sent to Gemini only when the user explicitly starts generation and MUST not collect or retain documents or document contents after processing.
- **FR-006**: The application MUST provide the formatting styles Simple, Modern, Professional, Easy to Read, Academic, and Custom.
- **FR-007**: The application MUST allow the user to provide optional additional formatting instructions for a generation request.
- **FR-008**: The application MUST constrain every formatting request to layout, spacing, alignment, typography, headings, lists, tables, and overall readability, and MUST prevent rewriting, adding, or removing content.
- **FR-009**: The application MUST generate an output in the same file format as the input whenever the format is supported for export.
- **FR-010**: The application MUST preserve the original file byte-for-byte by never modifying, overwriting, or deleting it as part of processing.
- **FR-011**: Before enabling export, the application MUST validate that text content, images, tables, hyperlinks, and document structure present in the input have not been lost or modified in the output.
- **FR-012**: The application MUST block export when validation fails, when validation cannot be completed, or when the output format cannot preserve the required document elements.
- **FR-013**: The application MUST show processing, validation, success, cancellation, and failure states in language understandable to a non-technical user.
- **FR-014**: The application MUST keep the interface responsive during generation, validation, and export and MUST provide progress or an equivalent in-progress state for operations that are not immediate.
- **FR-015**: The application MUST allow the user to choose an export destination and MUST handle an existing destination file without changing the source document or silently overwriting another file.
- **FR-016**: The application MUST provide retry and cancellation actions where the current operation supports them.
- **FR-017**: The native product MUST provide accessible controls, keyboard navigation, readable status feedback, and standard macOS file and error interactions. The browser product MUST provide accessible controls, browser navigation, touch-sized targets, and readable status feedback.
- **FR-018**: The application MUST avoid retaining source files, output files, extracted content, prompts, or processing history in application storage after the current workflow ends, except for the user-managed exported file at the destination they choose.
- **FR-019**: Each product MUST show a read-only preview of the loaded source document before generation when the format can be rendered safely.
- **FR-020**: Each product MUST show a read-only preview of the formatted result after validation and MUST provide source, formatted, and compare views without enabling export unless validation passes.
- **FR-021**: Compare view MUST identify presentation-only changes when reliable comparison is available, confirm preserved content, and show a clear preview-unavailable state for formats or features that cannot be rendered or compared safely.
- **FR-022**: The browser product MUST be split into focused pages for workspace/upload, format setup, review/compare, settings, privacy, and not-found handling, with shared components for navigation, status, file intake, style selection, preview, comparison, and export actions.
- **FR-023**: The browser product MUST use a maintained UI component library or design-system primitives where they improve accessibility and consistency, while retaining a restrained macOS-inspired visual language, typography, spacing, controls, and interaction behavior.
- **FR-024**: Browser navigation MUST render privacy and unknown routes client-side or through deployment fallback configuration so valid links do not show a server 404.
- **FR-025**: DOCX result preview MUST render the formatted output package from its actual bytes; it MUST NOT convert a DOCX result into plain text merely because a formatting operation is applied.
- **FR-026**: Compare output MUST distinguish content preservation from presentation changes and MUST present only actionable, human-readable differences grouped by category, with unavailable states when evidence is insufficient.
- **FR-027**: The browser refactor MUST preserve the existing privacy boundary: source files, output files, extracted content, prompts, and job history remain in memory only for the active workflow unless the user explicitly downloads an output.

### Key Entities

- **Source Document**: The user-selected supported file, including its format, content, embedded elements, hyperlinks, and structure; it remains unchanged throughout the workflow.
- **Formatting Profile**: A predefined or custom set of presentation instructions containing the selected style and optional user-provided formatting guidance.
- **Formatting Job**: A single user-initiated processing attempt linking one source document, one formatting profile, one API-key use, and its processing state.
- **Validation Result**: The pre-export comparison describing whether the generated document preserves the source text, images, tables, hyperlinks, and structure.
- **Exported Document**: A validated, polished copy saved by the user in the same supported file format as the source.
- **Gemini API Key**: The user's credential stored locally in secure macOS storage and used to request formatting from Gemini; it is not included in document outputs or analytics.
- **Preview Comparison**: An ephemeral source/result presentation containing renderability, validation status, preserved-content status, and presentation-only change details where comparison is supported.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with a valid supported document and API key can begin a formatting job within 60 seconds of opening the application.
- **SC-002**: At least 95% of valid test documents containing text, headings, lists, tables, images, hyperlinks, and supported structural elements produce a validation result before export is enabled.
- **SC-003**: 100% of test cases with detected content, image, table, hyperlink, or structural loss block export and leave the source file unchanged.
- **SC-004**: 100% of successful exports preserve the input file format and are saved as a separate file chosen by the user.
- **SC-005**: In usability testing, at least 90% of first-time users complete the primary drop, style selection, validation, and export workflow without assistance.
- **SC-006**: After the application is closed, a storage inspection finds no source documents, generated documents, document contents, prompts, or processing history retained by the application.
- **SC-007**: Users can identify whether processing is active, completed, cancelled, or blocked by validation within 5 seconds of viewing the application state.
- **SC-008**: The application never modifies the source document in automated tests covering successful processing, failed generation, failed validation, cancellation, and export destination conflicts.
- **SC-009**: 100% of supported TXT and Markdown workflow tests show source preview before generation and formatted preview after validation; each compare result either identifies presentation-only changes or reports an explicit unavailable state.
- **SC-010**: 100% of DOCX and PDF fixtures with unsupported rendering or comparison capability show an explicit preview-unavailable state and remain subject to validation-gated export.
- **SC-011**: At least 95% of valid fixture documents produce a preview, comparison result, or explicit unavailable state within 10 seconds after each local processing stage completes.

## Assumptions

- The initial release contains separate macOS desktop and browser products. It does not include iOS, iPadOS, or Windows clients.
- The initial supported formats are TXT, DOCX, PDF, and Markdown; additional formats require explicit support and preservation criteria before inclusion.
- Users provide a valid Gemini API key and accept the disclosure that content is sent to Gemini when they start generation; the application does not provide a shared key.
- Gemini service availability, request limits, and applicable service terms are external dependencies and are surfaced as user-facing failures when they prevent processing.
- A user may choose to retain the exported file at a location outside the application's managed storage; this user-controlled file is not considered application document retention.
- Content preservation means the source's textual and embedded informational content and supported structure remain equivalent; intentional presentation changes such as spacing, alignment, typography, and layout are allowed.
- Password-protected, encrypted, corrupt, or otherwise unreadable files are rejected rather than partially processed.
- The application uses standard macOS secure storage for the API key and does not store any other user profile or document data.
- The browser UI library will be selected during planning based on bundle size, accessibility, keyboard behavior, tree-shaking, and compatibility with the existing Vite/React stack; it must not force a non-macOS visual theme.
- PDF preview is optional and must not delay the primary web refactor or weaken truthful unavailable-state behavior.
