const { GObject } = imports.gi
const Signals = imports.signals

var EventHandler = class EventHandler {}

Signals.addSignalMethods(EventHandler.prototype)
