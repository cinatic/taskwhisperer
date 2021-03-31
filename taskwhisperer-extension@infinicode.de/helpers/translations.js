const Gettext = imports.gettext
const _ = Gettext.gettext
const ngettext = Gettext.ngettext

const Config = imports.misc.config
const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { SETTINGS_SCHEMA_DOMAIN } = Me.imports.helpers.settings

var Translations = {
  BACK: _('back'),
  FILTER_PLACEHOLDER: _('Filter Tasks'),
  LOADING_DATA: _('Loading Data'),
  UNKNOWN: _('UNKNOWN'),
  PANEL_TASK_INFO: amount => ngettext('%d Task', '%d Tasks', amount).format(amount),
  ALL_PROJECT: _('All'),
  UNASSIGNED_PROJECT: _('Unassigned'),
  TASKS: {
    ORDER_BY_DUE: _('↕ Due'),
    ORDER_BY_URGENCY: _('↕ Urgency'),
    SHOW_PENDING: _('Pending'),
    SHOW_COMPLETED: _('Completed'),
    PRIORITY: {
      HIGH: _('High'),
      MEDIUM: _('Medium'),
      LOW: _('Low')
    },
    FORM: {
      PROJECT: _('Project'),
      DESCRIPTION: _('Description'),
      DUE: _('Due'),
      TAGS: _('Tags'),
      PRIORITY: _('Priority'),
      ADDITIONAL: _('Additional'),
      SAVE: _('Save Task')
    }
  },
  FORMATS: {
    DEFAULT_DATE_TIME: _('%H:%M:%S %d.%m.%Y')
  }
}

/**
 * initTranslations:
 * @domain: (optional): the gettext domain to use
 *
 * Initialize Gettext to load translations from extensionsdir/locale.
 * If @domain is not provided, it will be taken from metadata['gettext-domain']
 */
var initTranslations = domain => {
  if (Config.PACKAGE_VERSION.startsWith('3.32')) {
    ExtensionUtils.initTranslations(domain)
  } else {
    const extension = ExtensionUtils.getCurrentExtension()

    domain = domain || SETTINGS_SCHEMA_DOMAIN || extension.metadata['gettext-domain']

    // check if this extension was built with "make zip-file", and thus
    // has the locale files in a subfolder
    // otherwise assume that extension has been installed in the
    // same prefix as gnome-shell
    const localeDir = extension.dir.get_child('locale')
    if (localeDir.query_exists(null)) {
      Gettext.bindtextdomain(domain, localeDir.get_path())
    } else {
      Gettext.bindtextdomain(domain, Config.LOCALEDIR)
    }
  }
}
