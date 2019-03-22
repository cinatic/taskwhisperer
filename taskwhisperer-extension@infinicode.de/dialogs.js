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

const Clutter = imports.gi.Clutter;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const St = imports.gi.St;

const Gettext = imports.gettext.domain('gnome-shell-extension-taskwhisperer');
const _ = Gettext.gettext;
const ngettext = Gettext.ngettext;

const Main = imports.ui.main;
const ModalDialog = imports.ui.modalDialog;


var ModifyTaskDialog = class extends ModalDialog.ModalDialog{

    constructor(task, dateFormat){
        super({styleClass: 'taskModificationDialog'});
        this._init(task, dateFormat)
    }

    _init(task, dateFormat)
    {
        this._dateFormat = dateFormat;

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

        this._descriptionInputBox = new St.Entry({
            style_class: 'modificationInputBox',
            text       : "description:'" + task.Description + "'",
            can_focus  : true
        });

        if(task.Due)
        {
            let displayDateFormat = Shell.util_translate_time_string(N_("%H:%M %A %d. %b. %Y"));
            let formattedText = task.DueDate.toLocaleFormat(displayDateFormat);
            this._renderTaskDataRow(this._messageBox, _("Due:"), formattedText);

            let dateFormat = this._dateFormat || "Y-M-D";

            formattedText = Convenience.taskDateFormatToStringDateFormat(task.DueDate, dateFormat);

            this._descriptionInputBox.text = "due:'" + formattedText + "' " + this._descriptionInputBox.text;
        }

        this._descriptionInputBox.clutter_text.connect('activate', Lang.bind(this, function()
        {
            this._onModifyTaskButton.call(this, dateFormat);
        }));

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
                action : Lang.bind(this, function()
                        {
                            this._onModifyTaskButton.call(this, dateFormat);
                        }),
                default: true
            }];

        this.setButtons(buttons);
    }

    _renderTaskDataRow(boxItem, title, value)
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
    }

    _onCancelButton()
    {
        this.close();
    }

    _onModifyTaskButton()
    {
        if(!this._descriptionInputBox.text)
        {
            this._errorMessageLabel.text = _("A description is required to create a new task!");
            this._errorMessageLabel.show();
            return;
        }

        let params = this._descriptionInputBox.text;

        if(this._dateFormat)
        {
            params = "rc.dateformat='" + this._dateFormat + "' " + params;
        }

        this.emit('modify', params);
    }
};


var CreateTaskDialog = class extends ModalDialog.ModalDialog{

    constructor(dateFormat){
        super({styleClass: 'createTaskDialog'});
        this._init(dateFormat)
    }

    _init(dateFormat)
    {
        this._dateFormat = dateFormat;

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
        this._descriptionInputBox.clutter_text.connect('activate', Lang.bind(this, function()
        {
            this._onAddTaskButton.call(this, dateFormat);
        }));

        this._dueDateInputBox.clutter_text.connect('activate', Lang.bind(this, function()
        {
            this._onAddTaskButton.call(this, dateFormat);
        }));

        this._additionalArgumentsInputBox.clutter_text.connect('activate', Lang.bind(this, function()
        {
            this._onAddTaskButton.call(this, dateFormat);
        }));

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
                action : Lang.bind(this, function()
                        {
                            this._onAddTaskButton.call(this, dateFormat);
                        }),
                default: true
            }];

        this.setButtons(buttons);
    }

    _onCancelButton()
    {
        this.close();
    }

    _onAddTaskButton()
    {
        if(!this._descriptionInputBox.text || this._descriptionInputBox.text == this._descriptionInputBox.hint_text)
        {
            this._errorMessageLabel.text = _("A description is required to create a new task!");
            this._errorMessageLabel.show();
            return;
        }

        let argumentsString = this._descriptionInputBox.text;

        if(this._dueDateInputBox.text && this._dueDateInputBox.text != this._dueDateInputBox.hint_text)
        {
            argumentsString = argumentsString + " due:'" + this._dueDateInputBox.text + "'";
        }

        if(this._additionalArgumentsInputBox.text && this._additionalArgumentsInputBox.text != this._additionalArgumentsInputBox.hint_text)
        {
            argumentsString = argumentsString + " " + this._additionalArgumentsInputBox.text;
        }

        if(this._dateFormat)
        {
            argumentsString = "rc.dateformat='" + this._dateFormat + "' " + argumentsString;
        }

        this.emit('create', argumentsString);
    }
};
