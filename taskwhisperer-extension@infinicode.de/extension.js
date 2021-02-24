/* jshint esnext:true */
/*
 *
 *  GNOME Shell Extension for the great Taskwarrior application
 *  - Displays pending Tasks.
 *  - adding / modifieing tasks.
 *
 * Copyright (C) 2020
 *     Florijan Hamzic <fh @ infinicode.de>
 *
 * This file is part of gnome-shell-extension-stocks.
 *
 * gnome-shell-extension-stocks is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * gnome-shell-extension-stocks is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with gnome-shell-extension-stocks.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

const { Clutter, GObject, St } = imports.gi

const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { MenuItem } = Me.imports.components.panel.menuItem
const { ScreenWrapper } = Me.imports.components.screenWrapper.screenWrapper
const { EventHandler } = Me.imports.helpers.eventHandler
const { initTranslations } = Me.imports.helpers.translations
const { Settings } = Me.imports.helpers.settings

const Gettext = imports.gettext.domain('taskwhisperer@infinicode.de')
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
    this._currentPanelPosition = null
    this._settingsChangedId = null

    // Panel menu item - the current class
    let menuAlignment = 0.25

    if (Clutter.get_default_text_direction() == Clutter.TextDirection.RTL) {
      menuAlignment = 1.0 - menuAlignment
    }

    super._init(menuAlignment, _('taskwarrior'))
    this.add_style_class_name('taskwhisperer-extension')

    this.add_child(new MenuItem())

    const bin = new St.Widget({ style_class: 'taskwhisperer-extension' })
    bin._delegate = this
    this.menu.box.add_child(bin)

    this._screenWrapper = new ScreenWrapper()
    bin.add_child(this._screenWrapper)

    // Bind events
    EventHandler.connect('hide-panel', () => this.menu.close())
    this._settingsChangedId = Settings.connect('changed', (changedValue, changedKey) => this._sync(changedValue, changedKey))

    this.menu.connect('destroy', this._onDestroy.bind(this))
    this.menu.connect('open-state-changed', (menu, isOpen) => {
      EventHandler.emit('open-state-changed', { isOpen })
    })

    this._sync()
  }

  _sync (changedValue, changedKey) {
    this.checkPositionInPanel()
  }

  checkPositionInPanel () {
    const newPosition = Settings.position_in_panel

    if (this._currentPanelPosition === newPosition) {
      return
    }

    this.get_parent().remove_actor(this.actor)

    switch (this._currentPanelPosition) {
      case MenuPosition.LEFT:
        Main.panel._leftBox.remove_actor(this.actor)
        break
      case MenuPosition.CENTER:
        Main.panel._centerBox.remove_actor(this.actor)
        break
      case MenuPosition.RIGHT:
        Main.panel._rightBox.remove_actor(this.actor)
        break
    }

    let children = null
    switch (newPosition) {
      case MenuPosition.LEFT:
        children = Main.panel._leftBox.get_children()
        Main.panel._leftBox.insert_child_at_index(this.actor, children.length)
        break
      case MenuPosition.CENTER:
        children = Main.panel._centerBox.get_children()
        Main.panel._centerBox.insert_child_at_index(this.actor, children.length)
        break
      case MenuPosition.RIGHT:
        children = Main.panel._rightBox.get_children()
        Main.panel._rightBox.insert_child_at_index(this.actor, 0)
        break
    }

    this._currentPanelPosition = newPosition
  }

  _onDestroy () {
    super._onDestroy()

    if (this._settingsChangedId) {
      Settings.disconnect(this._settingsChangedId)
    }
  }
})

var taskWhispererMenu

function init (extensionMeta) {
  initTranslations()
}

function enable () {
  taskWhispererMenu = new TaskWhispererMenuButton()
  Main.panel.addToStatusArea('taskWhispererMenu', taskWhispererMenu)
}

function disable () {
  taskWhispererMenu.destroy()
}
