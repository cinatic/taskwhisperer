const { Gio, GLib } = imports.gi

const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { decodeBase64JsonOrDefault, isNullOrEmpty } = Me.imports.helpers.data

var POSITION_IN_PANEL_KEY = 'position-in-panel'
var TASKWHISPERER_ENABLE_TASKD_SYNC = 'enable-taskd-sync'
var TASKWHISPERER_DATEFORMAT = 'dateformat'
var TASKWHISPERER_SHOW_NO_DATES_AT_END = 'show-no-dates-at-end'
var TASKWHISPERER_SHOW_PANEL_ICON = 'show-taskwarrior-icon'
var TASKWHISPERER_SHOW_PANEL_LABEL = 'show-task-amount'
var TASKWHISPERER_TASK_ORDER = 'task-order'
var TASKWHISPERER_TASK_STATUS = 'task-status'
var TASKWHISPERER_PROJECT = 'project'

var SETTINGS_SCHEMA_DOMAIN = 'org.gnome.shell.extensions.taskwhisperer'

/**
 * getSettings:
 * @schemaName: (optional): the GSettings schema id
 *
 * Builds and return a GSettings schema for @schema, using schema files
 * in extensionsdir/schemas. If @schema is not provided, it is taken from
 * metadata['settings-schema'].
 */
var getSettings = () => {
  const extension = ExtensionUtils.getCurrentExtension()

  const schemaName = SETTINGS_SCHEMA_DOMAIN || extension.metadata['settings-schema']

  const GioSSS = Gio.SettingsSchemaSource

  // check if this extension was built with "make zip-file", and thus
  // has the schema files in a subfolder
  // otherwise assume that extension has been installed in the
  // same prefix as gnome-shell (and therefore schemas are available
  // in the standard folders)
  const schemaDir = extension.dir.get_child('schemas')

  let schemaSource

  if (schemaDir.query_exists(null)) {
    schemaSource = GioSSS.new_from_directory(schemaDir.get_path(),
        GioSSS.get_default(),
        false)
  } else {
    schemaSource = GioSSS.get_default()
  }

  const schemaObj = schemaSource.lookup(schemaName, true)

  if (!schemaObj) {
    throw new Error('Schema ' + schemaName + ' could not be found for extension ' + extension.metadata.uuid + '. Please check your installation.')
  }

  return new Gio.Settings({
    settings_schema: schemaObj
  })
}

const Handler = class {
  constructor () {
    this._settings = getSettings(SETTINGS_SCHEMA_DOMAIN)
  }

  get position_in_panel () {
    return this._settings.get_enum(POSITION_IN_PANEL_KEY)
  }

  get enable_taskd_sync () {
    return this._settings.get_boolean(TASKWHISPERER_ENABLE_TASKD_SYNC)
  }

  get dateformat () {
    return this._settings.get_string(TASKWHISPERER_DATEFORMAT)
  }

  get show_no_dates_at_end () {
    return this._settings.get_boolean(TASKWHISPERER_SHOW_NO_DATES_AT_END)
  }

  get show_taskwarrior_icon () {
    return this._settings.get_boolean(TASKWHISPERER_SHOW_PANEL_ICON)
  }

  get show_task_amount () {
    return this._settings.get_boolean(TASKWHISPERER_SHOW_PANEL_LABEL)
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
