import Clutter from 'gi://Clutter'
import GObject from 'gi://GObject'
import St from 'gi://St'
import Gtk from 'gi://Gtk'
import Pango from 'gi://Pango'


export const ButtonGroup = GObject.registerClass({
  GTypeName: 'TaskWhisperer_ButtonGroup',
  Signals: {
    'clicked': {
      param_types: [GObject.TYPE_OBJECT]
    }
  }
}, class ButtonGroup extends St.ScrollView {
  _init ({ buttons, style_class, enableScrollbar = true }) {
    super._init({
      style_class: `button-group ${style_class}`,
      x_align: Clutter.ActorAlign.CENTER
    })

    if (!enableScrollbar) {
      this.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.NEVER)
    }

    this._selectedButton = buttons.find(item => item.selected)
    this._buttons = buttons

    this._content = new St.BoxLayout({
      style_class: 'button-group-content',
      x_align: Clutter.ActorAlign.CENTER,
      x_expand: true
    })

    this.add_actor(this._content)

    this.connect('destroy', this._onDestroy.bind(this))

    this._sync()
  }

  async _sync () {
    this._createButtons()
  }

  _createButtons () {
    this._content.destroy_all_children()

    this._buttons.forEach(button => {
      const additionalStyleClasses = this._selectedButton === button ? 'selected' : ''

      const stButton = new St.Button({
        style_class: `button ${additionalStyleClasses}`,
        label: button.label
      })

      const clutterText = stButton.get_first_child()
      clutterText.ellipsize = Pango.EllipsizeMode.NONE

      stButton.buttonData = button

      stButton.connect('clicked', () => {
        this.emit('clicked', stButton)
        this._selectedButton = button
        this._sync()
      })

      this._content.add_child(stButton)
    })
  }

  _onDestroy () {
  }
})
