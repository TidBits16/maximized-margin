#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
UUID="maximized-margin@tidbits16.github.io"
SRC="$ROOT/$UUID"
DEST="$HOME/.local/share/gnome-shell/extensions/$UUID"

glib-compile-schemas "$SRC/schemas"
rm -rf "$DEST"
mkdir -p "$DEST"
cp -a "$SRC"/. "$DEST/"

# Remove the old local UUID if present
rm -rf "$HOME/.local/share/gnome-shell/extensions/maximized-gap@local"

echo "Installed to $DEST"
echo "Enable with: gnome-extensions enable $UUID"
echo "On Wayland, restart the session once after first install."
