import Clutter from 'gi://Clutter'
import GObject from 'gi://GObject'
import St from 'gi://St'

const Mainloop = imports.mainloop

import { ButtonGroup } from '../../buttons/buttonGroup.js'
import { IconButton } from '../../buttons/iconButton.js'
import { FlatList } from '../../flatList/flatList.js'
import { TaskCard } from '../../cards/taskCard.js'
import { SearchBar } from '../../searchBar/searchBar.js'
import { clearCache } from '../../../helpers/data.js'
import { SettingsHandler, TASKWHISPERER_PROJECT, TASKWHISPERER_TASK_ORDER, TASKWHISPERER_TASK_STATUS } from '../../../helpers/settings.js'
import { Translations } from '../../../helpers/translations.js'
import { TaskOrder, TaskStatus } from '../../../services/meta/taskWarrior.js'
import { loadProjectsData, loadTaskData } from '../../../services/taskService.js'

const SETTING_KEYS_TO_REFRESH = [
  TASKWHISPERER_PROJECT,
  TASKWHISPERER_TASK_ORDER,
  TASKWHISPERER_TASK_STATUS
]

export const TaskOverviewScreen = GObject.registerClass({}, class TaskOverviewScreen extends St.BoxLayout {
  _init (mainEventHandler) {
    super._init({
      style_class: 'screen task-overview-screen',
      vertical: true
    })

    this._mainEventHandler = mainEventHandler
    this._settings = new SettingsHandler()

    this._isRendering = false
    this._showLoadingInfoTimeoutId = null
    this._autoRefreshTimeoutId = null

    const searchBar = new SearchBar({
      mainEventHandler: this._mainEventHandler,
      additionalIcons: [
        new IconButton({
          isCustomIcon: true,
          style_class: 'button create-icon',
          icon_name: 'create-symbolic',
          icon_size: 18,
          onClick: () => {
            this._mainEventHandler.emit('show-screen', {
              screen: 'edit-task'
            })
          }
        })
      ]
    })

    this.projectsGroup = new ButtonGroup({
      buttons: []
    })

    this._list = new FlatList()

    this.add_child(searchBar)
    this.add_child(this.projectsGroup)
    this.add_child(this._createHeaderBox())
    this.add_child(this._list)

    this.connect('destroy', this._onDestroy.bind(this))

    this._mainEventHandler.connect('refresh-tasks', () => this._loadData())
    searchBar.connect('refresh', () => {
      clearCache()
      this._loadData()
    })

    searchBar.connect('text-change', (sender, searchText) => this._filter_results(searchText))

    this._settingsChangedId = this._settings.connect('changed', (_, key) => {
      if (SETTING_KEYS_TO_REFRESH.includes(key)) {
        this._loadData()
      }
    })

    this._loadData()

    this._registerTimeout()
  }

  _filter_results (searchText) {
    const listItems = this._list.items

    listItems.forEach(item => {
      const data = item.cardItem

      if (!searchText) {
        item.visible = true
        return
      }

      const searchContent = `${data.Description} ${data.UUID} ${data.Status} ${data.Project} ${data.TagsAsString}`.toUpperCase()

      item.visible = searchContent.includes(searchText.toUpperCase())
    })
  }

  _registerTimeout () {
    if (this._autoRefreshTimeoutId) {
      Mainloop.source_remove(this._autoRefreshTimeoutId)
    }

    this._autoRefreshTimeoutId = Mainloop.timeout_add_seconds(this._settings.ticker_interval || 30, () => {
      this._loadData()

      return true
    })
  }

  async _loadData () {
    if (this._showLoadingInfoTimeoutId || this._isRendering) {
      return
    }

    try {
      const { tasks, error } = await loadTaskData({
        project: this._settings.project,
        taskStatus: this._settings.task_status,
        taskOrder: this._settings.task_order
      })

      this._mainEventHandler.emit('refresh-menu-task-count', {
        taskCount: tasks ? tasks.length : '-'
      })

      if (error) {
        // TODO: show additional information like install taskwarrior
        this._list.show_error_info(error)
        return
      }

      this._isRendering = true
      this._showLoadingInfoTimeoutId = setTimeout(() => this._list.show_loading_info(), 500)

      this._showLoadingInfoTimeoutId = clearTimeout(this._showLoadingInfoTimeoutId)

      this._list.clear_list_items()

      tasks.forEach(quoteSummary => {
        this._list.addItem(new TaskCard(quoteSummary, this._mainEventHandler))
      })
    } catch (e) {
      logError(e)
    }

    this._showLoadingInfoTimeoutId = null
    this._isRendering = false

    this._createProjectsButtonGroup()
  }

  async _createProjectsButtonGroup () {
    const projects = await loadProjectsData(this._settings.task_status)

    if (!['all', 'unassigned', ...projects].includes(this._settings.project)) {
      this._settings.project = 'all'
    }

    let buttons = []

    if (projects && projects.length > 0) {
      buttons = [
        {
          label: Translations.ALL_PROJECT,
          value: 'all',
          selected: this._settings.project === 'all'
        },
        ...projects.map(item => ({
          label: item,
          value: item,
          selected: this._settings.project === item
        })),
        {
          label: Translations.UNASSIGNED_PROJECT,
          value: 'unassigned',
          selected: this._settings.project === 'unassigned'
        }
      ]
    }

    const newButtonGroup = new ButtonGroup({ buttons })
    newButtonGroup.connect('clicked', (_, stButton) => this._selectProject(stButton.buttonData.value))

    this.replace_child(this.projectsGroup, newButtonGroup)

    this.projectsGroup = newButtonGroup
  }

  _createHeaderBox () {
    const headerBox = new St.BoxLayout({
      style_class: 'task-overview-header-box',
      x_expand: true
    })

    const leftHeaderBox = this._createLeftHeaderBox()
    const rightHeaderBox = this._createRightHeaderBox()

    headerBox.add_child(leftHeaderBox)
    headerBox.add_child(rightHeaderBox)

    return headerBox
  }

  _createLeftHeaderBox () {
    const leftHeaderBox = new St.BoxLayout({
      style_class: 'task-status-header-box',
      x_expand: true
    })

    const buttons = Object.keys(TaskStatus).map(key => ({
      label: Translations.TASKS[`SHOW_${key}`],
      value: TaskStatus[key],
      selected: TaskStatus[key] === this._settings.task_status
    }))

    const taskStatusButtonGroup = new ButtonGroup({
      buttons,
      style_class: 'task-header-task-status',
      enableScrollbar: false
    })
    taskStatusButtonGroup.connect('clicked', (_, stButton) => this._selectStatus(stButton.buttonData.value))

    leftHeaderBox.add_child(taskStatusButtonGroup)

    return leftHeaderBox
  }

  _createRightHeaderBox () {
    const rightHeaderBox = new St.BoxLayout({
      style_class: 'task-order-header-box',
      x_align: Clutter.ActorAlign.END,
      x_expand: true
    })

    const buttons = Object.keys(TaskOrder).map(key => ({
      label: Translations.TASKS[`ORDER_BY_${key}`],
      value: TaskOrder[key],
      selected: TaskOrder[key] === this._settings.task_order
    }))

    const taskOrderButtonGroup = new ButtonGroup({
      buttons,
      style_class: 'task-header-task-order',
      enableScrollbar: false
    })
    taskOrderButtonGroup.connect('clicked', (_, stButton) => this._selectOrder(stButton.buttonData.value))

    rightHeaderBox.add_child(taskOrderButtonGroup)

    return rightHeaderBox
  }

  _selectProject (project) {
    this._settings.project = project
  }

  _selectOrder (order) {
    this._settings.task_order = order
  }

  _selectStatus (status) {
    this._settings.task_status = status
  }

  _onDestroy () {
    if (this._autoRefreshTimeoutId) {
      Mainloop.source_remove(this._autoRefreshTimeoutId)
    }

    if (this._settingsChangedId) {
      this._settings.disconnect(this._settingsChangedId)
    }

    if (this._showLoadingInfoTimeoutId) {
      this._showLoadingInfoTimeoutId = clearTimeout(this._showLoadingInfoTimeoutId)
    }
  }
})
