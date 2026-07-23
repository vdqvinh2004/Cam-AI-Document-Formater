# Quickstart Validation: Document Beautifier

## Prerequisites

- macOS 14 Sonoma or later
- Node.js 22 LTS and Yarn for browser product
- Xcode with Swift 6 toolchain for native macOS product
- A Gemini API key supplied by the tester
- Test fixtures for TXT, Markdown, DOCX, and PDF containing headings, lists, tables, images, hyperlinks, and supported structure
- A corrupt or encrypted fixture for rejection tests
- Apple Developer ID Application certificate for signed release packaging; local builds may be unsigned.

## Install and run

```bash
yarn install
yarn dev
```

The development command starts browser product. Configure Gemini key through browser settings; do not place it in `.env`, source code, test output, or logs.

Run `./macos/run-app.sh` to build and open the native app bundle. Do not launch the raw SwiftPM
executable when testing macOS app services; it has no bundle identifier. Native product uses Keychain and native file panels; browser product uses documented
origin-scoped browser storage and downloads. Native SwiftUI source requires Xcode for full UI
build; command-line Swift toolchain can run domain and service contract tests.

## Unit and contract validation

```bash
yarn typecheck
yarn lint
yarn test --run
```

Expected outcomes:

- IR normalization and formatting-plan schema tests pass.
- Content-changing Gemini operations are rejected.
- Each adapter round-trips its fixtures and detects changed text, assets, tables, links, and structure.
- Failed or inconclusive validation prevents export.
- Source hashes remain unchanged for success, failure, cancellation, validation failure, and destination conflict cases.
- Keychain set, replace, status, and remove tests never use a real user credential.
- Temporary job directories are removed after success, failure, cancellation, and exceptions.

## Browser integration validation

```bash
yarn test:e2e
```

Use a fake Gemini service or mocked client. Verify:

1. A missing key blocks generation.
2. Selecting or dropping one supported file creates a source summary.
3. The disclosure is shown immediately before generation and no request is made before confirmation.
4. Progress and terminal states are visible while the renderer stays responsive.
5. A valid formatting plan reaches validation; an invalid/content-changing plan fails safely.
6. Export is unavailable until validation is `pass`.
7. The native save flow rejects the source path and handles destination conflicts explicitly.
8. Cancellation and all failures clean temporary artifacts without exposing document content.

## Native packaging validation

```bash
swift build --package-path macos -c release
swift test --package-path macos
./scripts/package-macos.sh
./scripts/verify-macos-release.sh
```

Expected artifacts:

- A native macOS `.app` with `CFBundleIdentifier=com.camdocformater.app`; signed `.app` and `.dmg`
	require Developer ID credentials.
- Native smoke tests covering launch, file dialog/drop, Keychain access, mocked generation, validation, export, and cleanup.

For release builds, verify Developer ID signing, hardened runtime, notarization, and stapling. Do not claim App Sandbox support until the packaged converters, temporary directories, and user-selected file grants have been tested under the chosen entitlements.

Local browser validation and native Swift validation must be recorded separately after Phase 9. Signing and notarization remain release-machine prerequisites until a valid Developer ID identity is available.

Phase 10 validation: native `swift test --package-path macos` passes 20 contract/workflow tests;
`swift build --package-path macos -c release`, `./scripts/package-macos.sh`, and
`./scripts/verify-macos-release.sh` pass. Full signed `.app`/`.dmg` smoke tests and notarization
still require Xcode and Developer ID credentials; this environment has Swift 6.1 Command Line
Tools only. The opt-in `RUN_PACKAGED_APP_SMOKE=1 swift test --package-path macos --filter
PackagedAppSmokeTests` launch check passes against the locally packaged ad hoc-signed app.

## Privacy and cleanup inspection

After a successful and a failed job, refresh or reopen each product. Inspect browser storage, native
application storage, and job temp directories. Expected result: no source document, generated
document, extracted IR, prompt, response, analytics, or processing history remains. Only the
user-managed Gemini API key may persist, under browser origin-scoped storage or native macOS
Keychain respectively.
