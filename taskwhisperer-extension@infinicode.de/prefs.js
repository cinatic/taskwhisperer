const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const Gettext = imports.gettext.domain('gnome-shell-extension-taskwhisperer');
const _ = Gettext.gettext;
const Soup = imports.gi.Soup;

const Lang = imports.lang;
const Mainloop = imports.mainloop;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Config = imports.misc.config;
const Convenience = Me.imports.convenience;

const EXTENSIONDIR = Me.dir.get_path();

var TASKWHISPERER_SETTINGS_SCHEMA = 'org.gnome.shell.extensions.taskwhisperer';
var TASKWHISPERER_POSITION_IN_PANEL_KEY = 'position-in-panel';
var TASKWHISPERER_ENABLE_TASKD_SYNC = 'enable-taskd-sync';
var TASKWHISPERER_DATEFORMAT = 'dateformat';
var TASKWHISPERER_SHOW_NO_DATES_AT_END = 'show-no-dates-at-end';
var TASKWHISPERER_SHOW_PANEL_ICON = 'show-taskwarrior-icon';
var TASKWHISPERER_SHOW_PANEL_LABEL = 'show-task-amount';
var TASKWHISPERER_USE_ALTERNATIVE_THEME = 'use-alternative-theme';
var TASKWHISPERER_SORT_ORDER = 'sort-order';

let inRealize = false;

let defaultSize = [-1, -1];

