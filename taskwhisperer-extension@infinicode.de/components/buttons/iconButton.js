const { GObject, St, Clutter } = imports.gi

const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()
const ComponentsHelper = Me.imports.helpers.components

var IconButton = GObject.registerClass({
  GTypeName: 'TaskWhisperer_IconButton'
}, class IconButton extends St.Button {
  _init ({ icon_name, isCustomIcon, onClick, icon_size = 18, text, style_class, asButton, ...props }
      = {
    asButton: true
  }) {
    super._init({
      reactive: true,
      can_focus: true,
      track_hover: true,
      style_class: `icon-button ${asButton ? 'button' : ''} ${style_class || ''}`,
      y_align: Clutter.ActorAlign.CENTER,
      ...props
    })

    let hContentBox = new St.BoxLayout({
      vertical: false,
      x_expand: true,
      y_expand: true,
      y_align: Clutter.ActorAlign.CENTER
    })
    this.set_child(hContentBox)

    const iconOptions = { icon_size }

    if (isCustomIcon) {
      iconOptions.gicon = ComponentsHelper.getCustomIconPath(icon_name)
    } else {
      iconOptions.icon_name = icon_name
    }

    if (onClick) {
      this.connect('clicked', onClick)
    }

    const icon = new St.Icon(iconOptions)

    hContentBox.add_child(icon)

    if (text) {
      const label = new St.Label({ style_class: 'icon-button-label', text })
      hContentBox.add_child(label)
    }
  }
})
