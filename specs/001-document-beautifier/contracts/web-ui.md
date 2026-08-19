# Browser UI Contract: Document Beautifier

The browser product is an in-memory SPA with these routes:

| Route | Purpose | Empty-state behavior |
|---|---|---|
| `/` | Unified dashboard with `upload → configure → review` panels (driven by `?panel=`) | Show upload/drop guidance. |
| `/setup` | Deep-link into the configure panel (redirects to `/?panel=configure`) | Redirect to `/` when no source exists. |
| `/review` | Deep-link into the review panel (redirects to `/?panel=review`) | Redirect to `/` when no result exists; export requires validation `pass`. |
| `/settings` | API-key status, replace, and remove actions | Never display the key. |
| `/privacy` | Explain Gemini disclosure, in-memory document handling, key storage, and downloads | Always render independently of workflow state. |
| unknown | Helpful not-found page | Provide a link to `/` and visible recovery guidance. |

## Shared UI requirements

- Every page has one clear accessible heading and a visible current-route indication.
- Navigation works with keyboard and browser back/forward controls.
- Loading, success, blocked, unavailable, and failure states use user-safe language and a status landmark where appropriate.
- Source files, result files, extracted content, prompts, and comparison details are not written to browser storage.
- DOCX result preview consumes actual result package bytes. A source package returned unchanged MUST NOT be labeled as a formatted result.
- Compare view separates content-preservation evidence from presentation-change evidence and reports unavailable evidence explicitly.
- Export/download controls are disabled or absent unless the required validation state is `pass`.
- The visual system may use a selective headless accessibility library, but product styling remains macOS-inspired and does not inherit a competing visual theme.

## Route navigation acceptance

Directly opening or refreshing `/privacy` and unknown paths must return the SPA shell and the corresponding page, including on the configured Vercel deployment. A server fallback failure is a deployment defect; a client route mismatch is an application defect.
