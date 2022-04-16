const { Clutter, GObject, St } = imports.gi

const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { EventHandler } = Me.imports.helpers.eventHandler
const { SettingsHandler, TASKWHISPERER_SHOW_PANEL_ICON, TASKWHISPERER_SHOW_TEXT_IN_PANEL } = Me.imports.helpers.settings
const { Translations } = Me.imports.helpers.translations
const ComponentsHelper = Me.imports.helpers.components

const SETTING_KEYS_TO_REFRESH = [
  TASKWHISPERER_SHOW_PANEL_ICON,
  TASKWHISPERER_SHOW_TEXT_IN_PANEL
]

var MenuItem = GObject.registerClass({
  GTypeName: 'TaskWhisperer_MenuItem'
}, class MenuItem extends St.BoxLayout {
  _init () {
    super._init({
      style_class: 'menu-item',
      x_expand: true,
      y_align: Clutter.ActorAlign.CENTER,
      reactive: true,
      y_expand: true,
    })

    this._settings = new SettingsHandler()

    this._taskCount = 0

    this._settingsChangedId = this._settings.connect('changed', (value, key) => {
      if (SETTING_KEYS_TO_REFRESH.includes(key)) {
        this._sync()
      }
    })

    this._refreshMenuTaskCountId = EventHandler.connect('refresh-menu-task-count', (_, { taskCount }) => {
      this._taskCount = taskCount
      this._sync()
    })

    this.connect('destroy', this._onDestroy.bind(this))

    this._sync()
  }

  async _sync () {
    this._createTaskInformationBox()
  }

  async _createTaskInformationBox () {
    this.destroy_all_children()

    const taskInformationBox = new St.BoxLayout({
      style_class: 'task-information-box',
      vertical: false,
      x_expand: true,
      y_expand: true,
      y_align: Clutter.ActorAlign.CENTER
    })

    if (this._settings.show_taskwarrior_icon) {
      const icon = new St.Icon({
        y_align: Clutter.ActorAlign.CENTER,
        y_expand: true,
        gicon: ComponentsHelper.getCustomIconPath('taskwarrior-symbolic'),
        style_class: 'menu-icon'
      })

      taskInformationBox.add_child(icon)
    }

    let additionalTaskAmountInformationText

    if (this._settings.show_task_text_in_panel) {
      additionalTaskAmountInformationText = Translations.PANEL_TASK_INFO(this._taskCount)
    } else {
      additionalTaskAmountInformationText = this._settings.show_taskwarrior_icon ? `${this._taskCount}` : `${this._taskCount} T`
    }

    const label = new St.Label({
      style_class: 'menu-label',
      y_align: Clutter.ActorAlign.CENTER,
      y_expand: true,
      text: additionalTaskAmountInformationText
    })

    taskInformationBox.add_child(label)

    this.add_child(taskInformationBox)
  }

  _onDestroy () {
    if (this._settingsChangedId) {
      this._settings.disconnect(this._settingsChangedId)
    }

    if (this._refreshMenuTaskCountId) {
      EventHandler.disconnect(this._refreshMenuTaskCountId)
    }
  }
})
