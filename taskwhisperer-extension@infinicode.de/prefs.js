import Gio from 'gi://Gio'
import GObject from 'gi://GObject'
import Gtk from 'gi://Gtk'

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import * as Config from 'resource:///org/gnome/Shell/Extensions/js/misc/config.js'
import { initSettings } from './helpers/settings.js'

export const PrefsWidget = GObject.registerClass({
  GTypeName: 'TaskWhispererExtensionPrefsWidget'
}, class Widget extends Gtk.Box {

  _init (settings, path) {
    super._init(Object.assign({}, {
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 0
    }))

    this.Settings = settings
    this.Path = path

    this.Window = new Gtk.Builder()

    this.initWindow()

    if (isGnome4()) {
      this.append(this.MainWidget)
    } else {
      this.add(this.MainWidget)
    }
  }

  initWindow () {
    let uiFile = this.Path + '/settings.ui'

    if (isGnome4()) {
      uiFile = this.Path + '/settings_40.ui'
    }

    this.Window.add_from_file(uiFile)
    this.MainWidget = this.Window.get_object('main-widget')

    let theObjects = this.Window.get_objects()

    theObjects.forEach(gtkWidget => {
      const gtkUiIdentifier = getWidgetUiIdentifier(gtkWidget)
      const widgetType = getWidgetType(gtkWidget)

      switch (widgetType) {
        case 'GtkComboBoxText':
          this.initComboBox(gtkWidget, gtkUiIdentifier)
          break

        case 'GtkSwitch':
          this.initSwitch(gtkWidget, gtkUiIdentifier)
          break
      }
    })

    if (Config.PACKAGE_VERSION) {
      this.Window.get_object('version').set_label(Config.PACKAGE_VERSION.toString())
    }
  }

  initComboBox (gtkWidget, identifier) {
    this.Settings.bind(identifier, gtkWidget, 'active-id', Gio.SettingsBindFlags.DEFAULT)
  }

  initSwitch (gtkWidget, identifier) {
    this.Settings.bind(identifier, gtkWidget, 'active', Gio.SettingsBindFlags.DEFAULT)
  }
})

const getWidgetUiIdentifier = gtkWidget => {
  if (isGnome4()) {
    return gtkWidget.get_buildable_id ? gtkWidget.get_buildable_id() : null
  }

  return gtkWidget.get_name ? gtkWidget.get_name() : null
}

const getWidgetType = gtkWidget => {
  if (isGnome4()) {
    return gtkWidget.get_name ? gtkWidget.get_name() : null
  }

  const classPaths = gtkWidget.class_path ? gtkWidget.class_path()[1] : []

  if (classPaths.indexOf('GtkSwitch') !== -1) {
    return 'GtkSwitch'
  } else if (classPaths.indexOf('GtkComboBoxText') !== -1) {
    return 'GtkComboBoxText'
  }
}

const isGnome4 = () => true

export default class TaskWhispererExtensionPreferences extends ExtensionPreferences {
  getPreferencesWidget () {
    initSettings(this)

    const widget = new PrefsWidget(this.getSettings(), this.path)

    widget.Settings = this.getSettings()
    widget.show()
    return widget
  }
}
