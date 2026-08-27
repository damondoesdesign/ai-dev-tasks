import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { breadcrumb, flatten, isFullyPacked, progress, visibleTree, type FlatRow } from '../model/tree'
import type { DropPos, PackNode } from '../model/types'
import { useIsPhone } from '../hooks/useMedia'
import { useStore } from '../state/store'
import { Bezel } from './Bezel'

type DragLive = {
  id: string
  x: number
  y: number
  width: number
  title: string
  pos: DropPos | null
  targetId: string | null
  lineTop: number | null
}

function tagColor(tags: { id: string; hex: string }[], colorId: string | null): string | null {
  return tags.find((t) => t.id === colorId)?.hex ?? null
}

export function TreePane() {
  const store = useStore()
  const phone = useIsPhone()
  const scroller = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragLive | null>(null)
  const [draft, setDraft] = useState('')
  const dragRef = useRef<{
    id: string
    startX: number
    startY: number
    active: boolean
    longPress?: number
    width: number
    title: string
  } | null>(null)
  const dragLive = useRef<DragLive | null>(null)
  const rowsRef = useRef<FlatRow[]>([])
  const moveFn = useRef(store.move)
  const focusRef = useRef(store.ui.focusId)

  const source = store.ui.focusId ? store.viewNodes : store.tree
  const filtered = visibleTree(source, store.ui.query, store.ui.unpackedOnly)
  const rows = phone
    ? filtered.map((node, index) => ({
        id: node.id,
        node,
        depth: 0,
        parentId: store.ui.focusId,
        index,
        path: [] as string[],
      }))
    : flatten(filtered, { respectCollapsed: !store.ui.query && !store.ui.unpackedOnly })

  const crumbs = breadcrumb(store.tree, store.ui.focusId)
  const tags = store.doc.tags

  useEffect(() => {
    rowsRef.current = rows
    moveFn.current = store.move
    dragLive.current = drag
    focusRef.current = store.ui.focusId
  })

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const live = dragRef.current
      if (!live) return
      const dx = e.clientX - live.startX
      const dy = e.clientY - live.startY
      if (!live.active && Math.hypot(dx, dy) < 5) return
      live.active = true
      const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-node-id]')
      let pos: DropPos | null = null
      let targetId: string | null = null
      let lineTop: number | null = null
      if (hit && hit.dataset.nodeId && hit.dataset.nodeId !== live.id) {
        targetId = hit.dataset.nodeId
        const r = hit.getBoundingClientRect()
        const y = (e.clientY - r.top) / r.height
        const x = (e.clientX - r.left) / r.width
        if (x > 0.62 || (y > 0.28 && y < 0.72)) pos = 'inside'
        else if (y < 0.5) {
          pos = 'before'
          lineTop = r.top
        } else {
          pos = 'after'
          lineTop = r.bottom
        }
      } else if (scroller.current) {
        const r = scroller.current.getBoundingClientRect()
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          const last = rowsRef.current[rowsRef.current.length - 1]
          if (last) {
            targetId = last.id
            pos = 'after'
          } else if (focusRef.current) {
            targetId = focusRef.current
            pos = 'inside'
          }
        }
      }
      const next = {
        id: live.id,
        x: e.clientX,
        y: e.clientY,
        width: live.width,
        title: live.title,
        pos,
        targetId,
        lineTop,
      }
      dragLive.current = next
      setDrag(next)
    }
    const up = () => {
      const live = dragRef.current
      const snapshot = dragLive.current
      if (live?.active && snapshot?.targetId && snapshot.pos) {
        moveFn.current(live.id, snapshot.targetId, snapshot.pos)
      }
      if (live?.longPress) window.clearTimeout(live.longPress)
      dragRef.current = null
      dragLive.current = null
      setDrag(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [])

  const beginDrag = (e: ReactPointerEvent, node: PackNode, rowEl: HTMLElement) => {
    e.preventDefault()
    e.stopPropagation()
    const start = { x: e.clientX, y: e.clientY }
    dragRef.current = {
      id: node.id,
      startX: start.x,
      startY: start.y,
      active: !phone,
      width: rowEl.getBoundingClientRect().width,
      title: node.title,
    }
    if (phone) {
      dragRef.current.longPress = window.setTimeout(() => {
        if (dragRef.current && dragRef.current.id === node.id) {
          dragRef.current.active = true
          setDrag({
            id: node.id,
            x: start.x,
            y: start.y,
            width: dragRef.current.width,
            title: node.title,
            pos: null,
            targetId: null,
            lineTop: null,
          })
        }
      }, 280)
    }
  }

  const add = () => {
    const title = draft.trim() || 'New item'
    store.addNode(store.ui.selectedId && !phone ? store.ui.selectedId : store.ui.focusId, title)
    setDraft('')
  }

  return (
    <Bezel className="pane tree">
      <div className="pane-label">
        <span>{store.activeList?.title ?? 'List'}</span>
        <span>
          {store.stats.packed}/{store.stats.total}
        </span>
      </div>
      <div className="toolbar">
        <input
          className="field bezel-in search"
          placeholder="Search"
          value={store.ui.query}
          onChange={(e) => store.setQuery(e.target.value)}
          style={{ margin: 0, flex: 1, minWidth: 80 }}
        />
        <button
          type="button"
          className={`btn ${store.ui.unpackedOnly ? 'bezel-in pressed' : 'bezel-out'}`}
          onClick={() => store.setUnpackedOnly(!store.ui.unpackedOnly)}
        >
          Open
        </button>
        <button type="button" className="btn bezel-out desk-only" onClick={() => store.collapseAll(true)}>
          Fold
        </button>
      </div>
      {(crumbs.length > 0 || phone) && (
        <div className="crumbs">
          <button type="button" className={!store.ui.focusId ? 'here' : ''} onClick={() => store.setFocus(null)}>
            {store.activeList?.title ?? 'ROOT'}
          </button>
          {crumbs.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className={i === crumbs.length - 1 ? 'here' : ''}
              onClick={() => store.setFocus(c.id)}
            >
              / {c.title}
            </button>
          ))}
        </div>
      )}
      <div className="pane-body" ref={scroller}>
        {rows.length === 0 ? (
          <div className="empty">
            <strong>EMPTY FOLDER</strong>
            Type below to add an item, paste a list, or import a screenshot.
          </div>
        ) : (
          rows.map((row) => {
            const node = row.node
            const folder = node.children.length > 0
            const packed = folder ? isFullyPacked(node) : node.packed
            const p = folder ? progress([node]) : null
            const color = tagColor(tags, node.colorId)
            const style = store.doc.tags.find((t) => t.id === node.colorId)?.name
            return (
              <div
                key={node.id}
                data-node-id={node.id}
                className={[
                  'row bezel-out',
                  folder ? 'folder' : '',
                  packed ? 'packed' : '',
                  store.ui.selectedId === node.id ? 'selected' : '',
                  drag?.id === node.id ? 'ghosting' : '',
                  drag?.targetId === node.id && drag.pos === 'inside' ? 'drop-in' : '',
                ].join(' ')}
                style={{ marginLeft: phone ? 0 : row.depth * 16 }}
                onClick={() => store.select(node.id)}
                onDoubleClick={() => store.openInspector(node.id)}
              >
                <span className="stripe" style={{ background: color ?? '#3a3a3a' }} />
                <button
                  type="button"
                  className="twist"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (phone) {
                      if (folder) store.setFocus(node.id)
                      else store.openInspector(node.id)
                      return
                    }
                    if (folder) store.collapse(node.id, !node.collapsed)
                  }}
                  aria-label={folder ? 'Toggle folder' : 'Item'}
                >
                  {folder ? (phone || !node.collapsed ? '–' : '+') : '·'}
                </button>
                <button
                  type="button"
                  className="check"
                  onClick={(e) => {
                    e.stopPropagation()
                    store.togglePacked(node.id)
                  }}
                  aria-label={packed ? 'Packed' : 'Unpack'}
                >
                  <span className={`check-box ${packed ? 'on' : ''}`} />
                </button>
                <span className="title">
                  {node.title}
                  {node.qty > 1 ? `  ×${node.qty}` : ''}
                </span>
                <span className="meta">
                  {p ? (
                    <span>
                      {p.packed}/{p.total}
                    </span>
                  ) : null}
                  {node.style ? <span>{node.style.replaceAll('_', ' ')}</span> : null}
                  {style ? <span>{style}</span> : null}
                </span>
                <button
                  type="button"
                  className="info"
                  onClick={(e) => {
                    e.stopPropagation()
                    store.openInspector(node.id)
                  }}
                  aria-label="Details"
                >
                  i
                </button>
                <button
                  type="button"
                  className="grip"
                  aria-label="Drag"
                  onPointerDown={(e) => beginDrag(e, node, e.currentTarget.closest('[data-node-id]') as HTMLElement)}
                >
                  ::
                </button>
              </div>
            )
          })
        )}
      </div>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <input
          className="field bezel-in"
          placeholder={store.ui.selectedId && !phone ? 'Add inside selected…' : 'Add item…'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          style={{ margin: 0, flex: 1 }}
        />
        <button type="submit" className="btn bezel-out heavy">
          Add
        </button>
      </form>
      {drag ? (
        <div className="ghost row bezel-out" style={{ left: drag.x + 8, top: drag.y + 8, width: drag.width }}>
          <span className="stripe" />
          <span />
          <span />
          <span className="title">{drag.title}</span>
        </div>
      ) : null}
      {drag?.lineTop != null && drag.pos !== 'inside' ? (
        <div className="drop-line" style={{ position: 'fixed', top: drag.lineTop }} />
      ) : null}
    </Bezel>
  )
}
