import Clutter from 'gi://Clutter';
import Meta from 'gi://Meta';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class GapManager {
    constructor(settings) {
        this._settings = settings;
        this._actors = [];
    }

    rebuild() {
        this._destroyActors();
        this._flushStruts();

        const configured = this._configuredMargins();
        if (!this._settings.get_boolean('use-custom-margins') &&
            this._marginsAreEmpty(configured)) {
            this._relayoutMaximizedWindows();
            return;
        }

        const skipPanel = this._settings.get_boolean('skip-panel-edges');

        for (let i = 0; i < Main.layoutManager.monitors.length; i++) {
            const monitor = Main.layoutManager.monitors[i];
            const margins = this._marginsForMonitor(monitor, i, configured, skipPanel);

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

    /**
     * Current per-edge gap sizes for a monitor (same math as strut rebuild).
     * Used by peek blur so both stay aligned.
     */
    marginsForMonitor(index) {
        const empty = {top: 0, bottom: 0, left: 0, right: 0};
        const configured = this._configuredMargins();
        if (!this._settings.get_boolean('use-custom-margins') &&
            this._marginsAreEmpty(configured))
            return empty;

        const monitor = Main.layoutManager.monitors[index];
        if (!monitor)
            return empty;

        const skipPanel = this._settings.get_boolean('skip-panel-edges');
        return this._marginsForMonitor(monitor, index, configured, skipPanel);
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

    _configuredMargins() {
        if (this._settings.get_boolean('use-custom-margins')) {
            return {
                top: this._settings.get_int('custom-margin-top'),
                bottom: this._settings.get_int('custom-margin-bottom'),
                left: this._settings.get_int('custom-margin-left'),
                right: this._settings.get_int('custom-margin-right'),
            };
        }

        const gap = this._settings.get_int('gap-size');
        return {top: gap, bottom: gap, left: gap, right: gap};
    }

    _marginsAreEmpty(margins) {
        return margins.top <= 0 && margins.bottom <= 0 &&
            margins.left <= 0 && margins.right <= 0;
    }

    _marginsForMonitor(monitor, index, configured, skipPanel) {
        const margins = {...configured};
        const useCustom = this._settings.get_boolean('use-custom-margins');
        const insets = useCustom
            ? this._insetsFromPanels(monitor, index)
            : this._workAreaInsets(monitor, index);

        if (useCustom) {
            // Custom values are the gap between the panel and the window.
            // Dash to Panel often does not span the whole edge, so the work
            // area never records it and a screen-edge strut ignores the panel.
            for (const edge of Object.keys(margins))
                margins[edge] += insets[edge];
        } else if (skipPanel) {
            // Skip only real panel struts (larger than our gap).
            for (const edge of Object.keys(margins)) {
                if (insets[edge] > margins[edge])
                    margins[edge] = 0;
            }
        }

        // Wayland maximize constraints misbehave when the work area has an
        // odd width/height (common with a panel on one side + an odd gap on
        // the opposite). Nudge a free edge by 1px so the usable area stays even.
        this._ensureEvenWorkArea(monitor, insets, margins);

        return margins;
    }

    _workAreaInsets(monitor, index) {
        const workArea = Main.layoutManager.getWorkAreaForMonitor(index);
        return {
            top: Math.max(0, workArea.y - monitor.y),
            left: Math.max(0, workArea.x - monitor.x),
            right: Math.max(0, (monitor.x + monitor.width) - (workArea.x + workArea.width)),
            bottom: Math.max(0, (monitor.y + monitor.height) - (workArea.y + workArea.height)),
        };
    }

    _panelActors() {
        const actors = [];
        const panels = global.dashToPanel?.panels ?? [];
        for (const panel of panels) {
            if (panel)
                actors.push(panel);
        }

        // Stock top bar. Skip it when Dash to Panel already replaced that box.
        const panelBox = Main.layoutManager.panelBox;
        const replaced = panelBox && actors.some(actor =>
            actor === panelBox || panelBox.contains(actor)
        );
        if (panelBox && !replaced)
            actors.push(panelBox);

        return actors;
    }

    _insetsFromPanels(monitor, index) {
        const insets = {top: 0, bottom: 0, left: 0, right: 0};
        for (const actor of this._panelActors())
            this._includePanel(monitor, actor, insets);

        // A full-width panel still shows up in the work area when we did not
        // find its actor. A partial Dash to Panel does not, which is why the
        // actor measurement above comes first.
        const work = this._workAreaInsets(monitor, index);
        for (const edge of Object.keys(insets)) {
            if (insets[edge] <= 0)
                insets[edge] = work[edge];
        }
        return insets;
    }

    _includePanel(monitor, actor, insets) {
        if (typeof actor.get_transformed_position !== 'function')
            return;

        const [x, y] = actor.get_transformed_position();
        const [w, h] = actor.get_transformed_size();
        if (!(w > 1) || !(h > 1))
            return;

        const x1 = Math.round(x);
        const y1 = Math.round(y);
        const x2 = x1 + Math.round(w);
        const y2 = y1 + Math.round(h);
        const mx1 = monitor.x;
        const my1 = monitor.y;
        const mx2 = monitor.x + monitor.width;
        const my2 = monitor.y + monitor.height;
        if (x2 <= mx1 || x1 >= mx2 || y2 <= my1 || y1 >= my2)
            return;

        const side = actor.geom?.position ?? this._panelSide(monitor, x1, y1, x2, y2);
        if (side === St.Side.TOP)
            insets.top = Math.max(insets.top, y2 - my1);
        else if (side === St.Side.BOTTOM)
            insets.bottom = Math.max(insets.bottom, my2 - y1);
        else if (side === St.Side.LEFT)
            insets.left = Math.max(insets.left, x2 - mx1);
        else if (side === St.Side.RIGHT)
            insets.right = Math.max(insets.right, mx2 - x1);
    }

    _panelSide(monitor, x1, y1, x2, y2) {
        const width = x2 - x1;
        const height = y2 - y1;
        if (y1 <= monitor.y + 8 && width >= height)
            return St.Side.TOP;
        if (y2 >= monitor.y + monitor.height - 8 && width >= height)
            return St.Side.BOTTOM;
        if (x1 <= monitor.x + 8 && height >= width)
            return St.Side.LEFT;
        if (x2 >= monitor.x + monitor.width - 8 && height >= width)
            return St.Side.RIGHT;
        return null;
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
