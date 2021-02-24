const { GObject } = imports.gi
const Signals = imports.signals

const Handler = class {}

Signals.addSignalMethods(Handler.prototype)

var EventHandler = new Handler()
