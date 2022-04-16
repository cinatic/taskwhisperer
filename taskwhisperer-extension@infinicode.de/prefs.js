const { Gtk, Gio, GObject } = imports.gi

const Config = imports.misc.config
const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { SETTINGS_SCHEMA_DOMAIN } = Me.imports.helpers.settings

const EXTENSIONDIR = Me.dir.get_path()

var PrefsWidget = GObject.registerClass({
  GTypeName: 'TaskWhispererExtensionPrefsWidget'
}, class Widget extends Gtk.Box {

  _init (params = {}) {
    super._init(Object.assign(params, {
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 0
    }))

    this.Window = new Gtk.Builder()

    this.loadConfig()
    this.initWindow()

    if (isGnome4()) {
      this.append(this.MainWidget)
    } else {
      this.add(this.MainWidget)
    }
  }

  initWindow () {
    let uiFile = EXTENSIONDIR + '/settings.ui'

    if (isGnome4()) {
      uiFile = EXTENSIONDIR + '/settings_40.ui'
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

    if (Me.metadata.version !== undefined) {
      this.Window.get_object('version').set_label(Me.metadata.version.toString())
    }
  }

  initComboBox (gtkWidget, identifier) {
    this.Settings.bind(identifier, gtkWidget, 'active-id', Gio.SettingsBindFlags.DEFAULT)
  }

  initSwitch (gtkWidget, identifier) {
    this.Settings.bind(identifier, gtkWidget, 'active', Gio.SettingsBindFlags.DEFAULT)
  }

  loadConfig () {
    this.Settings = ExtensionUtils.getSettings(SETTINGS_SCHEMA_DOMAIN)
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

const isGnome4 = () => Config.PACKAGE_VERSION.startsWith('4')

// this is called when settings has been opened
var init = () => {
  ExtensionUtils.initTranslations(Me.metadata['gettext-domain'])
}

function buildPrefsWidget () {
  const widget = new PrefsWidget()

  widget.show()

  return widget
}
