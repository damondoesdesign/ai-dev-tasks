#!/usr/bin/env bash
#
# Idempotent Cloud Agent bootstrap for the PackingList Swift project.
#
# Installs the Linux system libraries the Swift toolchain needs, downloads the
# Swift 6.0.3 release toolchain to a persistent location, exposes it on PATH,
# and builds/tests the cross-platform PackingListCore package.
#
# Note: the iOS app target (PackingList/) requires Xcode/macOS and cannot be
# built on Linux. Only the PackingListCore SwiftPM package is buildable here,
# which is exactly what PackingList/scripts/validate.sh exercises for CI.
set -euo pipefail

SWIFT_VERSION="6.0.3"
SWIFT_DIR_NAME="swift-${SWIFT_VERSION}-RELEASE-ubuntu24.04"
INSTALL_ROOT="${HOME}/.swift-toolchains"
SWIFT_HOME="${INSTALL_ROOT}/${SWIFT_DIR_NAME}"
# validate.sh hard-codes this /tmp path, so keep a stable symlink pointing at
# the persistent toolchain install.
TMP_LINK="/tmp/${SWIFT_DIR_NAME}"

echo "==> Installing Swift Linux system dependencies"
sudo apt-get update -y
sudo apt-get install -y --no-install-recommends \
  binutils \
  git \
  gnupg2 \
  libc6-dev \
  libcurl4-openssl-dev \
  libedit2 \
  libgcc-s1 \
  libncurses-dev \
  libpython3-dev \
  libsqlite3-0 \
  libstdc++6 \
  libxml2-dev \
  libz3-dev \
  pkg-config \
  tzdata \
  unzip \
  zlib1g-dev

if [[ ! -x "${SWIFT_HOME}/usr/bin/swift" ]]; then
  echo "==> Downloading Swift ${SWIFT_VERSION} toolchain"
  mkdir -p "${INSTALL_ROOT}"
  url="https://download.swift.org/swift-${SWIFT_VERSION}-release/ubuntu2404/swift-${SWIFT_VERSION}-RELEASE/${SWIFT_DIR_NAME}.tar.gz"
  tmp_tar="$(mktemp --suffix=.tar.gz)"
  curl -fSL -o "${tmp_tar}" "${url}"
  tar xzf "${tmp_tar}" -C "${INSTALL_ROOT}"
  rm -f "${tmp_tar}"
else
  echo "==> Swift ${SWIFT_VERSION} toolchain already present, skipping download"
fi

# Keep the /tmp path that validate.sh expects pointing at the persistent install.
ln -sfn "${SWIFT_HOME}" "${TMP_LINK}"

# Make swift available on PATH for interactive shells.
if ! grep -q "${SWIFT_HOME}/usr/bin" "${HOME}/.bashrc" 2>/dev/null; then
  echo "export PATH=\"${SWIFT_HOME}/usr/bin:\$PATH\"" >> "${HOME}/.bashrc"
fi
if ! grep -q "${SWIFT_HOME}/usr/bin" "${HOME}/.profile" 2>/dev/null; then
  echo "export PATH=\"${SWIFT_HOME}/usr/bin:\$PATH\"" >> "${HOME}/.profile"
fi

export PATH="${SWIFT_HOME}/usr/bin:${PATH}"

echo "==> Swift toolchain version"
swift --version

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Building and testing PackingListCore"
(
  cd "${REPO_ROOT}/PackingListCore"
  swift build
  swift test
)

echo "==> Install complete"
