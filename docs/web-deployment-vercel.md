# Cam DocFormater Online on Vercel

Cam DocFormater Online is deployed as a separate Vite application. It builds from the repository root
with `yarn build` and serves `dist/web`. The native SwiftUI application is packaged separately
and is never deployed to Vercel.

## Project setup

Create a Vercel project connected to the repository with these settings:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Install command | `yarn install --frozen-lockfile` |
| Build command | `yarn build` |
| Output directory | `dist/web` |
| Node.js version | 22.x, matching local development |
| Root directory | repository root |

`vercel.json` supplies the same build settings, SPA fallback, clean URLs, and baseline security
headers. Keep the file in version control so preview and production projects behave consistently.

## Environments and secrets

The current browser policy stores the user-provided Gemini key in origin-scoped browser storage.
Do not add a server-side Gemini key to Vercel environment variables. If a future server proxy is
introduced, use separate Preview and Production variables, restrict allowed origins, and rotate
secrets without exposing them to client JavaScript.

## Deployment flow

1. Run `yarn install --frozen-lockfile`, `yarn typecheck`, `yarn lint`, and `yarn build` locally.
2. Open the Vercel Preview URL and verify upload rejection, disclosure, key lifecycle, refresh,
   preview, download, responsive layouts, and native-only feature messaging.
3. Promote the verified preview to Production from Vercel only after the web smoke checks pass.
4. Attach the production custom domain and verify HTTPS, the manifest, favicon, SPA deep links,
   security headers, and a clean browser session.

## Rollback and troubleshooting

Use Vercel's Deployments page to promote the previous known-good deployment. Do not edit generated
files in `dist/web` or hotfix production secrets. A blank route usually indicates a missing SPA
rewrite; stale assets usually indicate a failed build or cache issue. Check the deployment build
logs, confirm `dist/web/index.html` exists, and redeploy after correcting configuration.

## Release checklist

- [ ] Preview build uses the browser entry, not native application code.
- [ ] No API key, document text, Gemini prompt, or response appears in deployment logs.
- [ ] Production domain and HTTPS are active.
- [ ] Privacy, CSP, file-size, retention, and analytics policies match `docs/web-security.md`.
- [ ] Previous production deployment is identified for rollback.