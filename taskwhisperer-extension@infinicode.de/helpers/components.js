import GLib from 'gi://GLib'
import Gio from 'gi://Gio'

import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js'
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const iconCache = {}

export const getCustomIconPath = iconName => {
  if (iconCache[iconName]) {
    return iconCache[iconName]
  }

  const extensionObject = Extension.lookupByURL(import.meta.url);

  const newIcon = Gio.icon_new_for_string(extensionObject.dir.get_child('icons').get_path() + '/' + iconName + '.svg')
  iconCache[iconName] = newIcon

  return newIcon
}

export const setTimeout = (func, time) => GLib.timeout_add(
    GLib.PRIORITY_DEFAULT,
    time,
    () => {
      func.call()

      return GLib.SOURCE_REMOVE
    })

export const clearTimeout = timerId => {
  GLib.source_remove(timerId)

  return null
}

export const showNotification = ({ title, message, dialogType }) => {
  let icon = 'dialog-question'

  switch (dialogType) {
    case 'error':
      icon = 'dialog-error'
      break
    case 'warning':
      icon = 'dialog-warning'
      break
  }

  const source = new MessageTray.Source('TaskWhisperer', icon)
  const notification = new MessageTray.Notification(source, title, message)

  Main.messageTray.add(source)
  source.showNotification(notification)
}

