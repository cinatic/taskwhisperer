const Shell = imports.gi.Shell

const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { getBestTimeAbbreviation, isoToDate } = Me.imports.helpers.data
const { TaskStatus, TaskProperties } = Me.imports.services.meta.taskWarrior

var Task = class Task {
  get AnnotationsAsString () {
    const dateFormat = Shell.util_translate_time_string(N_('%H:%M:%S %d. %b. %Y'))

    if (!this._annotationsAsString && this.Annotations) {
      this._annotationsAsString = ''

      this.Annotations.forEach((item, index) => {
        const entryDate = isoToDate(item.entry)
        const dateText = entryDate.toLocaleFormat(dateFormat)

        if (index !== 0) {
          this._annotationsAsString += '\r\n'
        }

        if (item.description) {
          this._annotationsAsString += dateText + '\r\n' + item.description
        }
      })
    }

    return this._annotationsAsString
  }

  get TagsAsString () {
    if (!this._tagsAsString && this.Tags) {
      this._tagsAsString = (this.Tags || []).join('\r\n ')
    }

    return this._tagsAsString
  }

  get DueDate () {
    if (!this._dueDateInputBox) {
      this._dueDateInputBox = isoToDate(this.Due)
    }

    return this._dueDateInputBox
  }

  get DueDateAbbreviation () {
    if (!this._dueDateAbbreviation && this.DueDate) {
      this._dueDateAbbreviation = getBestTimeAbbreviation(new Date(), this.DueDate)
    }

    return this._dueDateAbbreviation
  }

  get Started () {
    if (!this._started) {
      this._started = this.Start != null
    }

    return this._started
  }

  constructor (taskData) {
    taskData = taskData || {}

    this._dueDateAbbreviation = null
    this._annotationsAsString = null
    this._tagsAsString = null
    this._dueDateInputBox = null
    this._started = null

    this.ID = taskData[TaskProperties.ID]
    this.UUID = taskData[TaskProperties.UUID]
    this.Description = taskData[TaskProperties.DESCRIPTION]
    this.Tags = taskData[TaskProperties.TAGS]
    this.Annotations = taskData[TaskProperties.ANNOTATIONS]
    this.Project = taskData[TaskProperties.PROJECT]
    this.Status = taskData[TaskProperties.STATUS]
    this.Urgency = taskData[TaskProperties.URGENCY]
    this.Modified = taskData[TaskProperties.MODIFIED]
    this.Created = taskData[TaskProperties.CREATED]
    this.Due = taskData[TaskProperties.DUE]
    this.Priority = taskData[TaskProperties.PRIORITY]
    this.Start = taskData[TaskProperties.START]

    this.IsCompleted = this.Status === TaskStatus.COMPLETED
  }
}
