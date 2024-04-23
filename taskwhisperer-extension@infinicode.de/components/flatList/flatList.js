import Clutter from 'gi://Clutter'
import GObject from 'gi://GObject'
import St from 'gi://St'
import Graphene from 'gi://Graphene'

import { ScaleLayout } from '../scaleLayout/scaleLayout.js'
import { Translations } from '../../helpers/translations.js'

export const MESSAGE_ANIMATION_TIME = 100

export const FlatList = GObject.registerClass({
  GTypeName: 'TaskWhisperer_FlatList',
  Signals: {
    'clicked-item': {
      param_types: [GObject.TYPE_OBJECT]
    }
  }
}, class FlatList extends St.ScrollView {
  _init () {
    super._init({
      style_class: 'scroll-box',
      overlay_scrollbars: true,
      x_expand: true,
      y_expand: true,
      clip_to_allocation: true,
      hscrollbar_policy: St.PolicyType.NEVER,
      vscrollbar_policy: St.PolicyType.AUTOMATIC
    })

    this._content = new St.BoxLayout({
      style_class: 'flatlist',
      vertical: true,
      x_expand: true,
      y_expand: true
    })

    this.add_child(this._content)
  }

  get items () {
    return this._content.get_children().map(i => i.child)
  }

  clear_list_items () {
    this._content.destroy_all_children()
  }

  show_loading_info (text) {
    this.clear_list_items()

    const listInfo = new St.Button({
      style_class: 'flat-list-loading-text',

      label: text || Translations.LOADING_DATA
    })

    this._content.add_child(listInfo)
  }

  show_error_info (text) {
    this.clear_list_items()

    const errorInfo = new St.Button({
      style_class: 'flat-list-error-text',
      label: text || Translations.ERROR_LOADING_DATA
    })

    this._content.add_child(errorInfo)
  }

  addItem (item, animate) {
    this.addItemAtIndex(item, -1, animate)
  }

  addItemAtIndex (item, index, animate) {
    if (this.items.includes(item)) {
      throw new Error('Message was already added previously')
    }

    item.connect('clicked', () => {
      this.emit('clicked-item', item)
    })

    const listItem = new St.Bin({
      child: item,
      layout_manager: new ScaleLayout(),
      pivot_point: new Graphene.Point({ x: .5, y: .5 })
    })

    this._content.insert_child_at_index(listItem, index)

    if (animate) {
      listItem.set({ scale_x: 0, scale_y: 0 })
      listItem.ease({
        scale_x: 1,
        scale_y: 1,
        duration: MESSAGE_ANIMATION_TIME,
        mode: Clutter.AnimationMode.EASE_OUT_QUAD
      })
    }
  }
})
