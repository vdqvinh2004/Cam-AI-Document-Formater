# Cam DocFormater App Design

Cam DocFormater App is the repeated-use native workspace. It is not a responsive web page inside a
window: the title-bar safe area, application menu, keyboard commands, focus restoration, and
window constraints are part of the product.

## Information architecture

- **Workspace**: source document, formatting controls, progress, preview, validation, and export.
- **Settings**: Gemini key lifecycle, disclosure/privacy copy, and local app preferences.
- **Application menu**: Open Document, Start Formatting, Show Preview, standard Edit/View/Window
  roles, and native close/reload/zoom commands.

The workspace keeps the source visible while a pass runs. Completed, failed, and cancelled jobs
can start another pass without reselecting the source. Settings and preview do not expose raw
credentials or document bytes beyond the active local job.

## Interaction rules

The app menu provides `Command-O` to open a document and `Command-,` to open settings. Focus
returns to the initiating control after a native dialog closes. The minimum window is 900 by 620
pixels (`NativeDesignSystem.minimumWindow`); layout remains usable at larger sizes. Reduced motion
disables decorative transitions while preserving progress and status updates.

## App versus web

The native app uses persistent window chrome, menus, keyboard-first commands, and macOS dialogs.
Cam DocFormater Online uses browser navigation, responsive breakpoints, touch-sized controls, URL routes,
and refresh-safe browser state. The two products share terminology and preservation rules, not
privileged runtime code or layout assumptions.