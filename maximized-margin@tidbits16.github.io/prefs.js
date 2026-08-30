import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from
    'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const DASH_TO_PANEL_URL = 'https://extensions.gnome.org/extension/1160/dash-to-panel/';
const ROUNDED_CORNERS_URL = 'https://extensions.gnome.org/extension/7048/rounded-window-corners-reborn/';

export default class MaximizedMarginPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'preferences-desktop-display-symbolic',
        });
        window.add(page);

        const marginGroup = new Adw.PreferencesGroup({
            title: _('Margin'),
            description: _('Spacing between maximized windows and the screen edges.'),
        });
        page.add(marginGroup);

        const gapRow = new Adw.SpinRow({
            title: _('Gap size'),
            subtitle: _('Pixels of margin on each free edge'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 200,
                step_increment: 1,
                page_increment: 4,
            }),
        });
        settings.bind('gap-size', gapRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        marginGroup.add(gapRow);

        const compatGroup = new Adw.PreferencesGroup({
            title: _('Compatibility'),
            description: _(
                'Optional integrations with other extensions.\n' +
                `<a href="${DASH_TO_PANEL_URL}">Dash to Panel</a>` +
                ' · ' +
                `<a href="${ROUNDED_CORNERS_URL}">Rounded Window Corners Reborn</a>`
            ),
        });
        page.add(compatGroup);

        const dtpRow = new Adw.SwitchRow({
            title: _('Dash to Panel'),
            subtitle: _('Skip panel edges so margins do not stack with Dash to Panel margins'),
        });
        settings.bind(
            'skip-panel-edges',
            dtpRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        compatGroup.add(dtpRow);

        const rwcRow = new Adw.SwitchRow({
            title: _('Rounded Window Corners Reborn'),
            subtitle: _('Keep rounded corners on maximized windows'),
        });
        settings.bind(
            'rounded-corners-when-maximized',
            rwcRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        compatGroup.add(rwcRow);
    }
}
