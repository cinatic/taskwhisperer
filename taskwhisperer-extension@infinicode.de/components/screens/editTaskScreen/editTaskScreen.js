const { Clutter, GObject, St } = imports.gi

const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { EventHandler } = Me.imports.helpers.eventHandler
const { ButtonGroup } = Me.imports.components.buttons.buttonGroup
const { SearchBar } = Me.imports.components.searchBar.searchBar
const { Translations } = Me.imports.helpers.translations
const { TaskPriority } = Me.imports.services.meta.taskWarrior
const { createTask, modifyTask } = Me.imports.services.taskService

var EditTaskScreen = GObject.registerClass({}, class EditTaskScreen extends St.BoxLayout {
  _init (taskItem) {
    super._init({
      style_class: 'screen edit-task-screen',
      vertical: true
    })

    this.task = taskItem || {}
    this.newTask = {}

    this._errorPlaceHolder = null

    const searchBar = new SearchBar({
      back_screen_name: 'overview',
      showFilterInputBox: false,
      showRefreshIcon: false
    })

    this.add_child(searchBar)

    this._createForm()

    this.connect('destroy', this._onDestroy.bind(this))
  }

  _createForm () {
    this.add_child(this._createErrorBox())

    this.add_child(this._createFormElement({
      placeholder: Translations.TASKS.FORM.PROJECT,
      dataField: 'project',
      text: this.task.Project
    }))

    this.add_child(this._createFormElement({
      placeholder: Translations.TASKS.FORM.DESCRIPTION,
      dataField: 'description',
      text: this.task.Description
    }))

    this.add_child(this._createFormElement({
      placeholder: Translations.TASKS.FORM.DUE,
      dataField: 'due',
      text: this.task.Due
    }))

    this.add_child(this._createFormElement({
      placeholder: Translations.TASKS.FORM.TAGS,
      dataField: 'tags',
      text: (this.task.Tags || []).join(', ')
    }))

    const taskPriorityButtonGroup = new ButtonGroup({
      buttons: Object.keys(TaskPriority).map(key => {
        const value = TaskPriority[key]

        return {
          label: Translations.TASKS.PRIORITY[key],
          value: value,
          selected: this.task && this.task.Priority === value
        }
      })
    })

    taskPriorityButtonGroup.connect('clicked', (_, stButton) => {
      this.newTask.priority = stButton.buttonData.value
    })

    this.add_child(this._createFormElement({
      placeholder: Translations.TASKS.FORM.PRIORITY,
      customFormElement: taskPriorityButtonGroup
    }))

    this.add_child(this._createFormElement({
      placeholder: Translations.TASKS.FORM.ADDITIONAL,
      dataField: 'additional'
    }))

    const saveButton = new St.Button({
      style_class: 'button save-button',
      label: Translations.TASKS.FORM.SAVE
    })

    saveButton.connect('clicked', () => this._saveTask())

    this.add_child(saveButton)
  }

  _createErrorBox () {
    const errorBox = new St.BoxLayout({
      style_class: 'error-box p05',
      x_align: Clutter.ActorAlign.CENTER
    })

    this._errorPlaceHolder = new St.Label({
      style_class: 'error-place-holder',
      text: ''
    })

    errorBox.add_child(this._errorPlaceHolder)

    return errorBox
  }

  _createFormElement ({ text, placeholder, dataField, customFormElement }) {
    const formElementbox = new St.BoxLayout({
      style_class: 'form-element-box',
      vertical: true
    })

    const label = new St.Label({
      style_class: 'form-element-label',
      text: `${placeholder}:`
    })

    let formElement

    if (customFormElement) {
      formElement = customFormElement
    } else {
      formElement = new St.Entry({
        style_class: 'form-element-entry',
        hint_text: placeholder,
        text: text || '',
        can_focus: true
      })

      formElement.connect('notify::text', entry => {
        this.newTask[dataField] = entry.text
      })
    }

    formElementbox.add_child(label)
    formElementbox.add_child(formElement)

    return formElementbox
  }

  async _saveTask () {
    let result

    if (this.task.UUID) {
      result = await modifyTask(this.task.UUID, this.newTask)
    } else {
      result = await createTask(this.newTask)
    }

    if (result) {
      if (result.error) {
        this._errorPlaceHolder.text = result.error
      } else {
        EventHandler.emit('show-screen', {
          screen: 'overview'
        })
      }
    }
  }

  _onDestroy () {
  }
})
