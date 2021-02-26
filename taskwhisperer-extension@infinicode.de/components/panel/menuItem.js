const { Clutter, GObject, St } = imports.gi

const Mainloop = imports.mainloop

const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { EventHandler } = Me.imports.helpers.eventHandler
const { Settings, TASKWHISPERER_SHOW_PANEL_ICON, TASKWHISPERER_SHOW_PANEL_LABEL } = Me.imports.helpers.settings
const { Translations } = Me.imports.helpers.translations
const ComponentsHelper = Me.imports.helpers.components

const SETTING_KEYS_TO_REFRESH = [
  TASKWHISPERER_SHOW_PANEL_ICON,
  TASKWHISPERER_SHOW_PANEL_LABEL
]

var MenuItem = GObject.registerClass({}, class MenuItem extends St.BoxLayout {
  _init () {
    super._init({
      style_class: 'menu-item',
      x_expand: true,
      y_expand: true,
      y_align: Clutter.ActorAlign.CENTER,
      reactive: true
    })

    this._taskCount = 0

    this._settingsChangedId = Settings.connect('changed', (value, key) => {
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
      x_expand: true,
      y_expand: true
    })

    if (Settings.show_taskwarrior_icon) {
      const icon = new St.Icon({
        gicon: ComponentsHelper.getCustomIconPath('taskwarrior-symbolic'),
        style_class: 'system-status-icon'
      })

      taskInformationBox.add_child(icon)
    }

    let additionalTaskAmountInformationText

    if (Settings.show_task_text_in_panel) {
      additionalTaskAmountInformationText = Translations.PANEL_TASK_INFO(this._taskCount)
    } else {
      additionalTaskAmountInformationText = Settings.show_taskwarrior_icon ? `${this._taskCount}` : `${this._taskCount} T`
    }

    const label = new St.Label({
      text: additionalTaskAmountInformationText
    })

    taskInformationBox.add_child(label)

    this.add_child(taskInformationBox)
  }

  _onDestroy () {
    if (this._settingsChangedId) {
      Settings.disconnect(this._settingsChangedId)
    }

    if (this._refreshMenuTaskCountId) {
      EventHandler.disconnect(this._refreshMenuTaskCountId)
    }
  }
})
