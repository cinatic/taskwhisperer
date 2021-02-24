const { GObject, St } = imports.gi

const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()
const { TaskOverviewScreen } = Me.imports.components.screens.taskOverviewScreen.taskOverviewScreen
const { EditTaskScreen } = Me.imports.components.screens.editTaskScreen.editTaskScreen
const { EventHandler } = Me.imports.helpers.eventHandler

var ScreenWrapper = GObject.registerClass({
      GTypeName: 'TaskWhisperer_ScreenWrapper'
    },
    class ScreenWrapper extends St.Widget {
      _init () {
        super._init({
          style_class: 'screen-wrapper'
        })

        this._showScreenConnectId = EventHandler.connect('show-screen', (sender, { screen, additionalData }) => this.showScreen(screen, additionalData))

        this.connect('destroy', this._onDestroy.bind(this))

        this.showScreen()
      }

      showScreen (screenName, additionalData) {
        let screen
        additionalData = additionalData || {}

        switch (screenName) {
          case 'edit-task':
            screen = new EditTaskScreen(additionalData.item)
            break

          case 'overview':
          default:
            screen = new TaskOverviewScreen()
            break
        }

        this.destroy_all_children()
        this.add_actor(screen)
      }

      _onDestroy () {
        if (this._showScreenConnectId) {
          EventHandler.disconnect(this._showScreenConnectId)
        }
      }
    }
)
