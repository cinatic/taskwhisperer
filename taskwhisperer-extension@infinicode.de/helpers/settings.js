const { Gio, GLib } = imports.gi

const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { decodeBase64JsonOrDefault, isNullOrEmpty } = Me.imports.helpers.data

var POSITION_IN_PANEL_KEY = 'position-in-panel'
var TASKWHISPERER_ENABLE_TASKD_SYNC = 'enable-taskd-sync'
var TASKWHISPERER_SHOW_NO_DATES_AT_END = 'show-no-dates-at-end'
var TASKWHISPERER_SHOW_PANEL_ICON = 'show-taskwarrior-icon'
var TASKWHISPERER_SHOW_TEXT_IN_PANEL = 'show-task-text-in-panel'
var TASKWHISPERER_TASK_ORDER = 'task-order'
var TASKWHISPERER_TASK_STATUS = 'task-status'
var TASKWHISPERER_PROJECT = 'project'

var SETTINGS_SCHEMA_DOMAIN = 'org.gnome.shell.extensions.taskwhisperer'

const Handler = class {
  constructor () {
    this._settings = ExtensionUtils.getSettings(SETTINGS_SCHEMA_DOMAIN)
  }

  get position_in_panel () {
    return this._settings.get_enum(POSITION_IN_PANEL_KEY)
  }

  get enable_taskd_sync () {
    return this._settings.get_boolean(TASKWHISPERER_ENABLE_TASKD_SYNC)
  }

  get show_no_dates_at_end () {
    return this._settings.get_boolean(TASKWHISPERER_SHOW_NO_DATES_AT_END)
  }

  get show_taskwarrior_icon () {
    return this._settings.get_boolean(TASKWHISPERER_SHOW_PANEL_ICON)
  }

  get show_task_text_in_panel () {
    return this._settings.get_boolean(TASKWHISPERER_SHOW_TEXT_IN_PANEL)
  }

  get task_order () {
    return this._settings.get_enum(TASKWHISPERER_TASK_ORDER)
  }

  set task_order (v) {
    this._settings.set_enum(TASKWHISPERER_TASK_ORDER, v)
  }

  get task_status () {
    return this._settings.get_enum(TASKWHISPERER_TASK_STATUS)
  }

  set task_status (v) {
    this._settings.set_enum(TASKWHISPERER_TASK_STATUS, v)
  }

  get project () {
    return this._settings.get_string(TASKWHISPERER_PROJECT)
  }

  set project (v) {
    this._settings.set_string(TASKWHISPERER_PROJECT, v)
  }

  connect (identifier, onChange) {
    return this._settings.connect(identifier, onChange)
  }

  disconnect (connectId) {
    this._settings.disconnect(connectId)
  }
}

var Settings = new Handler()
