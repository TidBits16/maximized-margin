import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from
    'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const DASH_TO_PANEL_URL = 'https://extensions.gnome.org/extension/1160/dash-to-panel/';
const ROUNDED_CORNERS_URL = 'https://extensions.gnome.org/extension/7048/rounded-window-corners-reborn/';
const TILING_SHELL_URL = 'https://extensions.gnome.org/extension/7065/tiling-shell/';

function installStepperStyle() {
    const provider = new Gtk.CssProvider();
    provider.load_from_string(`
        .mm-step-value {
            min-width: 3em;
            padding: 2px 10px;
            border-radius: 999px;
            background-color: alpha(@window_fg_color, 0.08);
            font-weight: bold;
        }
    `);
    Gtk.StyleContext.add_provider_for_display(
        Gdk.Display.get_default(),
        provider,
        Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
    );
}

function attachStepper(row, settings, key, {lower, upper, step = 1}) {
    const label = new Gtk.Label({
        xalign: 0.5,
        valign: Gtk.Align.CENTER,
        width_chars: 3,
        css_classes: ['numeric', 'mm-step-value'],
    });
    const plus = new Gtk.Button({
        icon_name: 'list-add-symbolic',
        valign: Gtk.Align.CENTER,
        tooltip_text: _('Increase'),
        css_classes: ['flat', 'circular'],
    });
    const minus = new Gtk.Button({
        icon_name: 'list-remove-symbolic',
        valign: Gtk.Align.CENTER,
        tooltip_text: _('Decrease'),
        css_classes: ['flat', 'circular'],
    });

    const show = value => {
        const next = Math.max(lower, Math.min(upper, value));
        if (settings.get_int(key) !== next)
            settings.set_int(key, next);
        label.label = `${next}`;
        minus.sensitive = next > lower;
        plus.sensitive = next < upper;
    };

    show(settings.get_int(key));
    settings.connect(`changed::${key}`, () => show(settings.get_int(key)));
    plus.connect('clicked', () => show(settings.get_int(key) + step));
    minus.connect('clicked', () => show(settings.get_int(key) - step));

    const box = new Gtk.Box({
        spacing: 6,
        valign: Gtk.Align.CENTER,
    });
    box.append(label);
    box.append(plus);
    box.append(minus);

    const scroll = new Gtk.EventControllerScroll({
        flags: Gtk.EventControllerScrollFlags.VERTICAL |
            Gtk.EventControllerScrollFlags.DISCRETE,
    });
    scroll.connect('scroll', (_controller, _dx, dy) => {
        if (dy < 0)
            show(settings.get_int(key) + step);
        else if (dy > 0)
            show(settings.get_int(key) - step);
        return Gdk.EVENT_STOP;
    });
    box.add_controller(scroll);
    row.add_suffix(box);
}

export default class MaximizedMarginPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        installStepperStyle();
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

        const gapRow = new Adw.ActionRow({
            title: _('Gap size'),
            subtitle: _('Pixels of margin on each free edge'),
        });
        attachStepper(gapRow, settings, 'gap-size', {lower: 0, upper: 200});
        settings.bind(
            'use-custom-margins',
            gapRow,
            'sensitive',
            Gio.SettingsBindFlags.GET | Gio.SettingsBindFlags.INVERT_BOOLEAN
        );
        marginGroup.add(gapRow);

        const customRow = new Adw.ExpanderRow({
            title: _('Use custom margins'),
            subtitle: _(
                'Set the distance from the edge of the desktop.'
            ),
            show_enable_switch: true,
        });
        settings.bind(
            'use-custom-margins',
            customRow,
            'enable-expansion',
            Gio.SettingsBindFlags.DEFAULT
        );
        marginGroup.add(customRow);

        const customEdges = [
            ['custom-margin-top', _('Top')],
            ['custom-margin-bottom', _('Bottom')],
            ['custom-margin-left', _('Left')],
            ['custom-margin-right', _('Right')],
        ];
        for (const [key, title] of customEdges) {
            const row = new Adw.ActionRow({title});
            attachStepper(row, settings, key, {lower: 0, upper: 400});
            customRow.add_row(row);
        }

        const blurGroup = new Adw.PreferencesGroup({
            title: _('Peek blur'),
            description: _(
                'Experimental: blurs the wallpaper in the margin around maximized windows.'
            ),
        });
        page.add(blurGroup);

        const blurRow = new Adw.SwitchRow({
            title: _('Blur peek margin'),
            subtitle: _('Experimental - only while a window is maximized'),
        });
        settings.bind('peek-blur', blurRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        blurGroup.add(blurRow);

        const radiusRow = new Adw.ActionRow({
            title: _('Blur radius'),
            subtitle: _('Larger radii look softer and tend to be cheaper to render'),
        });
        attachStepper(radiusRow, settings, 'peek-blur-radius', {lower: 0, upper: 100});
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
                `<a href="${ROUNDED_CORNERS_URL}">Rounded Window Corners Reborn</a>, ` +
                `<a href="${DASH_TO_PANEL_URL}">Dash to Panel</a>, and ` +
                `<a href="${TILING_SHELL_URL}">Tiling Shell</a>.`
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
        settings.bind(
            'use-custom-margins',
            dtpRow,
            'sensitive',
            Gio.SettingsBindFlags.GET | Gio.SettingsBindFlags.INVERT_BOOLEAN
        );
        compatGroup.add(dtpRow);
    }
}
