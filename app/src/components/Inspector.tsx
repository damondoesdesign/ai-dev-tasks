import { PACKING_STYLES } from '../model/types'
import { useStore } from '../state/store'
import { Bezel } from './Bezel'

export function Inspector() {
  const store = useStore()
  const node = store.inspected
  const list = store.activeList

  if (!node) {
    return (
      <Bezel className="pane detail inspector">
        <div className="pane-label">
          <span>Details</span>
        </div>
        <div className="stack">
          <div className="empty">
            <strong>DOUBLE-CLICK AN ITEM</strong>
            Or tap the <span className="k">i</span> to open notes, quantity, color, and packing style.
          </div>
          {list ? (
            <>
              <span className="label">List notes</span>
              <textarea
                className="area bezel-in"
                value={list.notes}
                onChange={(e) => store.setListNotes(e.target.value)}
                placeholder="Trip notes…"
              />
            </>
          ) : null}
        </div>
      </Bezel>
    )
  }

  return (
    <Bezel className="pane detail inspector">
      <div className="pane-label">
        <span>Details</span>
        <button type="button" className="btn bezel-out mobile-only" onClick={() => store.openInspector(null)}>
          Close
        </button>
      </div>
      <div className="pane-body">
        <div className="stack">
          <span className="label">Title</span>
          <input
            className="field bezel-in"
            value={node.title}
            onChange={(e) => store.updateNode(node.id, { title: e.target.value })}
          />

          <span className="label">Notes</span>
          <textarea
            className="area bezel-in"
            value={node.notes}
            onChange={(e) => store.updateNode(node.id, { notes: e.target.value })}
            placeholder="Sizes, reminders, where it lives…"
          />

          <span className="label">Quantity</span>
          <div className="qty">
            <button
              type="button"
              className="btn bezel-out"
              onClick={() => store.updateNode(node.id, { qty: Math.max(1, node.qty - 1) })}
            >
              –
            </button>
            <span>{node.qty}</span>
            <button
              type="button"
              className="btn bezel-out"
              onClick={() => store.updateNode(node.id, { qty: node.qty + 1 })}
            >
              +
            </button>
          </div>

          <span className="label">Color code</span>
          <div className="chip-row">
            <button
              type="button"
              className={`chip bezel-out ${node.colorId == null ? 'active' : ''}`}
              onClick={() => store.updateNode(node.id, { colorId: null })}
            >
              None
            </button>
            {store.doc.tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={`chip bezel-out ${node.colorId === tag.id ? 'active' : ''}`}
                onClick={() => store.updateNode(node.id, { colorId: tag.id })}
              >
                <span className="dot" style={{ background: tag.hex }} />
                {tag.name}
              </button>
            ))}
            <button type="button" className="chip bezel-out" onClick={() => store.toggleColors(true)}>
              Edit palette
            </button>
          </div>

          <span className="label">Packing style</span>
          <div className="chip-row">
            <button
              type="button"
              className={`chip bezel-out ${node.style == null ? 'active' : ''}`}
              onClick={() => store.setStyle(node.id, null)}
            >
              None
            </button>
            {PACKING_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`chip bezel-out ${node.style === s.id ? 'active' : ''}`}
                onClick={() => store.setStyle(node.id, s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          <span className="label">Structure</span>
          <div className="chip-row">
            <button type="button" className="btn bezel-out" onClick={() => store.addNode(node.id, 'New item')}>
              Add inside
            </button>
            <button type="button" className="btn bezel-out" onClick={() => store.setFocus(node.id)}>
              Open folder
            </button>
            <button type="button" className="btn bezel-out" onClick={() => store.duplicateNode(node.id)}>
              Duplicate
            </button>
            <button
              type="button"
              className="btn bezel-out"
              onClick={() =>
                store.confirm({
                  title: 'Delete item',
                  body: `Remove “${node.title}” and everything inside it?`,
                  danger: true,
                  confirmLabel: 'Delete',
                  onConfirm: () => store.deleteNode(node.id),
                })
              }
            >
              Delete
            </button>
          </div>

          <p className="hint">
            Created {new Date(node.createdAt).toLocaleString()} · Edited {new Date(node.updatedAt).toLocaleString()}
          </p>
        </div>
      </div>
    </Bezel>
  )
}
