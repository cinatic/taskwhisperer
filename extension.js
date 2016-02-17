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
const Convenience = Me.imports.convenience;
const Dialogs = Me.imports.dialogs;
const TaskService = Me.imports.taskService.TaskService;

const Config = imports.misc.config;
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Shell = imports.gi.Shell;
const ShellEntry = imports.ui.shellEntry;
const St = imports.gi.St;
const Util = imports.misc.util;

const Gettext = imports.gettext.domain('gnome-shell-extension-taskwhisperer');
const _ = Gettext.gettext;
const ngettext = Gettext.ngettext;

const Main = imports.ui.main;
const ModalDialog = imports.ui.modalDialog;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

// Settings
const TASKWHISPERER_SETTINGS_SCHEMA = 'org.gnome.shell.extensions.taskwhisperer';
const TASKWHISPERER_DESKTOP_INTERFACE = 'org.gnome.desktop.interface';


const MenuPosition = {
    CENTER: 0,
    RIGHT : 1,
    LEFT  : 2
};


let _cachedData;
let _cacheExpirationTime;
let _currentItems = [];
let _cacheDurationInSeconds = 10;
let _refreshTaskDataTimeoutID = undefined;
let _isOpen = false;


const ButtonBoxMenuItem = new Lang.Class({
    Name   : 'ButtonBaseMenuItem',
    Extends: PopupMenu.PopupBaseMenuItem,

    _init: function(text, icon, func)
    {
        this.parent();
        this.func = func;

        //this._icon = new St.Icon({
        //    icon_name    : icon
        //});
        //this.actor.add_child(this._icon);

        this._label = new St.Label({text: text});
        this.actor.add_child(this._label);
    }
});


const TextIconMenuItem = new Lang.Class({
    Name   : 'TextIconMenuItem',
    Extends: PopupMenu.PopupBaseMenuItem,

    _init: function(text, icon, func)
    {
        this.parent();
        this.func = func;

        this._label = new St.Label({text: text});
        this.actor.add_child(this._label);
    },

    activate: function(event)
    {
        this.func();
    },
});


