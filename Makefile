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

FILES := $(SRC_DIR)/* README.md
COMPILED_SCHEMAS := $(SCHEMAS_DIR)/gschemas.compiled

PO_FILES := $(wildcard $(PO_DIR)/*.po)
MO_FILES := $(PO_FILES:$(PO_DIR)/%.po=$(LOCALE_DIR)/%/LC_MESSAGES/$(UUID).mo)
MO_DIR := $(PO_FILES:$(PO_DIR)/%.po=$(LOCALE_DIR)/%/LC_MESSAGES)

POT_FILE := $(PO_DIR)/$(UUID).pot
TOLOCALIZE := $(JS_FILES:$(SRC_DIR)/%.js=%.js) $(UI_FILES:$(SRC_DIR)/%.ui=%.ui)

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

$(PO_DIR)/%.po: $(POT_FILE) $(PO_DIR)
	msgmerge -m -U --backup=none $@ $<

$(LOCALE_DIR)/%/LC_MESSAGES/$(UUID).mo: $(PO_DIR)/%.po $(MO_DIR)
	msgfmt -c $< -o $@

$(POT_FILE): $(PO_DIR)
	cd $(SRC_DIR) && xgettext --from-code=UTF-8 --package-name "gnome-shell-extension-$(EXTENSION_NAME)" --msgid-bugs-address=$(AUTHOR_MAIL) -k_ -kN_ -o po/$(UUID).pot $(TOLOCALIZE) && cd -

build: $(BUILD_DIR) $(COMPILED_SCHEMAS) $(MO_FILES)
	cp -r $(FILES) $<

package: $(BUILD_DIR)
	cd $(BUILD_DIR) && zip -r $(EXTENSION_NAME).zip *

install: build
	rm -rf $(INSTALL_DIR)
	mkdir -p $(INSTALL_DIR)
	cp -r $(BUILD_DIR)/* $(INSTALL_DIR)

clean:
	rm -f $(COMPILED_SCHEMAS) $(POT_FILE)
	rm -rf $(LOCALE_DIR)

mrproper: clean
	rm -rf $(BUILD_DIR)
