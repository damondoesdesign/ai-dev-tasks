#!/usr/bin/env bash
# Builds public/tiles/tokyo.pmtiles: a Greater-Tokyo cut of the Protomaps
# basemap that the app can download to the phone for fully offline maps.
#
# Needs the pmtiles CLI: https://github.com/protomaps/go-pmtiles/releases
#   macOS: brew install pmtiles
#
# Bounding box covers roughly Hachioji ↔ Narita and Yokohama ↔ Omiya.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/tiles

BUILD="${PMTILES_BUILD:-https://build.protomaps.com/$(date -u +%Y%m%d).pmtiles}"
BBOX="${BBOX:-139.30,35.30,140.20,35.95}"
MAXZOOM="${MAXZOOM:-15}"

echo "Extracting $BBOX (maxzoom $MAXZOOM) from $BUILD"
pmtiles extract "$BUILD" public/tiles/tokyo.pmtiles --bbox="$BBOX" --maxzoom="$MAXZOOM"
ls -lh public/tiles/tokyo.pmtiles
echo "Done. Commit is NOT recommended (file is large); deploy it with the site instead."
