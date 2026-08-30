import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {GapManager} from './gapManager.js';
import {RoundedCornersBridge} from './roundedCornersBridge.js';

const DTP_SCHEMA = 'org.gnome.shell.extensions.dash-to-panel';

export default class MaximizedMarginExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._gapManager = new GapManager(this._settings);
        this._roundedCorners = new RoundedCornersBridge(this._settings);
        this._rebuildTimeoutIds = [];

        this._settings.connectObject(
            'changed::gap-size', () => this._queueRebuild(50, true),
            'changed::skip-panel-edges', () => this._queueRebuild(50, true),
            'changed::rounded-corners-when-maximized', () => this._roundedCorners?.sync(),
            this
        );
        Main.layoutManager.connectObject(
            'monitors-changed', () => this._queueRebuild(200, true),
            this
        );

        this._dtpSettings = this._tryGetDtpSettings();
        this._dtpSettings?.connectObject(
            'changed::intellihide', () => this._queueRebuild(300, true),
            'changed::intellihide-only-secondary', () => this._queueRebuild(300, true),
            'changed::panel-positions', () => this._queueRebuild(300, true),
            this
        );

        this._roundedCorners.enable();

        this._gapManager.rebuild();
        this._queueRebuild(300, false);
        this._queueRebuild(1200, false);
    }

    disable() {
        this._clearRebuildTimeouts();

        this._settings?.disconnectObject(this);
        this._dtpSettings?.disconnectObject(this);
        Main.layoutManager.disconnectObject(this);

        this._roundedCorners?.disable();
        this._roundedCorners = null;

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

    _clearRebuildTimeouts() {
        for (const id of this._rebuildTimeoutIds)
            GLib.source_remove(id);
        this._rebuildTimeoutIds = [];
    }

    _queueRebuild(delayMs = 50, coalesce = true) {
        if (coalesce)
            this._clearRebuildTimeouts();

        const id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delayMs, () => {
            this._rebuildTimeoutIds = this._rebuildTimeoutIds.filter(x => x !== id);
            this._gapManager?.rebuild();
            return GLib.SOURCE_REMOVE;
        });
        this._rebuildTimeoutIds.push(id);
    }
}
