import { useEffect, useState } from 'react'
import { exportPlain } from '../model/storage'
import { ocrImage } from '../ocr/recognize'
import { useIsPhone } from '../hooks/useMedia'
import { useStore } from '../state/store'
import { ColorStudio } from './ColorStudio'
import { ConfirmDialog } from './ConfirmDialog'
import { ImportModal } from './ImportModal'
import { Inspector } from './Inspector'
import { ListRail } from './ListRail'
import { TreePane } from './TreePane'

export function Shell() {
  const store = useStore()
  const phone = useIsPhone()
  const [menu, setMenu] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) store.redo()
        else store.undo()
        return
      }
      if (meta && e.key.toLowerCase() === 'v' && !typing) {
        return
      }
      if (typing) return
      if (e.key === 'n' && !e.shiftKey) {
        store.addNode(store.ui.focusId, 'New item')
      }
      if (e.key === 'N') {
        store.addNode(store.ui.selectedId ?? store.ui.focusId, 'New item')
      }
      if (e.key === ' ' && store.ui.selectedId) {
        e.preventDefault()
        store.togglePacked(store.ui.selectedId)
      }
      if ((e.key === 'Backspace' || e.key === 'Delete') && store.ui.selectedId) {
        const id = store.ui.selectedId
        store.confirm({
          title: 'Delete item',
          body: 'Remove the selected item and its nested contents?',
          danger: true,
          confirmLabel: 'Delete',
          onConfirm: () => store.deleteNode(id),
        })
      }
      if (e.key === 'Enter' && store.ui.selectedId) {
        store.openInspector(store.ui.selectedId)
      }
      if (e.key === 'Escape') {
        store.toggleImport(false)
        store.toggleColors(false)
        store.confirm(null)
        if (phone) store.setPane('tree')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [store, phone])

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const file = [...(e.clipboardData?.files ?? [])][0]
      const text = e.clipboardData?.getData('text/plain') ?? ''
      if (file && file.type.startsWith('image/')) {
        e.preventDefault()
        store.toggleImport(true, 'Reading screenshot…')
        void ocrImage(file)
          .then((read) => store.toggleImport(true, read.trim() || 'Could not read text from that image.'))
          .catch(() => store.toggleImport(true, 'Could not read text from that image.'))
        return
      }
      if (text.includes('\n') || /^\s*(?:[-*+]|\d+[.)]|#|\[)/.test(text)) {
        e.preventDefault()
        store.toggleImport(true, text)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [store])

  const download = (filename: string, body: string, mime: string) => {
    const blob = new Blob([body], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    setMenu(false)
  }

  const paneClass =
    phone && store.ui.mobilePane === 'lists'
      ? 'pane-lists'
      : phone && store.ui.mobilePane === 'detail'
        ? 'pane-detail'
        : ''

  return (
    <div className={`crt ${paneClass}`}>
      <header className="titlebar">
        <div className="mark bezel-out">
          <strong>PACK//LIST</strong>
          <em>mono v1</em>
        </div>
        <div />
        <div className="title-actions">
          <button type="button" className="btn bezel-out" onClick={() => store.toggleImport(true)}>
            Import
          </button>
          <button
            type="button"
            className="btn bezel-out desk-only"
            onClick={() => store.addNode(store.ui.selectedId ?? store.ui.focusId, 'New item')}
          >
            + Item
          </button>
          <button type="button" className="btn bezel-out desk-only" onClick={() => store.toggleColors(true)}>
            Colors
          </button>
          <div className="menu">
            <button type="button" className="btn bezel-out" onClick={() => setMenu((v) => !v)}>
              ···
            </button>
            {menu ? (
              <div className="menu-pop bezel-out">
                <button
                  type="button"
                  onClick={() =>
                    download(`${store.activeList?.title ?? 'list'}.txt`, exportPlain(store.doc), 'text/plain')
                  }
                >
                  Export text
                </button>
                <button
                  type="button"
                  onClick={() =>
                    download(`${store.activeList?.title ?? 'packlist'}.json`, JSON.stringify(store.doc, null, 2), 'application/json')
                  }
                >
                  Export json
                </button>
                <button type="button" onClick={() => { store.undo(); setMenu(false) }}>
                  Undo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (store.activeList) store.duplicateList(store.activeList.id)
                    setMenu(false)
                  }}
                >
                  Duplicate list
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!store.activeList) return
                    const id = store.activeList.id
                    store.confirm({
                      title: 'Delete list',
                      body: `Delete “${store.activeList.title}”? This cannot be undone from here.`,
                      danger: true,
                      confirmLabel: 'Delete',
                      onConfirm: () => store.deleteList(id),
                    })
                    setMenu(false)
                  }}
                >
                  Delete list
                </button>
                <button
                  type="button"
                  onClick={() => {
                    store.confirm({
                      title: 'Load sample',
                      body: 'Replace local data with the Bali Dive / Weekend Escape demo lists?',
                      confirmLabel: 'Load',
                      onConfirm: () => store.resetSample(),
                    })
                    setMenu(false)
                  }}
                >
                  Load sample
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="panes">
        <ListRail />
        <TreePane />
        <Inspector />
      </div>

      <footer className="statusbar">
        <span>
          <b>
            {store.stats.packed}/{store.stats.total}
          </b>{' '}
          packed · local · {store.canUndo ? 'undo ready' : 'clean'}
        </span>
        <span>IBM Plex Mono · light / regular / italic / bold / heavy</span>
      </footer>

      <nav className="dock">
        <button
          type="button"
          className={`btn ${store.ui.mobilePane === 'lists' ? 'bezel-in pressed' : 'bezel-out'}`}
          onClick={() => store.setPane('lists')}
        >
          Lists
        </button>
        <button
          type="button"
          className={`btn ${store.ui.mobilePane === 'tree' ? 'bezel-in pressed' : 'bezel-out'}`}
          onClick={() => store.setPane('tree')}
        >
          List
        </button>
        <button
          type="button"
          className={`btn ${store.ui.mobilePane === 'detail' ? 'bezel-in pressed' : 'bezel-out'}`}
          onClick={() => store.setPane('detail')}
        >
          Info
        </button>
        <button type="button" className="btn bezel-out" onClick={() => store.toggleImport(true)}>
          Import
        </button>
      </nav>

      <ImportModal />
      <ColorStudio />
      <ConfirmDialog />
    </div>
  )
}