const TaskWhispererMenuButton = new Lang.Class({
    Name: 'TaskWhispererMenuButton',

    Extends: PanelMenu.Button,

    get _position_in_panel()
    {
        //if(!this._settings)
        //{
        //    this.loadConfig();
        //}

        return MenuPosition.CENTER;
    },

    _init: function()
    {
        this.switchProvider();

        // Load settings
        // this.loadConfig();

        // Label
        this._panelButtonLabel = new St.Label({
            y_align: Clutter.ActorAlign.CENTER,
            text   : _('...')
        });

        // Panel menu item - the current class
        let menuAlignment = 0.25;

        if(Clutter.get_default_text_direction() == Clutter.TextDirection.RTL)
        {
            menuAlignment = 1.0 - menuAlignment;
        }

        this.parent(menuAlignment);

        // Putting the panel item together
        let topBox = new St.BoxLayout();
        topBox.add_actor(this._panelButtonLabel);
        this.actor.add_actor(topBox);

        let dummyBox = new St.BoxLayout();
        this.actor.reparent(dummyBox);
        dummyBox.remove_actor(this.actor);
        dummyBox.destroy();

        this.actor.add_style_class_name('task-whisperer');

        let children = null;
        switch(this._position_in_panel)
        {
            case MenuPosition.LEFT:
                children = Main.panel._leftBox.get_children();
                Main.panel._leftBox.insert_child_at_index(this.actor, children.length);
                break;
            case MenuPosition.CENTER:
                children = Main.panel._centerBox.get_children();
                Main.panel._centerBox.insert_child_at_index(this.actor, children.length);
                break;
            case MenuPosition.RIGHT:
                children = Main.panel._rightBox.get_children();
                Main.panel._rightBox.insert_child_at_index(this.actor, 0);
                break;
        }

        if(Main.panel._menus === undefined)
        {
            Main.panel.menuManager.addMenu(this.menu);
        }
        else
        {
            Main.panel._menus.addMenu(this.menu);
        }

        this._renderPanelMenuHeaderBox();

        this.menu.connect('open-state-changed', Lang.bind(this, function(menu, isOpen)
        {
            _isOpen = isOpen;
            this.reloadTaskData();
        }));

        this.reloadTaskData();
        this.setRefreshTaskDataTimeout();

        if(ExtensionUtils.versionCheck(['3.8'], Config.PACKAGE_VERSION))
        {
            this._needsColorUpdate = true;
            let context = St.ThemeContext.get_for_stage(global.stage);
            this._globalThemeChangedId = context.connect('changed', Lang.bind(this, function()
            {
                this._needsColorUpdate = true;
            }));
        }
    },

    reloadTaskData: function(refreshCache, afterReloadCallback)
    {
        let now = new Date().getTime() / 1000;
        if(refreshCache || !_cacheExpirationTime || _cacheExpirationTime < now)
        {
            _cacheExpirationTime = now + _cacheDurationInSeconds;
            this.service.loadTaskDataAsync(Lang.bind(this, function(data)
            {
                data.sort(function(a, b)
                {
                    let dueA = a.Due || "";
                    let dueB = b.Due || "";

                    dueA = dueA.replace("T", "").replace("Z", "");
                    dueB = dueB.replace("T", "").replace("Z", "");

                    return dueA - dueB;
                });

                this._buildGrid(data);

                this._panelButtonLabel.text = ngettext("%d Task", "%d Tasks", data.length).format(data.length);

                if(afterReloadCallback)
                {
                    afterReloadCallback.call(this);
                }
            }));
        }
    },

    _renderPanelMenuHeaderBox: function()
    {
        let addNewTaskButton = new TextIconMenuItem(_("Add new Task"), "view-add-symbolic", Lang.bind(this, function()
        {
            this._openTaskCreationDialog();
        }));

        let reloadTaskDataButton = new TextIconMenuItem(_("Reload Task Data"), "view-refresh-symbolic", Lang.bind(this, function()
        {
            this.reloadTaskData(true);
        }));

        this.menu.addMenuItem(addNewTaskButton);
        this.menu.addMenuItem(reloadTaskDataButton);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    },

    _buildGrid: function(data)
    {
        //this._taskGrid = new St.Bin();
        for(let i = 0; i < _currentItems.length; i++)
        {
            _currentItems[i].destroy();
        }

        _currentItems = [];

        for(let i = 0; i < data.length; i++)
        {
            let task = data[i];
            let dueDateAbbreviation = task.DueDateAbbreviation || "";

            let gridMenu = new PopupMenu.PopupSubMenuMenuItem(dueDateAbbreviation + "  " + task.Description, true);
            gridMenu.actor.add_style_class_name("taskGrid");

            this._appendDataRow(gridMenu, _("Identifier:"), task.ID + " (" + task.UUID + ")");
            this._appendDataRow(gridMenu, _("Description:"), task.Description);
            this._appendDataRow(gridMenu, _("Status:"), task.Status);

            if(task.Tags)
            {
                this._appendDataRow(gridMenu, _("Tags:"), task.TagsAsString);
            }

            if(task.Due)
            {
                let dateFormat = Shell.util_translate_time_string(N_("%H:%M %A %d. %b. %Y"));
                let formattedText = task.DueDate.toLocaleFormat(dateFormat);
                this._appendDataRow(gridMenu, _("Due:"), formattedText);
            }

            let buttonBox = new St.BoxLayout({
                style_class: 'buttonBox'
            });

            this._buttonMenu = new PopupMenu.PopupBaseMenuItem({
                reactive   : false,
                style_class: 'button-container'
            });

            this._markDoneButton = this.createButton(_("Set Task Done"), "doneTask", Lang.bind(this, function()
            {
                this.service.setTaskDone(task.ID, Lang.bind(this, function()
                {
                    _currentItems.splice(_currentItems.indexOf(gridMenu), 1);
                    gridMenu.destroy();
                    this._panelButtonLabel.text = ngettext("%d Task", "%d Tasks", _currentItems.length + 1).format(_currentItems.length + 1);
                }));
            }));

            this._modifyButton = this.createButton(_("Modify Task"), "modifyTask", Lang.bind(this, function()
            {
                this._openModificationDialog(task);
            }));

            buttonBox.add(this._markDoneButton, {expand: true, x_fill: true, x_align: St.Align.MIDDLE});
            buttonBox.add(this._modifyButton, {expand: true, x_fill: true, x_align: St.Align.MIDDLE});

            if(ExtensionUtils.versionCheck(['3.8'], Config.PACKAGE_VERSION))
            {
                this._buttonMenu.add_actor(buttonBox);
            }
            else
            {
                this._buttonMenu.actor.add_actor(buttonBox);
            }

            gridMenu.menu.addMenuItem(this._buttonMenu);
            this.menu.addMenuItem(gridMenu);

            // collect items so we have constant access to them
            _currentItems.push(gridMenu);
        }
    },

    _appendDataRow: function(gridMenu, title, value)
    {
        let rowMenuItem = new PopupMenu.PopupBaseMenuItem({
            reactive   : false,
            style_class: 'taskDataRowMenuItem'
        });

        let taskDataRow = new St.BoxLayout({
            style_class: 'taskDataRow'
        });

        let titleLabel = new St.Label({
            text       : title,
            style_class: 'rowTitle'
        });

        let valueLabel = new St.Label({
            text       : value,
            style_class: 'rowValue'
        });

        taskDataRow.add(titleLabel, {expand: true, x_fill: false, x_align: St.Align.START});
        taskDataRow.add(valueLabel, {expand: true, x_fill: false, x_align: St.Align.END});

        if(ExtensionUtils.versionCheck(['3.8'], Config.PACKAGE_VERSION))
        {
            rowMenuItem.add_actor(taskDataRow);
        }
        else
        {
            rowMenuItem.actor.add_actor(taskDataRow);
        }

        gridMenu.menu.addMenuItem(rowMenuItem);
    },

    _openModificationDialog: function(task)
    {
        // FIXME: looks like a bug, if i remove actor.hide / show, i have to click twice on the dialog
        //        once to kill the (already hidden menu) twice to interact with the dialog.. dafuq?
        this.menu.actor.hide();
        this.actor.hide();
        this.actor.show();

        this._modifyTaskDialog = new Dialogs.ModifyTaskDialog(task);

        this._modifyTaskDialog.connect('modify',
            Lang.bind(this, function(dialog, modificationParameter)
            {
                this.service.modifyTask(task.ID, modificationParameter, Lang.bind(this, function(buffer, status)
                {
                    if(status != 0)
                    {
                        dialog._errorMessageLabel.show();
                        return;
                    }

                    this.reloadTaskData(true);
                    dialog.close();
                }));
            }));

        this._modifyTaskDialog.open(global.get_current_time());
    },

    _openTaskCreationDialog: function()
    {
        // FIXME: looks like a bug, if i remove actor.hide / show, i have to click twice on the dialog
        //        once to kill the (already hidden menu) twice to interact with the dialog.. dafuq?
        this.menu.actor.hide();
        this.actor.hide();
        this.actor.show();

        this._createTaskDialog = new Dialogs.CreateTaskDialog();

        this._createTaskDialog.connect('create',
            Lang.bind(this, function(dialog, parameterString)
            {
                this.service.createTask(parameterString, Lang.bind(this, function(buffer, status)
                {
                    if(status != 0)
                    {
                        dialog._errorMessageLabel.show();
                        return;
                    }

                    this.reloadTaskData(true);
                    dialog.close();
                }));
            }));

        this._createTaskDialog.open(global.get_current_time());
    },

    switchProvider: function()
    {
        // By now only direct export of taskwarrior is supported
        this.useTaskWarriorExport();
    },

    useTaskWarriorExport: function()
    {
        this.service = new TaskService();
    },

    createButton: function(text, accessibleName, onClick)
    {
        let button = new St.Button({
            reactive       : true,
            can_focus      : true,
            track_hover    : true,
            label          : text,
            accessible_name: accessibleName,
            style_class    : 'popup-menu-item button'
        });

        if(onClick)
        {
            button.connect('clicked', Lang.bind(this, onClick));
        }

        return button;
    },

    setRefreshTaskDataTimeout: function()
    {
        if(this._refreshTaskDataTimeoutID)
        {
            Mainloop.source_remove(this._refreshTaskDataTimeoutID);
            this._refreshTaskDataTimeoutID = undefined;
        }

        this._refreshTaskDataTimeoutID = Mainloop.timeout_add_seconds(150, Lang.bind(this, function()
        {
            // Avoid intervention while user is doing something
            if(!_isOpen)
            {
                this.reloadTaskData();
            }

            this.setRefreshTaskDataTimeout();
            return true;
        }));
    },

    stop: function()
    {
        _currentItems = [];
        _cacheExpirationTime = undefined;

        if(this._refreshTaskDataTimeoutID)
        {
            Mainloop.source_remove(this._refreshTaskDataTimeoutID);
            this._refreshTaskDataTimeoutID = undefined;
        }
    }
});

let taskWhispererMenu;

function init()
{
    Convenience.initTranslations('gnome-shell-extension-taskwhisperer');
}

function enable()
{
    taskWhispererMenu = new TaskWhispererMenuButton();
    Main.panel.addToStatusArea('taskWhispererMenu', taskWhispererMenu);
}

function disable()
{
    taskWhispererMenu.stop();
    taskWhispererMenu.destroy();
}
