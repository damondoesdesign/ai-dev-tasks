import { useStore } from '../state/store'
import { Bezel } from './Bezel'

export function ConfirmDialog() {
  const store = useStore()
  const confirm = store.ui.confirm
  if (!confirm) return null

  return (
    <div className="modal-back" onClick={() => store.confirm(null)}>
      <Bezel className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="pane-label" onClick={(e) => e.stopPropagation()}>
          <span>{confirm.title}</span>
        </div>
        <div className="modal-body" onClick={(e) => e.stopPropagation()}>
          <p className="hint" style={{ fontStyle: 'normal', color: 'var(--fg)' }}>
            {confirm.body}
          </p>
          <div className="chip-row">
            <button
              type="button"
              className="btn bezel-out heavy"
              onClick={() => {
                confirm.onConfirm()
                store.confirm(null)
              }}
            >
              {confirm.confirmLabel ?? 'OK'}
            </button>
            <button type="button" className="btn bezel-out" onClick={() => store.confirm(null)}>
              Cancel
            </button>
          </div>
        </div>
      </Bezel>
    </div>
  )
}
