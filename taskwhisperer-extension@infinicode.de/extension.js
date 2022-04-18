/* jshint esnext:true */
/*
 *
 *  GNOME Shell Extension for the great Taskwarrior application
 *
 * Copyright (C) 2021
 *     Florijan Hamzic <fh @ infinicode.de>
 *
 * This file is part of taskwhisperer-extension.
 *
 * taskwhisperer-extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * taskwhisperer-extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with taskwhisperer-extension.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

const { Clutter, GObject, St } = imports.gi

const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { MenuItem } = Me.imports.components.panel.menuItem
const { ScreenWrapper } = Me.imports.components.screenWrapper.screenWrapper
const { EventHandler } = Me.imports.helpers.eventHandler
const { SettingsHandler } = Me.imports.helpers.settings

const Gettext = imports.gettext
const _ = Gettext.gettext

const Main = imports.ui.main
const PanelMenu = imports.ui.panelMenu

const MenuPosition = {
  CENTER: 0,
  RIGHT: 1,
  LEFT: 2
}

let TaskWhispererMenuButton = GObject.registerClass(class TaskWhispererMenuButton extends PanelMenu.Button {
  _init () {
    this._previousPanelPosition = null
    this._settingsChangedId = null

    this._mainEventHandler = new EventHandler()
    this._settings = new SettingsHandler()

    // Panel menu item - the current class
    let menuAlignment = 0.25

    if (Clutter.get_default_text_direction() == Clutter.TextDirection.RTL) {
      menuAlignment = 1.0 - menuAlignment
    }

    super._init(menuAlignment, _('taskwarrior'))
    this.add_style_class_name('taskwhisperer-extension')

    this.add_child(new MenuItem(this._mainEventHandler))

    const bin = new St.Widget({ style_class: 'taskwhisperer-extension' })
    bin._delegate = this
    this.menu.box.add_child(bin)

    this._screenWrapper = new ScreenWrapper(this._mainEventHandler)
    bin.add_child(this._screenWrapper)

    // Bind events
    this._mainEventHandler.connect('hide-panel', () => this.menu.close())
    this._settingsChangedId = this._settings.connect('changed', this._sync.bind(this))

    this.menu.connect('destroy', this._destroyExtension.bind(this))
    this.menu.connect('open-state-changed', (menu, isOpen) => {
      this._mainEventHandler.emit('open-state-changed', { isOpen })
    })

    this._sync()
  }

  _sync (changedValue, changedKey) {
    this.checkPositionInPanel()
  }

  checkPositionInPanel () {
    const container = this.container
    const parent = container.get_parent()

    if (!parent || this._previousPanelPosition === this._settings.position_in_panel) {
      return
    }

    parent.remove_actor(container)

    let children = null

    switch (this._settings.position_in_panel) {
      case MenuPosition.LEFT:
        children = Main.panel._leftBox.get_children()
        Main.panel._leftBox.insert_child_at_index(container, children.length)
        break
      case MenuPosition.CENTER:
        children = Main.panel._centerBox.get_children()
        Main.panel._centerBox.insert_child_at_index(container, children.length)
        break
      case MenuPosition.RIGHT:
        children = Main.panel._rightBox.get_children()
        Main.panel._rightBox.insert_child_at_index(container, 0)
        break
    }

    this._previousPanelPosition = this._settings.position_in_panel
  }

  _destroyExtension () {
    if (this._settingsChangedId) {
      this._settings.disconnect(this._settingsChangedId)
    }
  }
})

var taskWhispererMenu

function init (extensionMeta) {
  ExtensionUtils.initTranslations()
}

function enable () {
  taskWhispererMenu = new TaskWhispererMenuButton()
  Main.panel.addToStatusArea('taskWhispererMenu', taskWhispererMenu)
  taskWhispererMenu.checkPositionInPanel()
}

function disable () {
  if (taskWhispererMenu) {
    taskWhispererMenu.destroy()
  }
}
