#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
APP_DIR=${1:-"$ROOT_DIR/macos/.build/CamDocFormater.app"}
PLIST="$APP_DIR/Contents/Info.plist"

test -d "$APP_DIR"
test -x "$APP_DIR/Contents/MacOS/CamDocFormater"
test -f "$PLIST"
test -f "$APP_DIR/Contents/Resources/AppIcon.icns"
test -f "$ROOT_DIR/macos/Resources/CamDocFormater.entitlements"
IDENTIFIER=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$PLIST")
test "$IDENTIFIER" = "com.camdocformater.app"

if command -v codesign >/dev/null 2>&1; then
    codesign --verify --deep --strict "$APP_DIR"
fi
printf '%s\n' 'Native app bundle verification passed.'
