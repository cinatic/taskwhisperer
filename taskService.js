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


const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const EXTENSIONDIR = Me.dir.get_path();

const Convenience = Me.imports.convenience;
const Gio = imports.gi.Gio;
const Lang = imports.lang;

const TaskPriority = {
    LOW   : "L",
    MEDIUM: "M",
    HIGH  : "H"
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
    PRIORITY   : "priority"
};


const Task = new Lang.Class({
    Name: 'Task',

    get TagsAsString()
    {
        if(!this._tagsAsString)
        {
            this._tagsAsString = (this.Tags || []).join(", ");
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


    _init: function(taskData)
    {
        taskData = taskData || {};

        this.ID = taskData[TaskProperties.ID];
        this.UUID = taskData[TaskProperties.UUID];
        this.Description = taskData[TaskProperties.DESCRIPTION];
        this.Tags = taskData[TaskProperties.TAGS];
        this.Status = taskData[TaskProperties.STATUS];
        this.Urgency = taskData[TaskProperties.URGENCY];
        this.Modified = taskData[TaskProperties.MODIFIED];
        this.Created = taskData[TaskProperties.CREATED];
        this.Due = taskData[TaskProperties.DUE];
        this.Priority = taskData[TaskProperties.PRIORITY];
    }
});


const TaskService = new Lang.Class({
    Name             : "TaskService",
    loadTaskDataAsync: function(onDataLoaded)
    {
        let shellProc = Gio.Subprocess.new(['task', 'rc.json.array=on', 'status:Pending', 'export'], Gio.SubprocessFlags.STDOUT_PIPE);

        shellProc.wait_async(null, function(obj, result)
        {
            let shellProcExited = true;
            shellProc.wait_finish(result);
            let buffer = "";
            var stream;

            function readCB(obj, result)
            {
                var bytes = stream.read_bytes_finish(result);

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
    setTaskDone      : function(taskID, cb)
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
                var bytes = stream.read_bytes_finish(result);

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
    modifyTask       : function(taskID, params, cb)
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
                var bytes = stream.read_bytes_finish(result);

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
    createTask       : function(params, cb)
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
                var bytes = stream.read_bytes_finish(result);

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
    }
});
