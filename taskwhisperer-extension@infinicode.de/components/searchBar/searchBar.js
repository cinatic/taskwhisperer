import Clutter from 'gi://Clutter'
import GObject from 'gi://GObject'
import St from 'gi://St'

import { IconButton } from '../buttons/iconButton.js'
import { Translations } from '../../helpers/translations.js'
import { SettingsHandler } from '../../helpers/settings.js'

export const SearchBar = GObject.registerClass({
  GTypeName: 'TaskWhisperer_SearchBar',
  Signals: {
    'text-change': {
      param_types: [GObject.TYPE_STRING]
    },
    'refresh': {}
  }
}, class SearchBar extends St.BoxLayout {
  _init ({ back_screen_name, showFilterInputBox = true, showRefreshIcon = true, additionalIcons, mainEventHandler } = {}) {
    super._init({
      style_class: 'search-bar',
      x_expand: true
    })

    this._mainEventHandler = mainEventHandler
    this.back_screen_name = back_screen_name
    this.additionalIcons = additionalIcons
    this._showRefreshIcon = showRefreshIcon

    this._searchAreaBox = this._createSearchArea({ showFilterInputBox })
    this._buttonBox = this._createButtonBox()

    this.add_child(this._searchAreaBox)
    this.add_child(this._buttonBox)

    this.connect('destroy', this._onDestroy.bind(this))
  }

  _createSearchArea ({ showFilterInputBox }) {
    let searchInputBox = new St.BoxLayout({
      style_class: 'search-area-box',
      x_expand: true
    })

    if (this.back_screen_name) {
      const backIconButton = new IconButton({
        style_class: 'button navigate-back-icon-button',
        icon_name: 'go-previous-symbolic',
        text: Translations.BACK,
        onClick: () => this._mainEventHandler.emit('show-screen', { screen: this.back_screen_name })
      })

      searchInputBox.add_child(backIconButton)
    }

    if (showFilterInputBox) {
      const searchIcon = new St.Icon({
        style_class: 'search-entry-icon',
        icon_name: 'edit-find-symbolic'
      })

      const inputBox = new St.Entry({
        style_class: 'search-text-input',
        hint_text: Translations.FILTER_PLACEHOLDER,
        can_focus: true
      })

      inputBox.connect('notify::text', entry => this.emit('text-change', entry.text))

      inputBox.set_primary_icon(searchIcon)

      const inputBoxBin = new St.Bin({
        style_class: 'search-text-input-bin',
        x_expand: true,
        child: inputBox
      })

      searchInputBox.add_child(inputBoxBin)
    }

    return searchInputBox
  }

  _createButtonBox () {
    let buttonBox = new St.BoxLayout({
      style_class: 'button-box',
      x_align: Clutter.ActorAlign.END
    })

    if (this.additionalIcons) {
      this.additionalIcons.forEach(item => buttonBox.add_child(item))
    }

    if (this._showRefreshIcon) {
      const refreshIconButton = new IconButton({
        style_class: 'button refresh-icon',
        icon_name: 'view-refresh-symbolic',
        icon_size: 18,
        onClick: () => this.emit('refresh')
      })
      buttonBox.add_child(refreshIconButton)
    }

    const settingsIconButton = new IconButton({
      style_class: 'button settings-icon',
      icon_name: 'emblem-system-symbolic',
      icon_size: 18,
      onClick: () => {
        const settings = new SettingsHandler()
        this._mainEventHandler.emit('hide-panel')
        settings.extensionObject.openPreferences();
      }
    })
    buttonBox.add_child(settingsIconButton)

    return buttonBox
  }

  _onDestroy () {
  }
})
