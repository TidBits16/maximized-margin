#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
UUID="maximized-gap@local"
SRC="$ROOT/$UUID"
DEST="$HOME/.local/share/gnome-shell/extensions/$UUID"

glib-compile-schemas "$SRC/schemas"
rm -rf "$DEST"
mkdir -p "$DEST"
cp -a "$SRC"/. "$DEST/"

echo "Installed to $DEST"
echo "Enable with: gnome-extensions enable $UUID"
echo "On Wayland, restart the session once after first install."
