import Gio from 'gi://Gio'

import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js'
import { SettingsHandler } from './settings.js'

const iconCache = {}

export const getCustomIconPath = iconName => {
  if (iconCache[iconName]) {
    return iconCache[iconName]
  }

  const settings = new SettingsHandler()

  const newIcon = Gio.icon_new_for_string(settings.extensionObject.path + '/icons/' + iconName + '.svg')
  iconCache[iconName] = newIcon

  return newIcon
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

