/* jshint esnext:true */
/*
 *
 *  GNOME Shell Extension for the great Taskwarrior application
 *  - Displays pending Tasks.
 *  - adding / modifieing tasks.
 *
 * Copyright (C) 2016
 *     Florijan Hamzic <florijanh@gmail.com>,
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
const Gio = imports.gi.Gio;
const Lang = imports.lang;

const SortOrder = {
    DUE    : 0,
    URGENCY: 1
};

const TaskType = {
    ACTIVE   : 0,
    COMPLETED: 1
};


const TaskPriority = {
    LOW   : "L",
    MEDIUM: "M",
    HIGH  : "H"
};

const TaskStatus = {
    COMPLETED: "completed",
    OPEN     : "pending"
};


const TaskProperties = {
    ID         : "id",
    UUID       : "uuid",
    DESCRIPTION: "description",
    TAGS       : "tags",
    STATUS     : "status",
    URGENCY    : "urgency",
    MODIFIED   : "modified",
    CREATED    : "entry",
    DUE        : "due",
    PRIORITY   : "priority",
    START      : "start",
    PROJECT    : "project",
    ANNOTATIONS: "annotations"
};

const EmptyProject = "(none)";


const Task = new Lang.Class({
    Name: 'Task',

    get AnnotationsAsString()
    {
        let that = this;
        let dateFormat = Shell.util_translate_time_string(N_("%H:%M:%S %d. %b. %Y"));

        if(!this._annotationsAsString && this.Annotations)
        {
            this._annotationsAsString = "";
            this.Annotations.forEach(function(item, index)
            {
                let entryDate = Convenience.isoToDate(item.entry);
                let dateText = entryDate.toLocaleFormat(dateFormat);

                if(index != 0)
                {
                    that._annotationsAsString += "\r\n";
                }

                if(item.description)
                {
                    that._annotationsAsString += dateText + "\r\n" + item.description;
                }
            });
        }

        return this._annotationsAsString;
    },

    get TagsAsString()
    {
        if(!this._tagsAsString && this.Tags)
        {
            this._tagsAsString = (this.Tags || []).join("\r\n ");
        }

        return this._tagsAsString;
    },

    get DueDate()
    {
        if(!this._dueDateInputBox)
        {
            this._dueDateInputBox = Convenience.isoToDate(this.Due);
        }

        return this._dueDateInputBox;
    },

    get DueDateAbbreviation()
    {
        if(!this._dueDateAbbreviation && this.DueDate)
        {
            this._dueDateAbbreviation = Convenience.getBestTimeAbbreviation(new Date(), this.DueDate);
        }

        return this._dueDateAbbreviation;
    },

    get Started()
    {
        if(!this._started)
        {
            this._started = this.Start != null;
        }
        return this._started;
    },

    _init: function(taskData)
    {
        taskData = taskData || {};

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
});


const TaskService = new Lang.Class({
    Name                 : "TaskService",
    loadTaskDataAsync    : function(taskType, projectName, onDataLoaded)
    {
        let status = "Pending";

        switch(taskType)
        {
            case TaskType.ACTIVE:
                status = "status:Pending";
                break;
            case TaskType.COMPLETED:
                status = "status:Completed";
                break;
        }

        let project = projectName ? "project:" + projectName : "";

        let shellProc = Gio.Subprocess.new(['task', 'rc.json.array=on', status, project, 'export'], Gio.SubprocessFlags.STDOUT_PIPE);

        shellProc.wait_async(null, function(obj, result)
        {
            let shellProcExited = true;
            shellProc.wait_finish(result);
            let buffer = "";
            let stream;

            function readCB(obj, result)
            {
                let bytes = stream.read_bytes_finish(result);

                if(!bytes.get_size())
                {
                    buffer = buffer.toString();
                    let taskListData = JSON.parse(buffer);
                    let taskList = taskListData.map(function(taskData, index, data)
                    {
                        return new Task(taskData);
                    });

                    onDataLoaded(taskList);
                }
                else
                {
                    buffer = buffer + bytes.get_data();
                    stream.read_bytes_async(8192, 1, null, readCB);
                }
            }

            stream = shellProc.get_stdout_pipe();
            stream.read_bytes_async(8192, 1, null, readCB);
        });
    },
    loadProjectsDataAsync: function(taskType, onDataLoaded)
    {
        let status = "Pending";

        switch(taskType)
        {
            case TaskType.ACTIVE:
                status = "status:Pending";
                break;
            case TaskType.COMPLETED:
                status = "status:Completed";
                break;
        }

        let shellProc = Gio.Subprocess.new(['task', status, 'projects'], Gio.SubprocessFlags.STDOUT_PIPE);

        shellProc.wait_async(null, function(obj, result)
        {
            let shellProcExited = true;
            shellProc.wait_finish(result);
            let buffer = "";
            let stream;

            function readCB(obj, result)
            {
                let bytes = stream.read_bytes_finish(result);

                if(!bytes.get_size())
                {
                    buffer = buffer.toString();
                    let projects = {};
                    buffer.split("\n").forEach(function(line)
                    {
                        let values = line.split(" ").filter(value => value);
                        if(values.length !== 2 || isNaN(parseInt(values[1])))
                        {
                            return;
                        }

                        projects[values[0]] = values[1];

                    });

                    onDataLoaded(projects);
                }
                else
                {
                    buffer = buffer + bytes.get_data();
                    stream.read_bytes_async(8192, 1, null, readCB);
                }
            }

            stream = shellProc.get_stdout_pipe();
            stream.read_bytes_async(8192, 1, null, readCB);
        });
    },
    setTaskDone          : function(taskID, cb)
    {
        if(!taskID)
        {
            return;
        }

        let shellProc = Gio.Subprocess.new(['task', taskID.toString(), 'done'], Gio.SubprocessFlags.STDOUT_PIPE);

        shellProc.wait_async(null, function(obj, result)
        {
            let shellProcExited = true;
            shellProc.wait_finish(result);
            let buffer = "";

            function readCB(obj, result)
            {
                let bytes = stream.read_bytes_finish(result);

                if(!bytes.get_size())
                {
                    buffer = buffer.toString();
                    cb();
                }
                else
                {
                    buffer = buffer + bytes.get_data();
                    stream.read_bytes_async(8192, 1, null, readCB);
                }
            }

            stream = shellProc.get_stdout_pipe();
            stream.read_bytes_async(8192, 1, null, readCB);
        });
    },
    startTask            : function(taskID, cb)
    {
        if(!taskID)
        {
            return;
        }
        let shellProc = Gio.Subprocess.new(['task', taskID.toString(), 'start'], Gio.SubprocessFlags.STDOUT_PIPE);
        shellProc.wait_async(null, function(obj, result)
        {
            let shellProcExited = true;
            shellProc.wait_finish(result);
            let buffer = "";

            function readCB(obj, result)
            {
                let bytes = stream.read_bytes_finish(result);
                if(!bytes.get_size())
                {
                    buffer = buffer.toString();
                    cb();
                }
                else
                {
                    buffer = buffer + bytes.get_data();
                    stream.read_bytes_async(8192, 1, null, readCB);
                }
            }

            stream = shellProc.get_stdout_pipe();
            stream.read_bytes_async(8192, 1, null, readCB);
        });
    },
    stopTask             : function(taskID, cb)
    {
        if(!taskID)
        {
            return;
        }
        let shellProc = Gio.Subprocess.new(['task', taskID.toString(), 'stop'], Gio.SubprocessFlags.STDOUT_PIPE);
        shellProc.wait_async(null, function(obj, result)
        {
            let shellProcExited = true;
            shellProc.wait_finish(result);
            let buffer = "";

            function readCB(obj, result)
            {
                let bytes = stream.read_bytes_finish(result);
                if(!bytes.get_size())
                {
                    buffer = buffer.toString();
                    cb();
                }
                else
                {
                    buffer = buffer + bytes.get_data();
                    stream.read_bytes_async(8192, 1, null, readCB);
                }
            }

            stream = shellProc.get_stdout_pipe();
            stream.read_bytes_async(8192, 1, null, readCB);
        });
    },
    modifyTask           : function(taskID, params, cb)
    {
        if(!taskID)
        {
            return;
        }

        // FIXME: Gio.Subprocess: due to only passing string vector is allowed, it's not possible to directly pass the
        //        input of the user to subprocess (why & how, if you can answer then please send msg to fh@infinicode.de)
        //        bypassing problem with own shell script
        let shellProc = Gio.Subprocess.new(['/bin/sh', EXTENSIONDIR + '/extra/modify.sh', taskID.toString(), params], Gio.SubprocessFlags.STDOUT_PIPE + Gio.SubprocessFlags.STDERR_MERGE);

        shellProc.wait_async(null, function(obj, result)
        {
            let shellProcExited = true;
            shellProc.wait_finish(result);
            let buffer = "";

            function readCB(obj, result)
            {
                let bytes = stream.read_bytes_finish(result);

                if(!bytes.get_size())
                {
                    buffer = buffer.toString();
                    let status = shellProc.get_exit_status();
                    cb.call(this, buffer, status);
                }
                else
                {
                    buffer = buffer + bytes.get_data();
                    stream.read_bytes_async(8192, 1, null, readCB);
                }
            }

            stream = shellProc.get_stdout_pipe();
            stream.read_bytes_async(8192, 1, null, readCB);
        });
    },
    createTask           : function(params, cb)
    {
        // FIXME: Gio.Subprocess: due to only passing string vector is allowed, it's not possible to directly pass the
        //        input of the user to subprocess (why & how, if you can answer then please send msg to fh@infinicode.de)
        //        bypassing problem with own shell script
        let shellProc = Gio.Subprocess.new(['/bin/sh', EXTENSIONDIR + '/extra/create.sh', params], Gio.SubprocessFlags.STDOUT_PIPE + Gio.SubprocessFlags.STDERR_MERGE);

        shellProc.wait_async(null, function(obj, result)
        {
            let shellProcExited = true;
            shellProc.wait_finish(result);
            let buffer = "";

            function readCB(obj, result)
            {
                let bytes = stream.read_bytes_finish(result);

                if(!bytes.get_size())
                {
                    buffer = buffer.toString();
                    let status = shellProc.get_exit_status();
                    cb.call(this, buffer, status);
                }
                else
                {
                    buffer = buffer + bytes.get_data();
                    stream.read_bytes_async(8192, 1, null, readCB);
                }
            }

            stream = shellProc.get_stdout_pipe();
            stream.read_bytes_async(8192, 1, null, readCB);
        });
    },
    syncTasksAsync       : function(onDataLoaded)
    {
        let shellProc = Gio.Subprocess.new(['task', 'sync'], Gio.SubprocessFlags.STDOUT_PIPE);

        shellProc.wait_async(null, function(obj, result)
        {
            let shellProcExited = true;
            shellProc.wait_finish(result);
            let buffer = "";
            let stream;

            function readCB(obj, result)
            {
                let bytes = stream.read_bytes_finish(result);

                if(!bytes.get_size())
                {
                    buffer = buffer.toString();

                    onDataLoaded(buffer);
                }
                else
                {
                    buffer = buffer + bytes.get_data();
                    stream.read_bytes_async(8192, 1, null, readCB);
                }
            }

            stream = shellProc.get_stdout_pipe();
            stream.read_bytes_async(8192, 1, null, readCB);
        });
    }
});
