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


const Shell = imports.gi.Shell;
const Gettext = imports.gettext;
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const EXTENSIONDIR = Me.dir.get_path();

const Convenience = Me.imports.convenience;
const SpawnReader = Me.imports.spawnReader;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;

var SortOrder = {
    DUE: 0,
    URGENCY: 1
};

var TaskType = {
    ACTIVE: 0,
    COMPLETED: 1
};


var TaskPriority = {
    LOW: "L",
    MEDIUM: "M",
    HIGH: "H"
};

var TaskStatus = {
    COMPLETED: "completed",
    OPEN: "pending"
};


var TaskProperties = {
    ID: "id",
    UUID: "uuid",
    DESCRIPTION: "description",
    TAGS: "tags",
    STATUS: "status",
    URGENCY: "urgency",
    MODIFIED: "modified",
    CREATED: "entry",
    DUE: "due",
    PRIORITY: "priority",
    START: "start",
    PROJECT: "project",
    ANNOTATIONS: "annotations"
};

var EmptyProject = "(none)";


var Task = class Task {
    get AnnotationsAsString() {
        let that = this;
        let dateFormat = Shell.util_translate_time_string(N_("%H:%M:%S %d. %b. %Y"));

        if (!this._annotationsAsString && this.Annotations) {
            this._annotationsAsString = "";
            this.Annotations.forEach(function (item, index) {
                let entryDate = Convenience.isoToDate(item.entry);
                let dateText = entryDate.toLocaleFormat(dateFormat);

                if (index != 0) {
                    that._annotationsAsString += "\r\n";
                }

                if (item.description) {
                    that._annotationsAsString += dateText + "\r\n" + item.description;
                }
            });
        }

        return this._annotationsAsString;
    }

    get TagsAsString() {
        if (!this._tagsAsString && this.Tags) {
            this._tagsAsString = (this.Tags || []).join("\r\n ");
        }

        return this._tagsAsString;
    }

    get DueDate() {
        if (!this._dueDateInputBox) {
            this._dueDateInputBox = Convenience.isoToDate(this.Due);
        }

        return this._dueDateInputBox;
    }

    get DueDateAbbreviation() {
        if (!this._dueDateAbbreviation && this.DueDate) {
            this._dueDateAbbreviation = Convenience.getBestTimeAbbreviation(new Date(), this.DueDate);
        }

        return this._dueDateAbbreviation;
    }

    get Started() {
        if (!this._started) {
            this._started = this.Start != null;
        }

        return this._started;
    }

    constructor(taskData) {
        taskData = taskData || {};

        this._dueDateAbbreviation = null;
        this._annotationsAsString = null;
        this._tagsAsString = null;
        this._dueDateInputBox = null;
        this._started = null;

        this.ID = taskData[TaskProperties.ID];
        this.UUID = taskData[TaskProperties.UUID];
        this.Description = taskData[TaskProperties.DESCRIPTION];
        this.Tags = taskData[TaskProperties.TAGS];
        this.Annotations = taskData[TaskProperties.ANNOTATIONS];
        this.Project = taskData[TaskProperties.PROJECT];
        this.Status = taskData[TaskProperties.STATUS];
        this.Urgency = taskData[TaskProperties.URGENCY];
        this.Modified = taskData[TaskProperties.MODIFIED];
        this.Created = taskData[TaskProperties.CREATED];
        this.Due = taskData[TaskProperties.DUE];
        this.Priority = taskData[TaskProperties.PRIORITY];
        this.Start = taskData[TaskProperties.START];

        this.IsCompleted = this.Status == TaskStatus.COMPLETED;
    }
};


