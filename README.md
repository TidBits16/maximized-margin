# Maximized Margin

Adds a tasteful touch of margin to maximized windows so the desktop is always slightly visible.

Also works with [Dash to Panel](https://github.com/home-sweet-gnome/dash-to-panel).

## Install

```bash
./install.sh
```

Then enable **Maximized Margin** in Extension Manager, or:

```bash
gnome-extensions enable maximized-gap@local
```

On Wayland you’ll need to log out/in (or restart the session) the first time after installing. After that, toggling the extension is enough.

## Settings

- **Gap size** - margin in pixels (default 12)
- **Skip panel edges** - on by default; turns off the gap on any edge that already has reserved work-area space
