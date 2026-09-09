#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SWIFT_CANDIDATES=(
  "/tmp/swift-6.0.3-RELEASE-ubuntu24.04/usr/bin/swift"
  "$(command -v swift || true)"
)

SWIFT=""
for candidate in "${SWIFT_CANDIDATES[@]}"; do
  if [[ -n "$candidate" && -x "$candidate" ]]; then
    SWIFT="$candidate"
    break
  fi
done

echo "==> Validating Read It project"

echo "==> Regenerating Xcode project"
python3 "$ROOT/ReadIt/generate_xcode_project.py"

echo "==> Checking required app sources exist"
required_files=(
  "ReadIt/ReadIt/ReadItApp.swift"
  "ReadIt/ReadIt/AppState.swift"
  "ReadIt/ReadIt/Info.plist"
  "ReadIt/ReadIt/Views/OnboardingView.swift"
  "ReadIt/ReadIt/Views/SettingsView.swift"
  "ReadIt/ReadIt/Input/GlobalTriggerMonitor.swift"
  "ReadIt/ReadIt/Services/ReadItServicesProvider.swift"
  "ReadIt/ReadIt.xcodeproj/project.pbxproj"
  "ReadIt/scripts/package.sh"
  "ReadIt/DOWNLOAD.md"
  "ReadItCore/Package.swift"
  "tasks/prd-read-it.md"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$ROOT/$file" ]]; then
    echo "Missing required file: $file" >&2
    exit 1
  fi
done

swift_count=$(find "$ROOT/ReadIt/ReadIt" -name '*.swift' | wc -l | tr -d ' ')
if [[ "$swift_count" -lt 10 ]]; then
  echo "Expected at least 10 Swift source files, found $swift_count" >&2
  exit 1
fi

if [[ -n "$SWIFT" ]]; then
  echo "==> Running ReadItCore unit tests with $SWIFT"
  cd "$ROOT/ReadItCore"
  "$SWIFT" test
else
  echo "==> Swift toolchain not found; skipped ReadItCore tests"
  echo "    Install Swift or place toolchain at /tmp/swift-6.0.3-RELEASE-ubuntu24.04"
fi

echo "==> Validation passed ($swift_count app Swift files)"
