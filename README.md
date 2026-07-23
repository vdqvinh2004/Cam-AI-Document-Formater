# Cam DocFormater Online

The active TypeScript product is the browser-only Cam DocFormater Online workspace. It accepts
TXT, Markdown, DOCX, and PDF uploads, keeps document bytes in memory, sends only a disclosed
formatting-plan request to Gemini, and downloads a separate formatted filename after preservation
validation. The Gemini key is stored only in origin-scoped `localStorage` and is never rendered or
logged.

## Browser development

```bash
yarn install
yarn dev
```

Run the browser checks with `yarn test:browser`. The production bundle is written to `dist/web`
and can be deployed to Vercel using the configuration in `vercel.json`. Native macOS functionality
is implemented by the separate SwiftUI product described in the project plan; the browser build
contains no native runtime code.

Cam DocFormater is a document formatting workspace with two products: a native macOS app for repeated,
keyboard-first work and Cam DocFormater Online for responsive browser sessions. Both products preserve
document content while changing presentation.

## Development

```sh
yarn install
yarn typecheck
yarn lint
yarn test
yarn build
```

The native app stores its Gemini API key only in macOS Keychain. Cam DocFormater Online uses the documented
origin-scoped browser storage policy. Both products send document formatting context to Gemini only
after the user accepts the disclosure and starts generation. Source documents, prompts, model
responses, extracted IR, and job history are not persisted by the app.

## Packaging

See [docs/format-support.md](docs/format-support.md) and [docs/security-review.md](docs/security-review.md) for current preservation and security limits.
See [docs/app-design.md](docs/app-design.md) for the native interaction model and
[docs/web-deployment-vercel.md](docs/web-deployment-vercel.md) for Vercel deployment.

## Workflow and variants

After a result is exported, failed, or cancelled, the same selected source can be formatted again
with a different style without selecting it again. The before/after preview is read-only and is
available only after validation; export remains blocked for failed or inconclusive validation.

The desktop build uses macOS Keychain. The browser boundary under `src/web/` uses an explicit
`localStorage` adapter (`camdoc.gemini-api-key`) and browser downloads instead of native dialogs.
See [docs/web-security.md](docs/web-security.md), [docs/web-design.md](docs/web-design.md), and
[docs/macos-design.md](docs/macos-design.md) for the platform rules and privacy differences.
