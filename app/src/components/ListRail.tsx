import { progress } from '../model/tree'
import { useStore } from '../state/store'
import { Bezel } from './Bezel'

export function ListRail() {
  const store = useStore()

  return (
    <Bezel className="pane rail">
      <div className="pane-label">
        <span>Lists</span>
        <button type="button" className="btn bezel-out" onClick={() => store.newList('Untitled list')}>
          +
        </button>
      </div>
      <div className="pane-body">
        {store.doc.lists.length === 0 ? (
          <div className="empty">
            <strong>NO LISTS</strong>
            Create one or import a text file.
          </div>
        ) : (
          store.doc.lists.map((list) => {
            const p = progress(list.children)
            const active = list.id === store.activeList?.id
            return (
              <button
                key={list.id}
                type="button"
                className={`list-btn ${active ? 'bezel-in active' : 'bezel-out'}`}
                onClick={() => store.selectList(list.id)}
                onDoubleClick={() => {
                  const next = window.prompt('Rename list', list.title)
                  if (next && next.trim()) store.renameList(list.id, next.trim())
                }}
              >
                <span className="stripe" />
                <span className="name">{list.title}</span>
                <span className="frac">
                  {p.packed}/{p.total}
                </span>
              </button>
            )
          })
        )}
      </div>
    </Bezel>
  )
}
