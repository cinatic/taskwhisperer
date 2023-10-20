import GObject from 'gi://GObject'
import St from 'gi://St'

import * as ComponentsHelper from '../../helpers/components.js'

export const Icon = GObject.registerClass({
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
