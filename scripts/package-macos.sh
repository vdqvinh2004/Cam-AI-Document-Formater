#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
BIN_DIR=$(swift build --package-path "$ROOT_DIR/macos" -c release --show-bin-path)
APP_DIR="$ROOT_DIR/macos/.build/CamDocFormater.app"
CONTENTS_DIR="$APP_DIR/Contents"
mkdir -p "$CONTENTS_DIR/MacOS" "$CONTENTS_DIR/Resources"
cp "$BIN_DIR/CamDocFormater" "$CONTENTS_DIR/MacOS/CamDocFormater"
cp "$ROOT_DIR/macos/Resources/Info.plist" "$CONTENTS_DIR/Info.plist"
cp "$ROOT_DIR/macos/Resources/AppIcon.icns" "$CONTENTS_DIR/Resources/AppIcon.icns"

if [ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$CONTENTS_DIR/Info.plist")" != "com.camdocformater.app" ]; then
	printf '%s\n' 'Invalid native bundle identifier.' >&2
	exit 1
fi

if command -v codesign >/dev/null 2>&1; then
	codesign --force --deep --sign - --entitlements "$ROOT_DIR/macos/Resources/CamDocFormater.entitlements" "$APP_DIR" >/dev/null
fi
printf '%s\n' "Native app bundle created: $APP_DIR"