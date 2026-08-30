import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const RWC_SCHEMA = 'org.gnome.shell.extensions.rounded-window-corners-reborn';
const RWC_UUID = 'rounded-window-corners@fxgn';
const GLOBAL_KEY = 'global-rounded-corner-settings';

/**
 * Optionally keeps Rounded Window Corners clipping on maximized windows
 * so inset maximized windows stay rounded.
 */
export class RoundedCornersBridge {
    constructor(extensionSettings) {
        this._extensionSettings = extensionSettings;
        this._rwcSettings = null;
        this._extId = 0;
        this._savedMaximized = null;
        this._applied = false;
    }

    enable() {
        this._rwcSettings = this._tryGetRwcSettings();
        this.sync();

        const manager = Main.extensionManager;
        if (manager?.connect) {
            this._extId = manager.connect('extension-state-changed', (_mgr, extension) => {
                if (extension?.uuid !== RWC_UUID)
                    return;
                if (!this._rwcSettings)
                    this._rwcSettings = this._tryGetRwcSettings();
                this.sync();
            });
        }
    }

    disable() {
        if (this._extId && Main.extensionManager?.disconnect) {
            Main.extensionManager.disconnect(this._extId);
            this._extId = 0;
        }

        this._restore();
        this._rwcSettings = null;
        this._extensionSettings = null;
    }

    /** Re-read our toggle and apply or restore RWC's keep-maximized flag. */
    sync() {
        if (!this._rwcSettings)
            this._rwcSettings = this._tryGetRwcSettings();
        if (!this._rwcSettings)
            return;

        const want = this._extensionSettings?.get_boolean('rounded-corners-when-maximized');
        if (want)
            this._apply();
        else
            this._restore();
    }

    _tryGetRwcSettings() {
        const schema = Gio.SettingsSchemaSource.get_default().lookup(RWC_SCHEMA, true);
        if (!schema)
            return null;
        return new Gio.Settings({settings_schema: schema});
    }

    _apply() {
        if (!this._rwcSettings)
            return;

        const current = this._readKeepMaximized();
        if (this._savedMaximized === null)
            this._savedMaximized = current;

        if (!current) {
            this._writeKeepMaximized(true);
            this._applied = true;
        }
    }

    _restore() {
        if (!this._rwcSettings || this._savedMaximized === null) {
            this._savedMaximized = null;
            this._applied = false;
            return;
        }

        if (this._applied && this._savedMaximized === false && this._readKeepMaximized())
            this._writeKeepMaximized(false);

        this._savedMaximized = null;
        this._applied = false;
    }

    _readKeepMaximized() {
        const variant = this._rwcSettings.get_value(GLOBAL_KEY);
        const keep = variant.lookup_value('keepRoundedCorners', null);
        if (!keep)
            return false;
        const maximized = keep.lookup_value('maximized', null);
        return maximized ? maximized.get_boolean() : false;
    }

    _writeKeepMaximized(value) {
        const old = this._rwcSettings.get_value(GLOBAL_KEY);
        const builder = new GLib.VariantBuilder(new GLib.VariantType('a{sv}'));

        let sawKeep = false;
        const n = old.n_children();
        for (let i = 0; i < n; i++) {
            const child = old.get_child_value(i);
            const key = child.get_child_value(0).get_string()[0];
            const val = child.get_child_value(1);

            if (key === 'keepRoundedCorners') {
                sawKeep = true;
                const fullscreen = val.lookup_value('fullscreen', null)?.get_boolean() ?? false;
                builder.add_value(new GLib.Variant('{sv}', [
                    key,
                    new GLib.Variant('a{sv}', {
                        maximized: new GLib.Variant('b', value),
                        fullscreen: new GLib.Variant('b', fullscreen),
                    }),
                ]));
            } else {
                builder.add_value(new GLib.Variant('{sv}', [key, val]));
            }
        }

        if (!sawKeep) {
            builder.add_value(new GLib.Variant('{sv}', [
                'keepRoundedCorners',
                new GLib.Variant('a{sv}', {
                    maximized: new GLib.Variant('b', value),
                    fullscreen: new GLib.Variant('b', false),
                }),
            ]));
        }

        this._rwcSettings.set_value(GLOBAL_KEY, builder.end());
    }
}
