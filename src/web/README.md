# Browser Boundary

Cam DocFormater Online is browser-only. It may use browser file inputs,
drag and drop, `localStorage`, Gemini requests, and browser downloads. It must not import
Node filesystem modules, native dialogs, or desktop IPC. Native macOS work belongs to the separate
SwiftUI package under `macos/`.

The browser key policy is explicit: the Gemini API key is stored in `localStorage` under
`camdoc.gemini-api-key`, is never rendered into visible text, and is sent only after the same
user disclosure used by the desktop client. Deployments that do not accept browser storage
must provide a replacement `ApiKeyStorage` adapter backed by an origin-scoped, secure cookie
or disable key persistence.

The browser entry point is `src/web/index.html` and is built with `vite.web.config.ts` into
`dist/web`. It has its own responsive shell and no native runtime entry point.