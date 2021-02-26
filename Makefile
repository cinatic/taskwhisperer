#!/usr/bin/make -f

# Copyright (C) 2020 Florijan Hamzic <fh[at]infinicode.de>
# This file is distributed under the same license as the stocks-extension package.

.PHONY: clean mrproper

EXTENSION_NAME := taskwhisperer-extension
UUID := $(EXTENSION_NAME)@infinicode.de
AUTHOR_MAIL := fh@infinicode.de

BUILD_DIR := _build

SRC_DIR := $(UUID)
SCHEMAS_DIR := $(SRC_DIR)/schemas
PO_DIR := $(SRC_DIR)/po
LOCALE_DIR := $(SRC_DIR)/locale

JS_FILES := $(wildcard $(SRC_DIR)/*.js)
UI_FILES := $(wildcard $(SRC_DIR)/*.ui)
ICON_FILES := $(SRC_DIR)/icons
CSS_FILES := $(wildcard $(SRC_DIR)/*.css)
JS_COMPONENTS := $(SRC_DIR)/components $(SRC_DIR)/helpers $(SRC_DIR)/services

FILES := $(SRC_DIR)/* README.md
COMPILED_SCHEMAS := $(SCHEMAS_DIR)/gschemas.compiled

POT_FILE := $(PO_DIR)/$(UUID).pot
PO_FILES := $(wildcard $(PO_DIR)/*.po)
MO_FILES := $(PO_FILES:$(PO_DIR)/%.po=$(LOCALE_DIR)/%/LC_MESSAGES/$(UUID).mo)
MO_DIR := $(PO_FILES:$(PO_DIR)/%.po=$(LOCALE_DIR)/%/LC_MESSAGES)

TOLOCALIZE := $(JS_FILES) $(UI_FILES) $(SRC_DIR)/helpers/translations.js

FILES :=  $(JS_FILES) $(ICON_FILES) $(JS_COMPONENTS) $(COMPILED_SCHEMAS) $(UI_FILES) $(CSS_FILES) $(SRC_DIR)/metadata.json README.md

ifeq ($(strip $(DESTDIR)),)
	INSTALLBASE := $(HOME)/.local
else
	INSTALLBASE := $(DESTDIR)/usr
endif

INSTALLBASE := $(INSTALLBASE)/share/gnome-shell/extensions
INSTALL_DIR := $(INSTALLBASE)/$(UUID)

default: build

$(BUILD_DIR):
	mkdir -p $@

$(COMPILED_SCHEMAS):
	glib-compile-schemas $(SCHEMAS_DIR)

$(LOCALE_DIR)/%/LC_MESSAGES:
	mkdir -p $@

$(PO_DIR):
	mkdir -p $@

$(POT_FILE): $(PO_DIR) $(MO_DIR)
	xgettext --from-code=UTF-8 --package-name "gnome-shell-extension-$(EXTENSION_NAME)" --msgid-bugs-address=$(AUTHOR_MAIL) -k_ -kN_ -o $(POT_FILE) $(TOLOCALIZE)

$(PO_FILES): $(POT_FILE) $(PO_DIR)
	msgmerge -m -U --backup=none $@ $<

$(MO_FILES): $(PO_FILES) $(MO_DIR)
	msgfmt -c $< -o $@

build: $(BUILD_DIR) $(COMPILED_SCHEMAS) $(MO_FILES)
	cp -r --parents $(FILES) $<

buildAndReplaceLocal: build
	rm -fR ~/.local/share/gnome-shell/extensions/$(UUID)
	cp -r $(BUILD_DIR)/${SRC_DIR} ~/.local/share/gnome-shell/extensions/$(UUID)/

package: $(BUILD_DIR)
	cd $(BUILD_DIR)/${SRC_DIR} && zip -r ../$(EXTENSION_NAME).zip *

install: build
	rm -rf $(INSTALL_DIR)
	mkdir -p $(INSTALL_DIR)
	cp -r $(BUILD_DIR)/* $(INSTALL_DIR)

clean:
	rm -f $(COMPILED_SCHEMAS) $(MO_FILES)

mrproper: clean
	rm -rf $(BUILD_DIR)
