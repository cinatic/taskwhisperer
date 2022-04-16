/* jshint esnext:true */
/*
 *
 *  GNOME Shell Extension for the great Taskwarrior application
 *  - Displays pending Tasks.
 *  - adding / modifieing tasks.
 *
 * Copyright (C) 2019
 *     Florijan Hamzic <fh@infinicode.de>,
 *
 * This file is part of gnome-shell-extension-taskwhisperer.
 *
 * gnome-shell-extension-taskwhisperer is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * gnome-shell-extension-taskwhisperer is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with gnome-shell-extension-taskwhisperer.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()

const { showNotification } = Me.imports.helpers.components
const { run } = Me.imports.helpers.subprocess

const { Task } = Me.imports.services.dto.task
const { TaskStatus, TaskOrder } = Me.imports.services.meta.taskWarrior
const { SettingsHandler } = Me.imports.helpers.settings

var loadTaskData = async ({ taskStatus, project, taskOrder }) => {
  let statusFilter = 'status:Pending'
  let projectFilter = ''

  switch (taskStatus) {
    case TaskStatus.PENDING:
      statusFilter = 'status:Pending'
      break
    case TaskStatus.COMPLETED:
      statusFilter = 'status:Completed'
      break
  }

  if (project) {
    switch (project) {
      case 'all':
        break
      case 'unassigned':
        projectFilter = `project:`
        break
      default:
        projectFilter = `project:'${project}'`
        break
    }
  }

  await syncTasks()

  const command = ['task', 'rc.json.array=on', statusFilter, projectFilter, 'export'].join(' ')

  let { output, error } = await run({ command })

  let tasks

  if (output) {
    try {
      tasks = output.map(taskData => new Task(taskData))

      switch (taskOrder) {
        case TaskOrder.DUE:
          if (taskStatus === TaskStatus.COMPLETED) {
            tasks.sort(_sortByModification)
          } else {
            tasks.sort(_sortByDue)
          }
          break

        case TaskOrder.URGENCY:
          tasks.sort(_sortByUrgency)
          break
      }
    } catch (e) {
      logError(e)
      error = e
    }
  }

  return { tasks, error }
}

var loadProjectsData = async taskStatus => {
  let statusFilter = 'status:Pending'

  switch (taskStatus) {
    case TaskStatus.PENDING:
      statusFilter = 'status:Pending'
      break

    case TaskStatus.COMPLETED:
      statusFilter = 'status:Completed'
      break
  }

  await syncTasks()

  const command = ['task', 'rc.json.array=on', statusFilter, 'export'].join(' ')
  const { output: allTheTasks } = await run({ command })

  let sortedUniqueProjects = []

  try {
    sortedUniqueProjects = [...new Set(allTheTasks.filter(item => item.project).map(item => item.project).sort())]
  } catch (e) {
    logError(e)
  }

  return sortedUniqueProjects
}

var setTaskDone = async taskID => {
  if (!taskID) {
    return
  }

  const command = ['task', taskID.toString(), 'done'].join(' ')
  const result = await run({ command, asJson: false })

  if (!result.error) {
    await syncTasks()
  }

  _showProcessErrorNotificationIfError(result, 'Set Task Done')

  return result
}

var setTaskUndone = async taskUUID => {
  if (!taskUUID) {
    return
  }

  const command = ['task', `uuid:${taskUUID}`, 'modify', 'status:pending'].join(' ')
  const result = await run({ command, asJson: false })

  if (!result.error) {
    await syncTasks()
  }

  _showProcessErrorNotificationIfError(result, 'Set Task Undone')

  return result
}

var startTask = async taskID => {
  if (!taskID) {
    return
  }

  const command = ['task', taskID.toString(), 'start'].join(' ')
  const result = await run({ command, asJson: false })

  if (!result.error) {
    await syncTasks()
  }

  _showProcessErrorNotificationIfError(result, 'Start Task')

  return result
}

var stopTask = async taskID => {
  if (!taskID) {
    return
  }

  const command = ['task', taskID.toString(), 'stop'].join(' ')
  const result = await run({ command, asJson: false })

  if (!result.error) {
    await syncTasks()
  }

  _showProcessErrorNotificationIfError(result, 'Stop Task')

  return result
}

var createTask = async task => {
  const params = _convertTaskToParams(task)

  const command = ['task', 'add', ...params].join(' ')
  const result = await run({ command, asJson: false })

  if (!result.error) {
    await syncTasks()
  }

  return result
}

var modifyTask = async (taskUUID, task) => {
  if (!taskUUID) {
    return
  }

  const params = _convertTaskToParams(task)

  const command = ['task', `uuid:${taskUUID}`, 'modify', ...params].join(' ')
  const result = await run({ command, asJson: false })

  if (!result.error) {
    await syncTasks()
  }

  return result
}

var syncTasks = async () => {
  const settings = new SettingsHandler()
  if (!settings.enable_taskd_sync) {
    return
  }

  const command = ['task', 'sync'].join(' ')
  const result = await run({ command, asJson: false })

  _showProcessErrorNotificationIfError(result, 'Sync Tasks')

  return result
}

const _showProcessErrorNotificationIfError = ({ error }, task = 'TaskService') => {
  if (error) {
    showNotification({ title: `TaskWarrior Error ${task}`, message: error, dialogType: 'error' })
  }
}

const _convertTaskToParams = task => {
  const params = []

  if (!task) {
    return params
  }

  if (task.project) {
    params.push(`project:${task.project}`)
  }

  if (task.description) {
    params.push(task.description)
  }

  if (task.tags) {
    params.push(`tags:${task.tags}`)
  }

  if (task.due) {
    params.push(`due:${task.due}`)
  }

  if (task.priority) {
    params.push(`priority:${task.priority}`)
  }

  if (task.additional) {
    params.push(task.additional)
  }

  return params
}

const _sortByDue = (a, b) => {
  const settings = new SettingsHandler()

  let dueA
  let dueB

  if (settings.show_no_dates_at_end) {
    dueA = a.Due || '999999999999999'
    dueB = b.Due || '999999999999999'
  } else {
    dueA = a.Due || ''
    dueB = b.Due || ''
  }

  dueA = dueA.replace('T', '').replace('Z', '')
  dueB = dueB.replace('T', '').replace('Z', '')

  return dueA - dueB
}

const _sortByModification = (a, b) => {
  let valueA = a.Modified || ''
  let valueB = b.Modified || ''

  valueA = valueA.replace('T', '').replace('Z', '')
  valueB = valueB.replace('T', '').replace('Z', '')

  return valueB - valueA
}

const _sortByUrgency = (a, b) => {
  let valueA = a.Urgency || ''
  let valueB = b.Urgency || ''

  return valueB - valueA
}
