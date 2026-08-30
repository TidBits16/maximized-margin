import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from
    'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class MaximizedMarginPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'preferences-desktop-display-symbolic',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: _('Margin'),
            description: _('Maximize and tile keep the margin; F11 fullscreen goes edge-to-edge.'),
        });
        page.add(group);

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
        group.add(gapRow);

        const skipRow = new Adw.SwitchRow({
            title: _('Skip panel edges'),
            subtitle: _('Leave Dash to Panel / top bar edges alone so gaps do not stack'),
        });
        settings.bind(
            'skip-panel-edges',
            skipRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        group.add(skipRow);
    }
}
