# Maximized Margin

Adds a tasteful touch of margin to maximized windows so the desktop is always slightly visible.

Also works with [Dash to Panel](https://github.com/home-sweet-gnome/dash-to-panel). With intellihide on, the margin wraps all four edges; with a always-visible panel, that edge is left to Dash to Panel. True fullscreen (F11) goes edge-to-edge.

## Install (from source)

```bash
./install.sh
gnome-extensions enable maximized-margin@tidbits16.github.io
```

On Wayland, log out/in once after the first install.

## Settings

- **Gap size** — margin in pixels (default 12)
- **Skip panel edges** — on by default; leaves panel/strut edges alone so gaps do not stack

## Publish to extensions.gnome.org

1. Create an account at [extensions.gnome.org](https://extensions.gnome.org/) (sign in with GitHub / Google / etc.).
2. Build the zip (extension files only — no `install.sh` / README):

   ```bash
   ./pack.sh
   ```

3. Upload `maximized-margin@tidbits16.github.io.shell-extension.zip` at
   [extensions.gnome.org/upload](https://extensions.gnome.org/upload/),
   or:

   ```bash
   gnome-extensions upload --accept-tos maximized-margin@tidbits16.github.io.shell-extension.zip
   ```

4. Wait for manual review (often a few days). Check status on your EGO profile under *My Extensions*.

UUID must stay in `name@namespace` form (`maximized-margin@tidbits16.github.io`). Do not put `version` in `metadata.json` — EGO sets that.
