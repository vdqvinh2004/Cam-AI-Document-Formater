#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
APP_DIR="$ROOT_DIR/.build/CamDocFormater.app"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
EXECUTABLE="$MACOS_DIR/CamDocFormater"
BIN_DIR=$(swift build --package-path "$ROOT_DIR" -c release --show-bin-path)

mkdir -p "$MACOS_DIR" "$CONTENTS_DIR/Resources"
cp "$BIN_DIR/CamDocFormater" "$EXECUTABLE"
cp "$ROOT_DIR/Resources/Info.plist" "$CONTENTS_DIR/Info.plist"
cp "$ROOT_DIR/Resources/AppIcon.icns" "$CONTENTS_DIR/Resources/AppIcon.icns"

open "$APP_DIR"
