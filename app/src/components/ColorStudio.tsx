import { PRESET_COLORS } from '../model/types'
import { useStore } from '../state/store'
import { Bezel } from './Bezel'

export function ColorStudio() {
  const store = useStore()
  if (!store.ui.showColors) return null

  return (
    <div className="modal-back" onClick={() => store.toggleColors(false)}>
      <Bezel className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="pane-label" onClick={(e) => e.stopPropagation()}>
          <span>Color codes</span>
          <button type="button" className="btn bezel-out" onClick={() => store.toggleColors(false)}>
            Close
          </button>
        </div>
        <div className="modal-body" onClick={(e) => e.stopPropagation()}>
          <p className="hint">
            The chrome stays black and white. Color is a stripe + chip so you can scan Dive / Photo / Critical at a glance.
          </p>
          <div className="color-grid">
            {store.doc.tags.map((tag) => (
              <div key={tag.id} className="color-card bezel-out">
                <span className="swatch bezel-in" style={{ background: tag.hex }} />
                <div className="stack" style={{ gap: 4, padding: 0 }}>
                  <input
                    className="field bezel-in"
                    value={tag.name}
                    onChange={(e) => store.updateTag(tag.id, { name: e.target.value })}
                  />
                  <div className="chip-row">
                    <input
                      className="field bezel-in hex"
                      value={tag.hex}
                      onChange={(e) => store.updateTag(tag.id, { hex: e.target.value })}
                    />
                    <input
                      type="color"
                      value={tag.hex}
                      onChange={(e) => store.updateTag(tag.id, { hex: e.target.value })}
                      aria-label={`${tag.name} color`}
                    />
                    <button
                      type="button"
                      className="btn bezel-out"
                      onClick={() => store.deleteTag(tag.id)}
                    >
                      Del
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <span className="label">Presets</span>
          <div className="chip-row">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                className="chip bezel-out"
                onClick={() =>
                  store.addTag({
                    id: crypto.randomUUID(),
                    name: c.name,
                    hex: c.hex,
                  })
                }
              >
                <span className="dot" style={{ background: c.hex }} />
                {c.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn bezel-out heavy"
            onClick={() =>
              store.addTag({
                id: crypto.randomUUID(),
                name: 'New tag',
                hex: '#f5f5f5',
              })
            }
          >
            New color code
          </button>
        </div>
      </Bezel>
    </div>
  )
}
