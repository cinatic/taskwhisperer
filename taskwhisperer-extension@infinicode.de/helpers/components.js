const { Gio, GLib, GObject } = imports.gi

const Main = imports.ui.main
const MessageTray = imports.ui.messageTray

const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const iconCache = {}

var getCustomIconPath = iconName => {
  if (iconCache[iconName]) {
    return iconCache[iconName]
  }

  const newIcon = Gio.icon_new_for_string(Me.dir.get_child('icons').get_path() + '/' + iconName + '.svg')
  iconCache[iconName] = newIcon

  return newIcon
}

var setTimeout = (func, time) => GLib.timeout_add(
    GLib.PRIORITY_DEFAULT,
    time,
    () => {
      func.call()

      return GLib.SOURCE_REMOVE
    })

var clearTimeout = timerId => {
  GLib.source_remove(timerId)

  return null
}

var showNotification = ({ title, message, dialogType }) => {
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

