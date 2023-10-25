export const Translations = {
  BACK: _('back'),
  FILTER_PLACEHOLDER: _('Filter Tasks'),
  LOADING_DATA: _('Loading Data'),
  UNKNOWN: _('UNKNOWN'),
  PANEL_TASK_INFO: amount => N_('%d Task', '%d Tasks', amount).format(amount),
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
