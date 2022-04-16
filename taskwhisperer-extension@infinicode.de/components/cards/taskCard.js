const { Clutter, GObject, St } = imports.gi

const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { isNullOrEmpty } = Me.imports.helpers.data
const { IconButton } = Me.imports.components.buttons.iconButton
const { TaskPriority } = Me.imports.services.meta.taskWarrior
const { setTaskDone, setTaskUndone, startTask, stopTask } = Me.imports.services.taskService

var TaskCard = GObject.registerClass({
  GTypeName: 'TaskWhisperer_TaskCard'
}, class TaskCard extends St.Button {
  _init (quoteSummary, mainEventHandler) {
    super._init({
      style_class: 'card message task-card',
      can_focus: true,
      x_expand: true
    })

    this._mainEventHandler = mainEventHandler
    this.cardItem = quoteSummary

    const vContentBox = new St.BoxLayout({
      vertical: true,
      x_expand: true
    })

    this.set_child(vContentBox)

    const cardContentBox = this._createCardContent()
    vContentBox.add_child(cardContentBox)

    this.connect('destroy', this._onDestroy.bind(this))
  }

  _createCardContent () {
    const cardContentBox = new St.BoxLayout({
      style_class: 'content-box',
      x_expand: true,
      y_align: St.Align.MIDDLE
    })

    const statusIconBin = this._createStatusIconBin()
    const descriptionContent = this._createDescriptionContent()
    const quickIconBox = this._createQuickIconBox()

    cardContentBox.add_child(statusIconBin)
    cardContentBox.add_child(descriptionContent)
    cardContentBox.add_child(quickIconBox)

    return cardContentBox
  }

  _createStatusIconBin () {
    let icon = null
    let iconName

    if (this.cardItem.Priority) {
      switch (this.cardItem.Priority) {
        case TaskPriority.LOW:
          iconName = 'priority_low'
          break
        case TaskPriority.MEDIUM:
          iconName = 'priority_medium'
          break
        case TaskPriority.HIGH:
          iconName = 'priority_high'
          break
      }
    }

    if (this.cardItem.Due && !this.cardItem.DueDateAbbreviation) {
      iconName = 'warning'
    }

    if (iconName) {
      icon = new IconButton({
        asButton: false,
        isCustomIcon: true,
        icon_name: iconName,
        icon_size: 20
      })
    }

    const statusIconBin = new St.Bin({
      style_class: 'status-icon-bin',
      y_align: Clutter.ActorAlign.CENTER,
      child: icon
    })

    return statusIconBin
  }

  _createDescriptionContent () {
    const descriptionContentBox = new St.BoxLayout({
      style_class: 'description-box',
      x_expand: true,
      vertical: true,
      y_align: Clutter.ActorAlign.CENTER
    })

    const descriptionLabel = new St.Label({
      style_class: 'task-description fwb',
      text: this.cardItem.Description
    })

    const taskInformationLabel = new St.Label({
      style_class: 'task-information text-s',
      text: this._createTaskInformation()
    })

    descriptionContentBox.add_child(descriptionLabel)
    descriptionContentBox.add_child(taskInformationLabel)

    return descriptionContentBox
  }

  _createQuickIconBox () {
    const quickIconBox = new St.BoxLayout({
      style_class: 'content-box',
      y_align: Clutter.ActorAlign.CENTER
    })

    if (!this.cardItem.IsCompleted) {
      if (!this.cardItem.Started) {
        const startTaskIconButton = new IconButton({
          isCustomIcon: true,
          icon_name: 'start-symbolic',
          style_class: 'button quick-action',
          icon_size: 20,
          onClick: () => this._startTask()
        })

        quickIconBox.add_child(startTaskIconButton)
      } else {
        const stopTaskIconButton = new IconButton({
          isCustomIcon: true,
          icon_name: 'stop-symbolic',
          style_class: 'button quick-action',
          icon_size: 20,
          onClick: () => this._stopTask()
        })

        quickIconBox.add_child(stopTaskIconButton)
      }
    }

    if (this.cardItem.Status === 'pending') {
      const markTaskDoneIconButton = new IconButton({
        isCustomIcon: true,
        icon_name: 'checkbox-symbolic',
        style_class: 'button quick-action',
        icon_size: 20,
        onClick: () => this._setTaskDone()
      })
      quickIconBox.add_child(markTaskDoneIconButton)
    } else {
      const markTaskUndoneIconButton = new IconButton({
        isCustomIcon: true,
        icon_name: 'undo-symbolic',
        style_class: 'button quick-action',
        icon_size: 20,
        onClick: () => this._setTaskUnDone()
      })
      quickIconBox.add_child(markTaskUndoneIconButton)
    }

    const editTaskIconButton = new IconButton({
      isCustomIcon: true,
      icon_name: 'edit-symbolic',
      style_class: 'button quick-action',
      icon_size: 20,
      onClick: () => this._editTask()
    })

    quickIconBox.add_child(editTaskIconButton)

    return quickIconBox
  }

  _onDestroy () {
  }

  _createTaskInformation () {
    let taskInformation = []
    if (this.cardItem.Due) {
      const humanReadableDue = this.cardItem.DueDateAbbreviation
      taskInformation.push(humanReadableDue || 'Over Due')
    }

    if (this.cardItem.Project) {
      taskInformation.push(this.cardItem.Project)
    }

    if (!isNullOrEmpty(this.cardItem.Tags)) {
      taskInformation.push(this.cardItem.Tags.map(tag => `#${tag}`).join(', '))
    }

    taskInformation.push(this.cardItem.UUID)

    return taskInformation.join(' | ')
  }

  async _startTask () {
    await startTask(this.cardItem.ID)
    this._mainEventHandler.emit('refresh-tasks')
  }

  async _stopTask () {
    await stopTask(this.cardItem.ID)
    this._mainEventHandler.emit('refresh-tasks')
  }

  async _setTaskDone () {
    await setTaskDone(this.cardItem.ID)
    this._mainEventHandler.emit('refresh-tasks')
  }

  async _setTaskUnDone () {
    await setTaskUndone(this.cardItem.UUID)
    this._mainEventHandler.emit('refresh-tasks')
  }

  _editTask () {
    this._mainEventHandler.emit('show-screen', {
      screen: 'edit-task',
      additionalData: {
        item: this.cardItem
      }
    })
  }
})
