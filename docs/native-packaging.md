# Native macOS Packaging

Native product uses Swift Package Manager and requires Xcode, macOS 14+, Apple Developer ID
Application signing, and notarization credentials for release packaging.

## Local validation

```bash
swift build --package-path macos -c release
swift test --package-path macos
```

## Run locally

`Package.swift` produces a raw executable during command-line builds. Raw executables have no
`CFBundleIdentifier`, so launching that product directly from Xcode can print `linkd.autoShortcut`
and `Cannot index window tabs due to missing main bundle identifier`. Build and open an app bundle
instead:

```bash
./macos/run-app.sh
```

The script creates `macos/.build/CamDocFormater.app` with bundle identifier
`com.camdocformater.app`. Xcode is still required for a signed app target, entitlements, archive,
DMG, and notarization.

## Signed release

1. Archive executable with Xcode using Developer ID Application signing.
2. Apply `macos/CamDocFormater.entitlements` with App Sandbox and user-selected file access.
3. Create DMG containing signed `.app`.
4. Submit DMG to Apple notarization service.
5. Staple notarization ticket and verify with `codesign --verify --deep --strict` and `spctl --assess`.

Do not claim sandbox support until DOCX/PDF converters, temporary directories, security-scoped file
access, Keychain access, and export flows pass in a signed build. Never include API keys, source
documents, generated documents, prompts, or Gemini responses in release artifacts or logs.