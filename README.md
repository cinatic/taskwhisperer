# [TaskWhisperer](https://extensions.gnome.org/extension/1039/taskwhisperer/)
[![Actions Status: Build & Create Package](https://github.com/cinatic/taskwhisperer/workflows/Build%20%26%20Create%20Package/badge.svg)](https://github.com/cinatic/taskwhisperer/actions?query=workflow%3A"Build+&+Create+Package")
[![Actions Status: Build Package & Create Release](https://github.com/cinatic/taskwhisperer/workflows/Build%20Package%20%26%20Create%20Release/badge.svg)](https://github.com/cinatic/taskwhisperer/actions?query=workflow%3A"Build+Package+&+Create+Release")

*gnome-shell-extension-taskwhisperer* is a simple extension for displaying pending tasks created by [TaskWarrior](https://taskwarrior.org/) in GNOME Shell.

<p align="middle">
    <img alt="projects" src="https://github.com/cinatic/taskwhisperer/raw/master/images/overview.png" width="350">
    <img alt="commits" src="https://github.com/cinatic/taskwhisperer/raw/master/images/edit_task.png" width="350">
</p>

----

## Installation

### Requirements

Gnome, Gnome-Shell, make also sure it has graphene [#99](https://github.com/cinatic/taskwhisperer/issues/99)
### Over extensions.gnome.org (EGO)

Install via install button -> https://extensions.gnome.org/extension/1039/taskwhisperer/

### Generic (Local installation)

Move files into your locale extension directory (~/.local/share/gnome-shell/extensions/taskwhisperer-extension@infinicode.de) and enable the extension via the Tweak Tool
Restart GNOME Shell (`Alt`+`F2`, `r`, `Enter`) and enable the extension through *gnome-tweak-tool*.

After the installation, restart GNOME Shell (`Alt`+`F2`, `r`, `Enter`) and enable the extension through *gnome-tweak-tool*.

Not Yet commited 
Go on the [TaskWhisperer](https://extensions.gnome.org/extension/1039/taskwhisperer/) extension page on extensions.gnome.org and click on the switch ("OFF" => "ON")!

### Requirements

The data is fetched from export function of TaskWarrior ([TaskWarrior Docs](https://taskwarrior.org/docs/)), make sure
it is [installed](https://taskwarrior.org/docs/start.html).

### Task Server Syncronization
If you like to use Taskwarrior on multiple devices and keep your tasks everywhere in sync then you can now enable the **Enable Task Sync** option in the Extension Settings.

[Here you can find how to setup the server: https://taskwarrior.org/docs/taskserver/setup.html](https://taskwarrior.org/docs/taskserver/setup.html)


## Troubleshooting
### GLib.SpawnError: Failed to execute child process “task” (No such file or directory)
You need to install [TaskWarrior](https://taskwarrior.org/download/) first

### JSON.parse: unexpected character at line 1 column 1 of the JSON data
On some distributions you need to specifiy a config path first before you can start using TaskWarrior. Please execute 'task' in a shell and follow the instructions. 

Here you can find useful things for the [Basic Usage](https://taskwarrior.org/docs/#start)
