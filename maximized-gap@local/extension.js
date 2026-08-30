import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {GapManager} from './gapManager.js';

const DTP_SCHEMA = 'org.gnome.shell.extensions.dash-to-panel';

export default class MaximizedGapExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._gapManager = new GapManager(this._settings);
        this._rebuildTimeoutId = 0;

        this._settings.connectObject(
            'changed', () => this._queueRebuild(),
            this
        );
        Main.layoutManager.connectObject(
            'monitors-changed', () => this._queueRebuild(),
            this
        );

        // When intellihide turns on, DTP drops its panel strut and the panel
        // edge becomes a free edge — rebuild so the gap wraps all the way around.
        this._dtpSettings = this._tryGetDtpSettings();
        this._dtpSettings?.connectObject(
            'changed::intellihide', () => this._queueRebuild(300),
            'changed::intellihide-only-secondary', () => this._queueRebuild(300),
            this
        );

        this._queueRebuild(500);
        this._gapManager.rebuild();
    }

    disable() {
        if (this._rebuildTimeoutId) {
            GLib.source_remove(this._rebuildTimeoutId);
            this._rebuildTimeoutId = 0;
        }

        this._settings?.disconnectObject(this);
        this._dtpSettings?.disconnectObject(this);
        Main.layoutManager.disconnectObject(this);

        this._gapManager?.destroy();
        this._gapManager = null;
        this._settings = null;
        this._dtpSettings = null;
    }

    _tryGetDtpSettings() {
        const schema = Gio.SettingsSchemaSource.get_default().lookup(DTP_SCHEMA, true);
        if (!schema)
            return null;
        return new Gio.Settings({settings_schema: schema});
    }

    _queueRebuild(delayMs = 50) {
        if (this._rebuildTimeoutId)
            GLib.source_remove(this._rebuildTimeoutId);

        this._rebuildTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delayMs, () => {
            this._rebuildTimeoutId = 0;
            this._gapManager?.rebuild();
            return GLib.SOURCE_REMOVE;
        });
    }
}
