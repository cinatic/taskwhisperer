import GLib from 'gi://GLib'
import Gio from 'gi://Gio'

import { clearTimeout, setTimeout } from '../helpers/components.js'
import { tryJsonParse } from '../helpers/data.js'

// partially copied from https://wiki.gnome.org/AndyHolmes/Sandbox/SpawningProcesses
export const run = async ({ command, asJson = true, input = null, timeout = 10 }) => {
  try {
    const [ok, argv] = GLib.shell_parse_argv(command)

    // We'll assume we want output, or that returning none is not a problem
    let flags = Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE

    // If we aren't given any input, we don't need to open stdin
    if (input !== null) {
      flags |= Gio.SubprocessFlags.STDIN_PIPE
    }

    const proc = new Gio.Subprocess({
      argv,
      flags
    })

    const cancellable = new Gio.Cancellable()

    // Classes that implement GInitable must be initialized before use, but
    // an alternative in GJS is to just use Gio.Subprocess.new(argv, flags)
    proc.init(cancellable)

    const cancelTimeOutId = setTimeout(() => cancellable.cancel(), timeout * 1000)

    const result = await new Promise((resolve, reject) => {
      proc.communicate_utf8_async(input, cancellable, (proc, res) => {
        try {
          let [ok, stdout, stderr] = proc.communicate_utf8_finish(res)

          if (asJson) {
            stdout = tryJsonParse(stdout)
          }

          const returnCode = proc.get_exit_status()

          if (returnCode !== 0) {
            resolve({ error: stderr || stdout })
          }

          clearTimeout(cancelTimeOutId)
          resolve({ output: stdout })
        } catch (e) {
          logError(e)
          reject(e)
        }
      })
    })

    return result
  } catch (e) {
    logError(e)
    return { error: e.toString() }
  }
}
