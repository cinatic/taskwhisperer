const { GObject, St } = imports.gi

const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const ComponentsHelper = Me.imports.helpers.components

var Icon = GObject.registerClass({
  GTypeName: 'TaskWhisperer_Icon'
}, class Icon extends St.Icon {
  _init ({ icon_name, isCustomIcon, ...props }) {
    const iconOptions = {}

    if (isCustomIcon) {
      iconOptions.gicon = ComponentsHelper.getCustomIconPath(icon_name)
    } else {
      iconOptions.icon_name = icon_name
    }

    super._init({
      ...iconOptions,
      ...props
    })
  }
})
