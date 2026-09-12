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

        const blurGroup = new Adw.PreferencesGroup({
            title: _('Peek blur'),
            description: _(
                'Experimental: blurs the wallpaper in the margin around maximized windows. ' +
                'Uses its own wallpaper clone and will not modify Blur My Shell.'
            ),
        });
        page.add(blurGroup);

        const blurRow = new Adw.SwitchRow({
            title: _('Blur peek margin'),
            subtitle: _('Experimental — only while a window is maximized'),
        });
        settings.bind('peek-blur', blurRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        blurGroup.add(blurRow);

        const radiusRow = new Adw.SpinRow({
            title: _('Blur radius'),
            subtitle: _('Larger radii look softer and tend to be cheaper to render'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 100,
                step_increment: 1,
                page_increment: 5,
            }),
        });
        settings.bind('peek-blur-radius', radiusRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        settings.bind(
            'peek-blur',
            radiusRow,
            'sensitive',
            Gio.SettingsBindFlags.GET
        );
        blurGroup.add(radiusRow);

        const compatGroup = new Adw.PreferencesGroup({
            title: _('Compatibility'),
            description: _(
                'Works great with ' +
                `<a href="${ROUNDED_CORNERS_URL}">Rounded Window Corners Reborn</a>.\n` +
                `<a href="${DASH_TO_PANEL_URL}">Dash to Panel</a>`
            ),
        });
        page.add(compatGroup);

        const dtpRow = new Adw.SwitchRow({
            title: _('Dash to Panel'),
            subtitle: _('Skip panel edges so margins do not stack with the floating panel'),
        });
        settings.bind(
            'skip-panel-edges',
            dtpRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        compatGroup.add(dtpRow);
    }
}
