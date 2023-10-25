import Clutter from 'gi://Clutter'
import GObject from 'gi://GObject'
import St from 'gi://St'

import { SettingsHandler, TASKWHISPERER_SHOW_PANEL_ICON, TASKWHISPERER_SHOW_TEXT_IN_PANEL } from '../../helpers/settings.js'
import { Translations } from '../../helpers/translations.js'
import * as ComponentsHelper from '../../helpers/components.js'

const SETTING_KEYS_TO_REFRESH = [
  TASKWHISPERER_SHOW_PANEL_ICON,
  TASKWHISPERER_SHOW_TEXT_IN_PANEL
]

export const MenuItem = GObject.registerClass({
  GTypeName: 'TaskWhisperer_MenuItem'
}, class MenuItem extends St.BoxLayout {
  _init (mainEventHandler) {
    super._init({
      style_class: 'menu-item',
      x_expand: true,
      y_align: Clutter.ActorAlign.CENTER,
      reactive: true,
      y_expand: true,
    })

    this._mainEventHandler = mainEventHandler
    this._settings = new SettingsHandler()

    this._taskCount = 0

    this._settingsChangedId = this._settings.connect('changed', (value, key) => {
      if (SETTING_KEYS_TO_REFRESH.includes(key)) {
        this._sync()
      }
    })

    this._refreshMenuTaskCountId = this._mainEventHandler.connect('refresh-menu-task-count', (_, { taskCount }) => {
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
      this._mainEventHandler.disconnect(this._refreshMenuTaskCountId)
    }
  }
})
