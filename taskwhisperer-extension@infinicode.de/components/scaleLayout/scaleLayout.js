const { Clutter, GObject } = imports.gi

var ScaleLayout = GObject.registerClass({
      GTypeName: 'TaskWhisperer_ScaleLayout'
    }, class ScaleLayout extends Clutter.BinLayout {
      _init (params) {
        this._container = null
        super._init(params)
      }

      _connectContainer (container) {
        if (this._container == container) {
          return
        }

        if (this._container) {
          for (let id of this._signals)
            this._container.disconnect(id)
        }

        this._container = container
        this._signals = []

        if (this._container) {
          for (let signal of ['notify::scale-x', 'notify::scale-y']) {
            let id = this._container.connect(signal, () => {
              this.layout_changed()
            })
            this._signals.push(id)
          }
        }
      }

      vfunc_get_preferred_width (container, forHeight) {
        this._connectContainer(container)

        let [min, nat] = super.vfunc_get_preferred_width(container, forHeight)
        return [
          Math.floor(min * container.scale_x),
          Math.floor(nat * container.scale_x)]
      }

      vfunc_get_preferred_height (container, forWidth) {
        this._connectContainer(container)

        let [min, nat] = super.vfunc_get_preferred_height(container, forWidth)
        return [
          Math.floor(min * container.scale_y),
          Math.floor(nat * container.scale_y)]
      }
    }
)
