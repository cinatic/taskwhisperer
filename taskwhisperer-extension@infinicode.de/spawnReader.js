const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

var SpawnReader = function () {};

SpawnReader.prototype.spawn = function(path, command, func, finishedFunc) {

    const [res, pid, stdin, stdout, stderr] = GLib.spawn_async_with_pipes(path, command, null, GLib.SpawnFlags.SEARCH_PATH, null);

    const stream = new Gio.DataInputStream({base_stream: new Gio.UnixInputStream({fd: stdout})});

    this.read(stream, func, finishedFunc);
};

SpawnReader.prototype.read = function (stream, func, finishedFunc) {

    stream.read_line_async(GLib.PRIORITY_LOW, null, (source, res) => {

        const [out, length] = source.read_line_finish(res);

        if (out !== null) {
            func(out);
            this.read(source, func, finishedFunc);
        } else {
            finishedFunc();
        }
    });
};
