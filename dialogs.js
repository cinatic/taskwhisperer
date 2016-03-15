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

const Clutter = imports.gi.Clutter;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const St = imports.gi.St;

const Gettext = imports.gettext.domain('gnome-shell-extension-taskwhisperer');
const _ = Gettext.gettext;
const ngettext = Gettext.ngettext;

const Main = imports.ui.main;
const ModalDialog = imports.ui.modalDialog;


const ModifyTaskDialog = new Lang.Class({
    Name   : 'ModifyTaskDialog',
    Extends: ModalDialog.ModalDialog,

    _init: function(task)
    {
        this.parent({styleClass: 'taskModificationDialog'});

        let mainContentBox = new St.BoxLayout({
            style_class: 'prompt-dialog-main-layout',
            vertical   : false
        });

        this.contentLayout.add(mainContentBox);

        this._messageBox = new St.BoxLayout({
            style_class: 'message-box',
            vertical   : true
        });

        mainContentBox.add(this._messageBox, {y_align: St.Align.START, expand: true, x_fill: true, y_fill: true});

        let subject = new St.Label({style_class: 'headline'});
        this._messageBox.add(subject,
            {
                y_fill : false,
                y_align: St.Align.START
            });

        subject.set_text(_("Modify:") + "  " + task.Description);

        this._renderTaskDataRow(this._messageBox, _("Identifier:"), task.ID + " (" + task.UUID + ")");
        this._renderTaskDataRow(this._messageBox, _("Description:"), task.Description);
        this._renderTaskDataRow(this._messageBox, _("Status:"), task.Status);

        if(task.Tags)
        {
            this._renderTaskDataRow(this._messageBox, _("Tags:"), task.TagsAsString);
        }

        if(task.Due)
        {
            let dateFormat = Shell.util_translate_time_string(N_("%H:%M %A %d. %b. %Y"));
            let formattedText = task.DueDate.toLocaleFormat(dateFormat);
            this._renderTaskDataRow(this._messageBox, _("Due:"), formattedText);
        }

        this._descriptionInputBox = new St.Entry({
            style_class: 'modificationInputBox',
            text       : "description:'" + task.Description + "'",
            can_focus  : true
        });

        if(task.Due)
        {
            let dateFormat = Shell.util_translate_time_string(N_("%d.%m.%Y %H:%M"));
            let formattedText = task.DueDate.toLocaleFormat(dateFormat);

            this._descriptionInputBox.text = "due:'" + formattedText + "' " + this._descriptionInputBox.text;
        }

        this._descriptionInputBox.clutter_text.connect('activate', Lang.bind(this, this._onModifyTaskButton));
        this._messageBox.add(this._descriptionInputBox, {expand: true});
        this.setInitialKeyFocus(this._descriptionInputBox);

        this._errorMessageLabel = new St.Label({
            style_class: 'prompt-dialog-error-label',
            text       : _("Sorry, that didn\'t work. Please try again.")
        });

        this._errorMessageLabel.clutter_text.line_wrap = true;
        this._errorMessageLabel.hide();
        this._messageBox.add(this._errorMessageLabel);

        let buttons = [{
            label : _("Cancel"),
            action: Lang.bind(this, this._onCancelButton),
            key   : Clutter.Escape
        },
            {
                label  : _("Modify"),
                action : Lang.bind(this, this._onModifyTaskButton),
                default: true
            }];

        this.setButtons(buttons);
    },

    _renderTaskDataRow: function(boxItem, title, value)
    {
        let rowItem = new St.BoxLayout({
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

        rowItem.add(titleLabel, {expand: true, x_fill: false, x_align: St.Align.START});
        rowItem.add(valueLabel, {expand: true, x_fill: false, x_align: St.Align.END});

        boxItem.add(rowItem);
    },

    _onCancelButton: function()
    {
        this.close();
    },

    _onModifyTaskButton: function()
    {
        if(!this._descriptionInputBox.text)
        {
            this._errorMessageLabel.text = _("A description is required to create a new task!");
            this._errorMessageLabel.show();
            return;
        }

        this.emit('modify', this._descriptionInputBox.text);
    }
});


const CreateTaskDialog = new Lang.Class({
    Name   : 'CreateTaskDialog',
    Extends: ModalDialog.ModalDialog,

    _init: function()
    {
        this.parent({styleClass: 'createTaskDialog'});

        let mainContentBox = new St.BoxLayout({
            style_class: 'prompt-dialog-main-layout',
            vertical   : false
        });

        this.contentLayout.add(mainContentBox);

        this._messageBox = new St.BoxLayout({
            style_class: 'message-box',
            vertical   : true
        });

        mainContentBox.add(this._messageBox, {y_align: St.Align.START, expand: true, x_fill: true, y_fill: true});

        let subject = new St.Label({style_class: 'headline'});
        this._messageBox.add(subject,
            {
                y_fill : false,
                y_align: St.Align.START
            });

        subject.set_text(_("Create New Task"));

        this._descriptionInputBox = new St.Entry({
            style_class: 'descriptionInputBox',
            text       : "",
            hint_text  : _("Enter Description"),
            can_focus  : true
        });

        this._dueDateInputBox = new St.Entry({
            style_class: 'dueDateInputBox',
            text       : "",
            hint_text  : _("Enter DueDate"),
            can_focus  : true
        });

        this._additionalArgumentsInputBox = new St.Entry({
            style_class: 'additionalArgumentsInputBox',
            text       : "",
            hint_text  : _("Additional Arguments"),
            can_focus  : true
        });

        this._errorMessageLabel = new St.Label({
            style_class: 'prompt-dialog-error-label',
            text       : _("Sorry, that didn\'t work. Please try again.")
        });

        this._errorMessageLabel.clutter_text.line_wrap = true;
        this._errorMessageLabel.hide();

        this.setInitialKeyFocus(this._descriptionInputBox);
        this._descriptionInputBox.clutter_text.connect('activate', Lang.bind(this, this._onAddTaskButton));
        this._dueDateInputBox.clutter_text.connect('activate', Lang.bind(this, this._onAddTaskButton));
        this._additionalArgumentsInputBox.clutter_text.connect('activate', Lang.bind(this, this._onAddTaskButton));

        this._messageBox.add(this._descriptionInputBox, {expand: true});
        this._messageBox.add(this._dueDateInputBox, {expand: true});
        this._messageBox.add(this._additionalArgumentsInputBox, {expand: true});
        this._messageBox.add(this._errorMessageLabel);

        let buttons = [{
            label : _("Cancel"),
            action: Lang.bind(this, this._onCancelButton),
            key   : Clutter.Escape
        },
            {
                label  : _("Create"),
                action : Lang.bind(this, this._onAddTaskButton),
                default: true
            }];

        this.setButtons(buttons);
    },

    _onCancelButton: function()
    {
        this.close();
    },

    _onAddTaskButton: function()
    {
        if(!this._descriptionInputBox.text || this._descriptionInputBox.text == this._descriptionInputBox.hint_text)
        {
            this._errorMessageLabel.text = _("A description is required to create a new task!");
            this._errorMessageLabel.show();
            return;
        }

        var argumentsString = this._descriptionInputBox.text;

        if(this._dueDateInputBox.text && this._dueDateInputBox.text != this._dueDateInputBox.hint_text)
        {
            argumentsString = argumentsString + " due:'" + this._dueDateInputBox.text + "'";
        }

        if(this._additionalArgumentsInputBox.text && this._additionalArgumentsInputBox.text != this._additionalArgumentsInputBox.hint_text)
        {
            argumentsString = argumentsString + " " + this._additionalArgumentsInputBox.text;
        }

        this.emit('create', argumentsString);
    }
});