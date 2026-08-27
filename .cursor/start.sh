#!/usr/bin/env bash
#
# Per-boot initialization for the PackingList Swift project.
#
# The Swift toolchain lives in a persistent location, but validate.sh expects
# it at a fixed /tmp path which is not guaranteed to survive a reboot. Recreate
# that symlink on every start so CI validation keeps working.
set -euo pipefail

SWIFT_DIR_NAME="swift-6.0.3-RELEASE-ubuntu24.04"
SWIFT_HOME="${HOME}/.swift-toolchains/${SWIFT_DIR_NAME}"
TMP_LINK="/tmp/${SWIFT_DIR_NAME}"

if [[ -x "${SWIFT_HOME}/usr/bin/swift" ]]; then
  ln -sfn "${SWIFT_HOME}" "${TMP_LINK}"
  echo "Linked ${TMP_LINK} -> ${SWIFT_HOME}"
else
  echo "Swift toolchain not found at ${SWIFT_HOME}; run .cursor/install.sh" >&2
fi
