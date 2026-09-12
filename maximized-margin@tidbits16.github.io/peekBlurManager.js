import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Background from 'resource:///org/gnome/shell/ui/background.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

/**
 * Full-monitor wallpaper blur under maximized windows.
 *
 * Lives in _backgroundGroup (always behind Meta.WindowActors and behind
 * transparent panels like Dash to Panel). That way blur shows in:
 *   - the maximize peek margin
 *   - rounded-corner cutouts (Rounded Window Corners)
 *   - through translucent panel chrome
 *
 */
export class PeekBlurManager {
    constructor(settings) {
        this._settings = settings;
        this._layers = [];
        this._windowSignals = new Map();
        this._updateIdleId = 0;

        this._displayHandlerIds = [
            global.display.connect('window-created', (_d, win) => this._trackWindow(win)),
            global.display.connect('window-entered-monitor', () => this._queueVisibilityUpdate()),
            global.display.connect('window-left-monitor', () => this._queueVisibilityUpdate()),
            global.display.connect('restacked', () => this._queueVisibilityUpdate()),
        ];
        this._workspaceHandlerId = global.workspace_manager.connect(
            'active-workspace-changed',
            () => this._queueVisibilityUpdate()
        );

        for (const actor of global.get_window_actors())
            this._trackWindow(actor.meta_window);
    }

    rebuild() {
        this._destroyLayers();

        if (!this._settings.get_boolean('peek-blur'))
            return;
        if (this._settings.get_int('gap-size') <= 0)
            return;

        const radius = this._settings.get_int('peek-blur-radius');
        if (radius <= 0)
            return;

        const bgGroup = Main.layoutManager._backgroundGroup;
        if (!bgGroup)
            return;

        for (let i = 0; i < Main.layoutManager.monitors.length; i++) {
            const layer = this._createLayer(i);
            bgGroup.add_child(layer.actor);
            this._layers.push(layer);
        }

        this._updateVisibility();
    }

    updateRadius() {
        const radius = this._settings.get_int('peek-blur-radius');
        const enabled = this._settings.get_boolean('peek-blur') &&
            this._settings.get_int('gap-size') > 0 &&
            radius > 0;

        if (!enabled || this._layers.length === 0) {
            this.rebuild();
            return;
        }

        for (const layer of this._layers) {
            if (layer.effect)
                layer.effect.radius = radius;
        }
    }

    destroy() {
        this._clearVisibilityIdle();
        this._destroyLayers();

        for (const id of this._displayHandlerIds)
            global.display.disconnect(id);
        this._displayHandlerIds = [];

        if (this._workspaceHandlerId) {
            global.workspace_manager.disconnect(this._workspaceHandlerId);
            this._workspaceHandlerId = 0;
        }

        for (const [win, ids] of this._windowSignals) {
            for (const id of ids)
                win.disconnect(id);
        }
        this._windowSignals.clear();

        this._settings = null;
    }

    _createLayer(monitorIndex) {
        const monitor = Main.layoutManager.monitors[monitorIndex];

        const actor = new Meta.BackgroundGroup({
            name: 'maximized-margin-peek-blur',
            reactive: false,
            x: monitor.x,
            y: monitor.y,
            width: monitor.width,
            height: monitor.height,
            visible: false,
        });

        const bgManager = new Background.BackgroundManager({
            container: actor,
            monitorIndex,
            controlPosition: false,
            useContentSize: false,
            vignette: false,
        });

        const layer = {
            actor,
            bgManager,
            effect: null,
            changedId: 0,
            monitorIndex,
        };

        const applyBlur = () => {
            const wallpaper = bgManager.backgroundActor;
            if (!wallpaper)
                return;

            wallpaper.set({
                x: 0,
                y: 0,
                width: monitor.width,
                height: monitor.height,
            });

            if (wallpaper.content) {
                const shellBg = this._findShellBackground(monitorIndex);
                wallpaper.content.brightness = shellBg?.content?.brightness ?? 1.0;
                wallpaper.content.vignette = false;
            }

            layer.effect = new Shell.BlurEffect({
                name: 'maximized-margin-peek-blur-effect',
                radius: this._settings.get_int('peek-blur-radius'),
                brightness: 1.0,
                mode: Shell.BlurMode.ACTOR,
            });
            wallpaper.add_effect(layer.effect);
        };

        applyBlur();
        layer.changedId = bgManager.connect('changed', () => applyBlur());

        return layer;
    }

    _findShellBackground(monitorIndex) {
        const children = Main.layoutManager._backgroundGroup?.get_children() ?? [];
        const shellBgs = children.filter(c => c.name !== 'maximized-margin-peek-blur');

        for (const child of shellBgs) {
            if (child.monitor === monitorIndex)
                return child;
        }

        return shellBgs[shellBgs.length - monitorIndex - 1] ?? null;
    }

    _destroyLayers() {
        for (const layer of this._layers) {
            if (layer.bgManager && layer.changedId)
                layer.bgManager.disconnect(layer.changedId);

            layer.bgManager?.destroy();
            layer.actor.get_parent()?.remove_child(layer.actor);
            layer.actor.destroy();
        }
        this._layers = [];
    }

    _trackWindow(win) {
        if (!win || this._windowSignals.has(win))
            return;
        if (win.get_window_type() !== Meta.WindowType.NORMAL)
            return;

        const ids = [
            win.connect('notify::maximized-horizontally', () => this._queueVisibilityUpdate()),
            win.connect('notify::maximized-vertically', () => this._queueVisibilityUpdate()),
            win.connect('notify::fullscreen', () => this._queueVisibilityUpdate()),
            win.connect('notify::minimized', () => this._queueVisibilityUpdate()),
            win.connect('workspace-changed', () => this._queueVisibilityUpdate()),
            win.connect('unmanaged', () => {
                const signalIds = this._windowSignals.get(win);
                if (signalIds) {
                    for (const id of signalIds)
                        win.disconnect(id);
                    this._windowSignals.delete(win);
                }
                this._queueVisibilityUpdate();
            }),
        ];
        this._windowSignals.set(win, ids);
        this._queueVisibilityUpdate();
    }

    _clearVisibilityIdle() {
        if (!this._updateIdleId)
            return;
        GLib.source_remove(this._updateIdleId);
        this._updateIdleId = 0;
    }

    _queueVisibilityUpdate() {
        if (this._updateIdleId || this._layers.length === 0)
            return;

        this._updateIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._updateIdleId = 0;
            this._updateVisibility();
            return GLib.SOURCE_REMOVE;
        });
    }

    _updateVisibility() {
        if (this._layers.length === 0)
            return;

        for (const layer of this._layers) {
            const show = this._monitorHasMaximizedPeek(layer.monitorIndex);
            if (layer.actor.visible !== show)
                layer.actor.visible = show;
        }
    }

    _monitorHasMaximizedPeek(monitorIndex) {
        const workspace = global.workspace_manager.get_active_workspace();
        if (!workspace)
            return false;

        const both = Meta.MaximizeFlags.BOTH;
        for (const win of workspace.list_windows()) {
            if (win.get_monitor() !== monitorIndex)
                continue;
            if (win.get_window_type() !== Meta.WindowType.NORMAL)
                continue;
            if (win.minimized)
                continue;
            if (typeof win.is_fullscreen === 'function' ? win.is_fullscreen() : win.fullscreen)
                continue;

            const maximized = typeof win.is_maximized === 'function'
                ? win.is_maximized()
                : win.get_maximized() === both;
            if (maximized)
                return true;
        }

        return false;
    }
}
