import Clutter from 'gi://Clutter';
import Meta from 'gi://Meta';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class GapManager {
    constructor(settings) {
        this._settings = settings;
        this._actors = [];
    }

    rebuild() {
        this._destroyActors();
        this._flushStruts();

        const gap = this._settings.get_int('gap-size');
        if (gap <= 0) {
            this._relayoutMaximizedWindows();
            return;
        }

        const skipPanel = this._settings.get_boolean('skip-panel-edges');

        for (let i = 0; i < Main.layoutManager.monitors.length; i++) {
            const monitor = Main.layoutManager.monitors[i];
            const margins = this._marginsForMonitor(monitor, i, gap, skipPanel);

            if (margins.top > 0)
                this._addEdge(monitor.x, monitor.y, monitor.width, margins.top);

            if (margins.bottom > 0) {
                this._addEdge(
                    monitor.x,
                    monitor.y + monitor.height - margins.bottom,
                    monitor.width,
                    margins.bottom
                );
            }

            if (margins.left > 0)
                this._addEdge(monitor.x, monitor.y, margins.left, monitor.height);

            if (margins.right > 0) {
                this._addEdge(
                    monitor.x + monitor.width - margins.right,
                    monitor.y,
                    margins.right,
                    monitor.height
                );
            }
        }

        this._flushStruts();
        this._relayoutMaximizedWindows();
    }

    destroy() {
        this._destroyActors();
        this._flushStruts();
        this._settings = null;
    }

    _flushStruts() {
        // Apply strut changes immediately. _queueUpdateRegions is idle/async
        // and is too late for measuring panel insets in the same rebuild.
        if (typeof Main.layoutManager._updateRegions === 'function')
            Main.layoutManager._updateRegions();
        else
            Main.layoutManager._queueUpdateRegions?.();
    }

    _marginsForMonitor(monitor, index, gap, skipPanel) {
        const margins = {top: gap, bottom: gap, left: gap, right: gap};
        const workArea = Main.layoutManager.getWorkAreaForMonitor(index);
        const insets = {
            top: Math.max(0, workArea.y - monitor.y),
            left: Math.max(0, workArea.x - monitor.x),
            right: Math.max(0, (monitor.x + monitor.width) - (workArea.x + workArea.width)),
            bottom: Math.max(0, (monitor.y + monitor.height) - (workArea.y + workArea.height)),
        };

        if (skipPanel) {
            // Skip only real panel struts (larger than our gap).
            for (const edge of Object.keys(margins)) {
                if (insets[edge] > gap)
                    margins[edge] = 0;
            }
        }

        // Wayland maximize constraints misbehave when the work area has an
        // odd width/height (common with a panel on one side + an odd gap on
        // the opposite). Nudge a free edge by 1px so the usable area stays even.
        this._ensureEvenWorkArea(monitor, insets, margins);

        return margins;
    }

    _ensureEvenWorkArea(monitor, insets, margins) {
        const top = margins.top > 0 ? margins.top : insets.top;
        const bottom = margins.bottom > 0 ? margins.bottom : insets.bottom;
        const left = margins.left > 0 ? margins.left : insets.left;
        const right = margins.right > 0 ? margins.right : insets.right;

        const workW = monitor.width - left - right;
        const workH = monitor.height - top - bottom;

        if (workH % 2 !== 0) {
            if (margins.top > 0)
                margins.top += 1;
            else if (margins.bottom > 0)
                margins.bottom += 1;
        }

        if (workW % 2 !== 0) {
            if (margins.right > 0)
                margins.right += 1;
            else if (margins.left > 0)
                margins.left += 1;
        }
    }

    _addEdge(x, y, width, height) {
        const actor = new Clutter.Actor({
            name: 'maximized-margin-strut',
            reactive: false,
            opacity: 0,
            x, y, width, height,
        });

        Main.layoutManager.addChrome(actor, {
            affectsStruts: true,
        });

        this._actors.push(actor);
    }

    _destroyActors() {
        for (const actor of this._actors) {
            Main.layoutManager.removeChrome(actor);
            actor.destroy();
        }
        this._actors = [];
    }

    _relayoutMaximizedWindows() {
        const both = Meta.MaximizeFlags.BOTH;
        for (const actor of global.get_window_actors()) {
            const win = actor.meta_window;
            if (!win || win.get_window_type() !== Meta.WindowType.NORMAL)
                continue;
            if (typeof win.is_fullscreen === 'function' ? win.is_fullscreen() : win.fullscreen)
                continue;

            const maximized = typeof win.is_maximized === 'function'
                ? win.is_maximized()
                : win.get_maximized() === both;
            if (!maximized)
                continue;

            win.unmaximize(both);
            win.maximize(both);
        }
    }
}
