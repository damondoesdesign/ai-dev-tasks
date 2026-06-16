#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SWIFT="/tmp/swift-6.0.3-RELEASE-ubuntu24.04/usr/bin/swift"

echo "==> Validating Packing List project"

if [[ ! -x "$SWIFT" ]]; then
  echo "Swift toolchain not found at $SWIFT" >&2
  exit 1
fi

echo "==> Running PackingListCore unit tests"
cd "$ROOT/PackingListCore"
"$SWIFT" test

echo "==> Regenerating Xcode project"
python3 "$ROOT/PackingList/generate_xcode_project.py"

echo "==> Checking required app sources exist"
required_files=(
  "PackingList/PackingList/PackingListApp.swift"
  "PackingList/PackingList/Models/Records.swift"
  "PackingList/PackingList/Repositories/LocalSwiftDataStore.swift"
  "PackingList/PackingList/Views/Trips/TripDetailView.swift"
  "PackingList/PackingList/Views/Library/LibraryListView.swift"
  "PackingList/PackingList.xcodeproj/project.pbxproj"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$ROOT/$file" ]]; then
    echo "Missing required file: $file" >&2
    exit 1
  fi
done

swift_count=$(find "$ROOT/PackingList/PackingList" -name '*.swift' | wc -l | tr -d ' ')
if [[ "$swift_count" -lt 10 ]]; then
  echo "Expected at least 10 Swift source files, found $swift_count" >&2
  exit 1
fi

echo "==> Validation passed ($swift_count app Swift files, core tests green)"
