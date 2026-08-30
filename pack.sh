#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
UUID="maximized-margin@tidbits16.github.io"
SRC="$ROOT/$UUID"
OUT="$ROOT"

# EGO compiles schemas; do not ship gschemas.compiled
rm -f "$SRC/schemas/gschemas.compiled"

gnome-extensions pack "$SRC" \
  --force \
  --out-dir="$OUT" \
  --extra-source=gapManager.js \
  --extra-source=roundedCornersBridge.js \
  --extra-source=LICENSE

echo "Created $OUT/$UUID.shell-extension.zip"
echo "Upload at https://extensions.gnome.org/upload/ or:"
echo "  gnome-extensions upload --accept-tos \"$OUT/$UUID.shell-extension.zip\""