const TaskService = class TaskService {

    loadTaskDataAsync(taskType, projectName, onDataLoaded, onError) {
        let status = "Pending";

        switch (taskType) {
            case TaskType.ACTIVE:
                status = "status:Pending";
                break;
            case TaskType.COMPLETED:
                status = "status:Completed";
                break;
        }

        let project = projectName ? "project:" + projectName : "";

        //let command = ['task', 'rc.json.array=on', status, project, 'export'];
	let command = ['printenv'];
        let reader = new SpawnReader.SpawnReader();

        let buffer = "";

        reader.spawn('./', command, (line) => {
                buffer = buffer + imports.byteArray.toString(line);
            },
            () => {
                //onComplete
                let taskListData;
                try {
			log(buffer)
                    taskListData = JSON.parse(buffer);
                } catch (err) {
                    onError(err);
                    return;
                }

                let taskList = taskListData.map(function (taskData, index, data) {
                    return new Task(taskData);
                });

                onDataLoaded(taskList);
            });
    }

    loadProjectsDataAsync(taskType, onDataLoaded) {
        let status = "Pending";

        switch (taskType) {
            case TaskType.ACTIVE:
                status = "status:Pending";
                break;
            case TaskType.COMPLETED:
                status = "status:Completed";
                break;
        }

        let shellProc = Gio.Subprocess.new(['task', status, 'projects'], Gio.SubprocessFlags.STDOUT_PIPE);

        shellProc.wait_async(null, function (obj, result) {
            let shellProcExited = true;
            shellProc.wait_finish(result);
            let buffer = "";
            let stream;

            function readCB(obj, result) {
                let bytes = stream.read_bytes_finish(result);

                if (!bytes.get_size()) {
                    let projects = {};
                    buffer.split("\n").forEach(function (line) {
                        let values = line.split(" ").filter(value => value);

                        if (values.length !== 2 || isNaN(parseInt(values[1]))) {
                            return;
                        }

                        projects[values[0]] = values[1];

                    });

                    onDataLoaded(projects);
                } else {
                    buffer = buffer + imports.byteArray.toString(bytes.get_data());
                    stream.read_bytes_async(8192, 1, null, readCB);
                }
            }

            stream = shellProc.get_stdout_pipe();
            stream.read_bytes_async(8192, 1, null, readCB);
        });
    }

    setTaskDone(taskID, cb) {
        if (!taskID) {
            return;
        }

        let shellProc = Gio.Subprocess.new(['task', taskID.toString(), 'done'], Gio.SubprocessFlags.STDOUT_PIPE);

        shellProc.wait_async(null, function (obj, result) {
            let shellProcExited = true;
            shellProc.wait_finish(result);
            let buffer = "";
            let stream;

            function readCB(obj, result) {
                let bytes = stream.read_bytes_finish(result);

                if (!bytes.get_size()) {
                    cb();
                } else {
                    buffer = buffer + imports.byteArray.toString(bytes.get_data());
                    stream.read_bytes_async(8192, 1, null, readCB);
                }
            }

            stream = shellProc.get_stdout_pipe();
            stream.read_bytes_async(8192, 1, null, readCB);
        });
    }

    setTaskUndone(taskID, cb) {
        if (!taskID) {
            return;
        }

        let shellProc = Gio.Subprocess.new(['task', 'modify', taskID.toString(), 'status:pending'], Gio.SubprocessFlags.STDOUT_PIPE);

        shellProc.wait_async(null, function (obj, result) {
            let shellProcExited = true;
            shellProc.wait_finish(result);
            let buffer = "";
            let stream;

            function readCB(obj, result) {
                let bytes = stream.read_bytes_finish(result);

                if (!bytes.get_size()) {
                    cb();
                } else {
                    buffer = buffer + imports.byteArray.toString(bytes.get_data());
                    stream.read_bytes_async(8192, 1, null, readCB);
                }
            }

            stream = shellProc.get_stdout_pipe();
            stream.read_bytes_async(8192, 1, null, readCB);
        });
    }

    startTask(taskID, cb) {
        if (!taskID) {
            return;
        }
        let shellProc = Gio.Subprocess.new(['task', taskID.toString(), 'start'], Gio.SubprocessFlags.STDOUT_PIPE);
        shellProc.wait_async(null, function (obj, result) {
            let shellProcExited = true;
            shellProc.wait_finish(result);
            let buffer = "";
            let stream;

            function readCB(obj, result) {
                let bytes = stream.read_bytes_finish(result);
                if (!bytes.get_size()) {
                    cb();
                } else {
                    buffer = buffer + imports.byteArray.toString(bytes.get_data());
                    stream.read_bytes_async(8192, 1, null, readCB);
                }
            }

            stream = shellProc.get_stdout_pipe();
            stream.read_bytes_async(8192, 1, null, readCB);
        });
    }

    stopTask(taskID, cb) {
        if (!taskID) {
            return;
        }
        let shellProc = Gio.Subprocess.new(['task', taskID.toString(), 'stop'], Gio.SubprocessFlags.STDOUT_PIPE);
        shellProc.wait_async(null, function (obj, result) {
            let shellProcExited = true;
            shellProc.wait_finish(result);
            let buffer = "";
            let stream;

            function readCB(obj, result) {
                let bytes = stream.read_bytes_finish(result);
                if (!bytes.get_size()) {
                    cb();
                } else {
                    buffer = buffer + imports.byteArray.toString(bytes.get_data());
                    stream.read_bytes_async(8192, 1, null, readCB);
                }
            }

            stream = shellProc.get_stdout_pipe();
            stream.read_bytes_async(8192, 1, null, readCB);
        });
    }

    modifyTask(taskID, params, cb) {
        if (!taskID) {
            return;
        }

        // FIXME: Gio.Subprocess: due to only passing string vector is allowed, it's not possible to directly pass the
        //        input of the user to subprocess (why & how, if you can answer then please send msg to fh@infinicode.de)
        //        bypassing problem with own shell script
        let shellProc = Gio.Subprocess.new(['/bin/sh', EXTENSIONDIR + '/extra/modify.sh', taskID.toString(), params], Gio.SubprocessFlags.STDOUT_PIPE + Gio.SubprocessFlags.STDERR_MERGE);

        shellProc.wait_async(null, function (obj, result) {
            let shellProcExited = true;
            shellProc.wait_finish(result);
            let buffer = "";
            let stream;

            function readCB(obj, result) {
                let bytes = stream.read_bytes_finish(result);

                if (!bytes.get_size()) {
                    let status = shellProc.get_exit_status();
                    cb.call(this, buffer, status);
                } else {
                    buffer = buffer + imports.byteArray.toString(bytes.get_data());
                    stream.read_bytes_async(8192, 1, null, readCB);
                }
            }

            stream = shellProc.get_stdout_pipe();
            stream.read_bytes_async(8192, 1, null, readCB);
        });
    }

    createTask(params, cb) {
        // FIXME: Gio.Subprocess: due to only passing string vector is allowed, it's not possible to directly pass the
        //        input of the user to subprocess (why & how, if you can answer then please send msg to fh@infinicode.de)
        //        bypassing problem with own shell script
        let shellProc = Gio.Subprocess.new(['/bin/sh', EXTENSIONDIR + '/extra/create.sh', params], Gio.SubprocessFlags.STDOUT_PIPE + Gio.SubprocessFlags.STDERR_MERGE);

        shellProc.wait_async(null, function (obj, result) {
            let shellProcExited = true;
            shellProc.wait_finish(result);
            let buffer = "";
            let stream;

            function readCB(obj, result) {
                let bytes = stream.read_bytes_finish(result);

                if (!bytes.get_size()) {
                    let status = shellProc.get_exit_status();
                    cb.call(this, buffer, status);
                } else {
                    buffer = buffer + imports.byteArray.toString(bytes.get_data());
                    stream.read_bytes_async(8192, 1, null, readCB);
                }
            }

            stream = shellProc.get_stdout_pipe();
            stream.read_bytes_async(8192, 1, null, readCB);
        });
    }

    syncTasksAsync(onDataLoaded, onError) {
        let shellProc;

        try {
            shellProc = Gio.Subprocess.new(['task', 'sync'], Gio.SubprocessFlags.STDOUT_PIPE);
        } catch (err) {
            onError(err);
            return;
        }

        shellProc.wait_async(null, function (obj, result) {
            let shellProcExited = true;
            shellProc.wait_finish(result);
            let buffer = "";
            let stream;

            function readCB(obj, result) {
                let bytes = stream.read_bytes_finish(result);

                if (!bytes.get_size()) {
                    onDataLoaded(buffer);
                } else {
                    buffer = buffer + imports.byteArray.toString(bytes.get_data());
                    stream.read_bytes_async(8192, 1, null, readCB);
                }
            }

            stream = shellProc.get_stdout_pipe();
            stream.read_bytes_async(8192, 1, null, readCB);
        });
    }
};
