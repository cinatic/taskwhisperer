/* jshint esnext:true */
/* -*- mode: js -*- */
/*
 Copyright (c) 2007 Florijan Hamzic <florijanh@gmail.com>

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright
 notice, this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright
 notice, this list of conditions and the following disclaimer in the
 documentation and/or other materials provided with the distribution.
 * Neither the name of the GNOME nor the
 names of its contributors may be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE LIABLE FOR ANY
 DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

const Gettext = imports.gettext;
const {GObject, Gio} = imports.gi;

const Config = imports.misc.config;
const ExtensionUtils = imports.misc.extensionUtils;

const _MS_PER_MINUTE = 1000 * 60;
const _MS_PER_HOUR = 1000 * 60 * 60;
const _MS_PER_DAY = 1000 * 60 * 60 * 24;

const ALPHABET_DICT = {"a": "a", "b": "b", "c": "c", "d": "d", "e": "e", "f": "f", "g": "g", "h": "h", "i": "i", "j": "j", "k": "k", "l": "l", "m": "m", "n": "n", "o": "o", "p": "p", "q": "q", "r": "r", "s": "s", "t": "t", "u": "u", "v": "v", "w": "w", "x": "x", "y": "y", "z": "z"};

// extensionMeta is the object obtained from the metadata.json file, plus // the path property which is the path of the extension folder!
function init(extensionMeta) {
    let theme = imports.gi.Gtk.IconTheme.get_default();
    theme.append_search_path(extensionMeta.path + "/icons");
}

/**
 * initTranslations:
 * @domain: (optional): the gettext domain to use
 *
 * Initialize Gettext to load translations from extensionsdir/locale.
 * If @domain is not provided, it will be taken from metadata['gettext-domain']
 */
function initTranslations(domain) {
    if (ExtensionUtils.versionCheck(['3.32'], Config.PACKAGE_VERSION)) {
        ExtensionUtils.initTranslations('gnome-shell-extension-taskwhisperer');
    } else {
        let extension = ExtensionUtils.getCurrentExtension();

        domain = domain || extension.metadata['gettext-domain'];

        // check if this extension was built with "make zip-file", and thus
        // has the locale files in a subfolder
        // otherwise assume that extension has been installed in the
        // same prefix as gnome-shell
        let localeDir = extension.dir.get_child('locale');
        if (localeDir.query_exists(null)) {
            Gettext.bindtextdomain(domain, localeDir.get_path());
        } else {
            Gettext.bindtextdomain(domain, Config.LOCALEDIR);
        }
    }
}

/**
 * getSettings:
 * @schema: (optional): the GSettings schema id
 *
 * Builds and return a GSettings schema for @schema, using schema files
 * in extensionsdir/schemas. If @schema is not provided, it is taken from
 * metadata['settings-schema'].
 */
function getSettings(schema) {
    let extension = ExtensionUtils.getCurrentExtension();

    schema = schema || extension.metadata['settings-schema'];

    const GioSSS = Gio.SettingsSchemaSource;

    // check if this extension was built with "make zip-file", and thus
    // has the schema files in a subfolder
    // otherwise assume that extension has been installed in the
    // same prefix as gnome-shell (and therefore schemas are available
    // in the standard folders)
    let schemaDir = extension.dir.get_child('schemas');
    let schemaSource;
    if (schemaDir.query_exists(null)) {
        schemaSource = GioSSS.new_from_directory(schemaDir.get_path(),
            GioSSS.get_default(),
            false);
    } else {
        schemaSource = GioSSS.get_default();
    }

    let schemaObj = schemaSource.lookup(schema, true);
    if (!schemaObj) {
        throw new Error('Schema ' + schema + ' could not be found for extension ' + extension.metadata.uuid + '. Please check your installation.');
    }

    return new Gio.Settings({
        settings_schema: schemaObj
    });
}

function isoToDate(input) {
    if (!input) {
        return;
    }

    let a = Date.parse(input.slice(0, 4) + "-" + input.slice(4, 6) + "-" + input.slice(6, 11) + ":" +
        input.slice(11, 13) + ":" + input.slice(13, 16));

    return isNaN(a) ? null : new Date(a);
}

function taskDateFormatToStringDateFormat(date, format) {
    if (!format) {
        return;
    }

    let stringDateFormat = "";

    for (let i = 0; i < format.length; i++) {
        let char = format[i];

        switch (char) {
            case "H":
                let hours = date.getHours();
                stringDateFormat += hours > 9 ? hours : '0' + hours;
                break;
            case "N":
                let minutes = date.getMinutes();
                stringDateFormat += minutes > 9 ? minutes : '0' + minutes;
                break;
            case "D":
                stringDateFormat += date.getDate();
                break;
            case "M":
                let month = date.getMonth() + 1;
                stringDateFormat += month > 9 ? month : '0' + month;
                break;
            case "Y":
                stringDateFormat += date.getFullYear();
                break;
            default:
                stringDateFormat += char;
                break;
        }
    }

    return stringDateFormat;
}

function getBestTimeAbbreviation(a, b) {
    if (!a || !b) {
        return;
    }

    // Discard the time and time-zone information.
    let diffTime = b - a;
    let result = "";

    let minutes = Math.floor(diffTime / _MS_PER_MINUTE);
    let hours = Math.floor(diffTime / _MS_PER_HOUR);

    if (minutes < 0) {
        result = undefined;
    } else if (minutes <= 60) {
        result = minutes + "m";
    } else if (hours <= 24) {
        result = hours + "h";
    } else {
        let utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
        let utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
        result = Math.floor((utc2 - utc1) / _MS_PER_DAY) + "d";
    }

    return result;
}
