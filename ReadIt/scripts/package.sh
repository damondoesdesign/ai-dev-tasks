#!/usr/bin/env bash
# Build a double-clickable Read It.app and zip it for download.
# Must run on macOS with Xcode installed.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_DIR="$ROOT/ReadIt"
DIST_DIR="${DIST_DIR:-$ROOT/ReadIt/dist}"
CONFIGURATION="${CONFIGURATION:-Release}"
SCHEME="ReadIt"
DERIVED="$DIST_DIR/DerivedData"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This packaging script must run on a Mac (macOS + Xcode)." >&2
  echo "On this machine you can still download a build from GitHub Actions artifacts" >&2
  echo "once the read-it-package workflow has run." >&2
  exit 1
fi

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "xcodebuild not found. Install Xcode from the Mac App Store, then open it once." >&2
  exit 1
fi

echo "==> Regenerating Xcode project"
python3 "$APP_DIR/generate_xcode_project.py"

mkdir -p "$DIST_DIR"
rm -rf "$DERIVED"
rm -f "$DIST_DIR/ReadIt.zip" "$DIST_DIR/ReadIt.app"

echo "==> Building $SCHEME ($CONFIGURATION) for My Mac"
xcodebuild \
  -project "$APP_DIR/ReadIt.xcodeproj" \
  -scheme "$SCHEME" \
  -configuration "$CONFIGURATION" \
  -destination "platform=macOS" \
  -derivedDataPath "$DERIVED" \
  CODE_SIGN_IDENTITY="-" \
  CODE_SIGNING_ALLOWED=YES \
  CODE_SIGNING_REQUIRED=NO \
  build

APP_PATH="$(find "$DERIVED/Build/Products/$CONFIGURATION" -maxdepth 1 -name 'ReadIt.app' -print -quit)"
if [[ -z "$APP_PATH" || ! -d "$APP_PATH" ]]; then
  echo "Build finished but ReadIt.app was not found under DerivedData." >&2
  exit 1
fi

echo "==> Copying app to dist/"
rm -rf "$DIST_DIR/ReadIt.app"
cp -R "$APP_PATH" "$DIST_DIR/ReadIt.app"

# Clear quarantine on the copy we just built locally (harmless if absent).
xattr -cr "$DIST_DIR/ReadIt.app" 2>/dev/null || true

echo "==> Creating ReadIt.zip"
(
  cd "$DIST_DIR"
  rm -f ReadIt.zip
  ditto -c -k --sequesterRsrc --keepParent ReadIt.app ReadIt.zip
)

echo ""
echo "Done."
echo "  App: $DIST_DIR/ReadIt.app"
echo "  Zip: $DIST_DIR/ReadIt.zip"
echo ""
echo "Double-click ReadIt.app to launch (menu bar icon)."
echo "Or share ReadIt.zip — unzip, then open ReadIt.app."
echo ""
echo "First open tip: if macOS says the app is from an unidentified developer,"
echo "right-click ReadIt.app → Open → Open."