var PrefsWidget = GObject.registerClass({
    GTypeName: 'TaskWhispererExtensionPrefsWidget',
}, class Widget extends Gtk.Box {

    _init(params) {
        super._init(Object.assign(params, {
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 0
        }));

        this.configWidgets = [];
        this.Window = new Gtk.Builder();

        this.initWindow();

        defaultSize = this.MainWidget.get_size_request();
        let borderWidth = this.MainWidget.get_border_width();

        defaultSize[0] += 2 * borderWidth;
        defaultSize[1] += 2 * borderWidth;

        this.MainWidget.set_size_request(-1, -1);
        this.MainWidget.set_border_width(0);

        this.evaluateValues();

        this.add(this.MainWidget);


        this.MainWidget.connect('realize', Lang.bind(this, function () {
            if (inRealize)
                return;
            inRealize = true;

            this.MainWidget.get_toplevel().resize(defaultSize[0], defaultSize[1]);
            inRealize = false;
        }));
    }

    initWindow() {
        this.Window.add_from_file(EXTENSIONDIR + "/settings.ui");

        this.MainWidget = this.Window.get_object("main-widget");

        let theObjects = this.Window.get_objects();
        for (let i in theObjects) {
            let name = theObjects[i].get_name ? theObjects[i].get_name() : 'dummy';

            if (this[name] !== undefined) {
                if (theObjects[i].class_path()[1].indexOf('GtkEntry') != -1)
                    this.initEntry(theObjects[i]);
                else if (theObjects[i].class_path()[1].indexOf('GtkComboBoxText') != -1)
                    this.initComboBox(theObjects[i]);
                else if (theObjects[i].class_path()[1].indexOf('GtkSwitch') != -1)
                    this.initSwitch(theObjects[i]);
                else if (theObjects[i].class_path()[1].indexOf('GtkScale') != -1)
                    this.initScale(theObjects[i]);


                this.configWidgets.push([theObjects[i], name]);
            }
        }

        if (Me.metadata.version !== undefined) {
            this.Window.get_object('version').set_label(Me.metadata.version.toString());
        }
    }

    clearEntry() {
        arguments[0].set_text("");
    }

    initEntry(theEntry) {
        let name = theEntry.get_name();
        theEntry.text = this[name];
        if (this[name].length != 32)
            theEntry.set_icon_from_icon_name(Gtk.PositionType.LEFT, 'dialog-warning');

        theEntry.connect("notify::text", Lang.bind(this, function () {
            let key = arguments[0].text;
            this[name] = key;
            if (key.length == 32)
                theEntry.set_icon_from_icon_name(Gtk.PositionType.LEFT, '');
            else
                theEntry.set_icon_from_icon_name(Gtk.PositionType.LEFT, 'dialog-warning');
        }));
    }

    initComboBox(theComboBox) {
        let name = theComboBox.get_name();
        theComboBox.connect("changed", Lang.bind(this, function () {
            this[name] = arguments[0].active;
        }));
    }

    initSwitch(theSwitch) {
        let name = theSwitch.get_name();

        theSwitch.connect("notify::active", Lang.bind(this, function () {
            this[name] = arguments[0].active;
        }));
    }

    initScale(theScale) {
        let name = theScale.get_name();
        theScale.set_value(this[name]);
        this[name + 'Timeout'] = undefined;
        theScale.connect("value-changed", Lang.bind(this, function (slider) {
            if (this[name + 'Timeout'] !== undefined)
                Mainloop.source_remove(this[name + 'Timeout']);
            this[name + 'Timeout'] = Mainloop.timeout_add(250, Lang.bind(this, function () {
                this[name] = slider.get_value();
                return false;
            }));
        }));
    }

    loadConfig() {
        this.Settings = Convenience.getSettings(TASKWHISPERER_SETTINGS_SCHEMA);
        this.Settings.connect("changed", Lang.bind(this, this.evaluateValues));
    }

    evaluateValues() {
        let config = this.configWidgets;
        for (let i in config) {

            if (config[i][0].active != this[config[i][1]])
                config[i][0].active = this[config[i][1]];
        }
    }

    // The names must be equal to the ID in settings.ui!
    get position_in_panel() {
        if (!this.Settings)
            this.loadConfig();
        return this.Settings.get_enum(TASKWHISPERER_POSITION_IN_PANEL_KEY);
    }

    set position_in_panel(v) {
        if (!this.Settings)
            this.loadConfig();

        this.Settings.set_enum(TASKWHISPERER_POSITION_IN_PANEL_KEY, v);
    }

    get enable_taskd_sync() {
        if (!this.Settings)
            this.loadConfig();
        return this.Settings.get_boolean(TASKWHISPERER_ENABLE_TASKD_SYNC);
    }

    set enable_taskd_sync(v) {
        if (!this.Settings)
            this.loadConfig();
        this.Settings.set_boolean(TASKWHISPERER_ENABLE_TASKD_SYNC, v);
    }

    get dateformat() {
        if (!this.Settings)
            this.loadConfig();
        return this.Settings.get_string(TASKWHISPERER_DATEFORMAT);
    }

    set dateformat(v) {
        if (!this.Settings)
            this.loadConfig();
        this.Settings.set_string(TASKWHISPERER_DATEFORMAT, v);
    }

    get show_no_dates_at_end() {
        if (!this.Settings)
            this.loadConfig();
        return this.Settings.get_boolean(TASKWHISPERER_SHOW_NO_DATES_AT_END);
    }

    set show_no_dates_at_end(v) {
        if (!this.Settings)
            this.loadConfig();
        this.Settings.set_boolean(TASKWHISPERER_SHOW_NO_DATES_AT_END, v);
    }

    get show_taskwarrior_icon() {
        if (!this.Settings)
            this.loadConfig();
        return this.Settings.get_boolean(TASKWHISPERER_SHOW_PANEL_ICON);
    }

    set show_taskwarrior_icon(v) {
        if (!this.Settings)
            this.loadConfig();
        this.Settings.set_boolean(TASKWHISPERER_SHOW_PANEL_ICON, v);
    }

    get show_task_amount() {
        if (!this.Settings)
            this.loadConfig();
        return this.Settings.get_boolean(TASKWHISPERER_SHOW_PANEL_LABEL);
    }

    set show_task_amount(v) {
        if (!this.Settings)
            this.loadConfig();
        this.Settings.set_boolean(TASKWHISPERER_SHOW_PANEL_LABEL, v);
    }

    get use_alternative_theme() {
        if (!this.Settings)
            this.loadConfig();
        return this.Settings.get_boolean(TASKWHISPERER_USE_ALTERNATIVE_THEME);
    }

    set use_alternative_theme(v) {
        if (!this.Settings)
            this.loadConfig();
        this.Settings.set_boolean(TASKWHISPERER_USE_ALTERNATIVE_THEME, v);
    }
});

function init() {
    Convenience.initTranslations('gnome-shell-extension-taskwhisperer');
}

function buildPrefsWidget() {
    let widget = new PrefsWidget();
    widget.show_all();
    return widget;
}
