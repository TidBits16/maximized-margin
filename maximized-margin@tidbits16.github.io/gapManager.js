import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class GapManager {
    constructor(settings) {
        this._settings = settings;
        this._actors = [];
    }

    rebuild() {
        this._destroyActors();

        const gap = this._settings.get_int('gap-size');
        if (gap <= 0)
            return;

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
    }

    destroy() {
        this._destroyActors();
        this._settings = null;
    }

    _marginsForMonitor(monitor, index, gap, skipPanel) {
        const margins = {top: gap, bottom: gap, left: gap, right: gap};

        if (!skipPanel)
            return margins;

        // Measure after our actors are gone so we only see panel/strut insets
        // from Dash to Panel, the top bar, etc.
        const workArea = Main.layoutManager.getWorkAreaForMonitor(index);
        const insets = {
            top: workArea.y - monitor.y,
            left: workArea.x - monitor.x,
            right: (monitor.x + monitor.width) - (workArea.x + workArea.width),
            bottom: (monitor.y + monitor.height) - (workArea.y + workArea.height),
        };

        for (const edge of Object.keys(margins)) {
            if (insets[edge] > 0)
                margins[edge] = 0;
        }

        return margins;
    }

    _addEdge(x, y, width, height) {
        const actor = new Clutter.Actor({
            reactive: false,
            width,
            height,
            x,
            y,
            opacity: 0,
        });

        Main.layoutManager.addChrome(actor, {
            affectsStruts: true,
            trackFullscreen: true,
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
}
