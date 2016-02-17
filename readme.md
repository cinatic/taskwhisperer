![Screenshot](https://github.com/cinatic/taskwhisperer/raw/master/images/menu.png)

*gnome-shell-extension-taskwhisperer* is a simple extension for displaying pending tasks created by [TaskWarrior](https://taskwarrior.org/) in GNOME Shell.

The data is fetched from export function of TaskWarrior ([TaskWarrior Docs](https://taskwarrior.org/docs/))

----

## Installation

After the installation, restart GNOME Shell (`Alt`+`F2`, `r`, `Enter`) and enable the extension through *gnome-tweak-tool*.

Not Yet commited 
Go on the [TaskWhisperer](https://extensions.gnome.org/extension/1039/taskwhisperer/) extension page on extensions.gnome.org and click on the switch ("OFF" => "ON")!

### Generic (Local installation)

Move files into your locale (~/.locale/share/gnome-shell/extension) directory and enable the extension via the Tweak Tool

## Preparation

Make sure you have TaskWarrior installed

## Preview

### Task creation
![Screenshot](https://github.com/cinatic/taskwhisperer/raw/master/images/create.png)

### Task modification
![Screenshot](https://github.com/cinatic/taskwhisperer/raw/master/images/modify.png)

## Troubleshooting

### Wrong JSON Format
`(gnome-shell:1916): Gjs-WARNING **: JS ERROR: TypeError: taskListData.map is not a function`

Some TaskWarrior packages (e.g. in GnUbuntu) came without opt.in the json.array=on flag. So you have to add json.array=on in your [*~/.taskrc*](https://taskwarrior.org/docs/configuration.html)

## Licence

Copyright (C) 2016

* Florijan Hamzic <florijanh@gmail.com>,

This file is part of *gnome-shell-extension-taskwhisperer*.

*gnome-shell-extension-taskwhisperer* is free software: you can redistribute it and/or modify it under the terms of the **GNU General Public License as published by the Free Software Foundation, either version 3** of the License, or (at your option) any later version.

*gnome-shell-extension-taskwhisperer* is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with *gnome-shell-extension-taskwhisperer*.  If not, see <http://www.gnu.org/licenses/>.

