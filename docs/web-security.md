# Web Security

The web variant has no filesystem authority. Uploads are held in memory, format detection is
allowlisted, and exports use a browser download. API keys are origin-scoped and persisted only
under the documented `localStorage` policy; never log keys, prompts, responses, or document text.

The browser must show a network disclosure before a Gemini request. Desktop Keychain and native
IPC adapters belong to the separate SwiftUI product and are excluded from the browser bundle.

Vercel serves only the static browser bundle. It must not receive a persistent Gemini credential or
document content through build-time environment variables. Preview and production deployments use
the same client-side policy, but production domains must be reviewed for CSP, HTTPS, allowed
origins, file-size limits, and retention behavior before promotion.