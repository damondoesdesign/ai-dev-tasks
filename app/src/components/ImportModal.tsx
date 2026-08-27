import { useEffect, useState, type DragEvent } from 'react'
import { parsedToPlain, parseListText } from '../model/parse'
import { SAMPLE_IMPORT } from '../model/sample'
import { isImageFile, ocrImage, parsedToNodes } from '../ocr/recognize'
import { useStore } from '../state/store'
import { Bezel } from './Bezel'

type Tab = 'paste' | 'file' | 'photo'
type Dest = 'new' | 'root' | 'selected'

export function ImportModal() {
  const store = useStore()
  const [tab, setTab] = useState<Tab>('paste')
  const [text, setText] = useState(store.ui.importDraft)
  const [dest, setDest] = useState<Dest>('new')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [hot, setHot] = useState(false)

  useEffect(() => {
    if (!store.ui.showImport) return
    if (store.ui.importDraft) setText(store.ui.importDraft)
    setError(null)
  }, [store.ui.showImport, store.ui.importDraft])

  if (!store.ui.showImport) return null

  const preview = text.trim() ? parseListText(text) : []

  const runImport = () => {
    if (!text.trim() || preview.length === 0) {
      setError('Nothing to import yet.')
      return
    }
    store.importNodes(parsedToNodes(preview), dest, title.trim() || undefined)
  }

  const ingestFile = async (file: File) => {
    setError(null)
    setBusy(true)
    setProgress(0)
    try {
      if (isImageFile(file)) {
        setTab('photo')
        const raw = await ocrImage(file, setProgress)
        setText(raw)
      } else {
        setTab('file')
        setText(await file.text())
        setTitle(file.name.replace(/\.[^.]+$/, ''))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that file.')
    } finally {
      setBusy(false)
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setHot(false)
    const file = e.dataTransfer.files[0]
    if (file) void ingestFile(file)
    const pasted = e.dataTransfer.getData('text/plain')
    if (!file && pasted) setText(pasted)
  }

  return (
    <div className="modal-back" onClick={() => store.toggleImport(false)}>
      <Bezel className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="pane-label" onClick={(e) => e.stopPropagation()}>
          <span>Import</span>
          <button type="button" className="btn bezel-out" onClick={() => store.toggleImport(false)}>
            Close
          </button>
        </div>
        <div
          className="modal-body"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="tabs">
            {(['paste', 'file', 'photo'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`btn ${tab === t ? 'bezel-in pressed' : 'bezel-out'}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'paste' ? (
            <textarea
              className="area bezel-in"
              style={{ minHeight: 160 }}
              placeholder={'Clothes\n  Shirt x2\n  Pants\nDive\n  Regulator'}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          ) : (
            <label
              className={`file-drop bezel-in ${hot ? 'hot' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setHot(true)
              }}
              onDragLeave={() => setHot(false)}
              onDrop={onDrop}
            >
              {tab === 'photo'
                ? 'Drop a screenshot, or tap to take / choose a photo. OCR runs on this device.'
                : 'Drop a .txt / .md file, or tap to browse.'}
              <input
                type="file"
                accept={tab === 'photo' ? 'image/*' : '.txt,.md,.text,text/plain'}
                capture={tab === 'photo' ? 'environment' : undefined}
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void ingestFile(file)
                }}
              />
            </label>
          )}

          {busy ? (
            <div className="progress-bar bezel-in">
              <i style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          ) : null}

          {error ? <p className="hint">{error}</p> : null}

          <span className="label">Preview</span>
          <pre className="preview bezel-in">{preview.length ? parsedToPlain(preview) : '—'}</pre>

          <span className="label">Land in</span>
          <div className="chip-row">
            <button type="button" className={`chip bezel-out ${dest === 'new' ? 'active' : ''}`} onClick={() => setDest('new')}>
              New list
            </button>
            <button type="button" className={`chip bezel-out ${dest === 'root' ? 'active' : ''}`} onClick={() => setDest('root')}>
              Current folder
            </button>
            <button
              type="button"
              className={`chip bezel-out ${dest === 'selected' ? 'active' : ''}`}
              onClick={() => setDest('selected')}
              disabled={!store.ui.selectedId}
            >
              Inside selected
            </button>
          </div>

          {dest === 'new' ? (
            <input
              className="field bezel-in"
              placeholder="List title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          ) : null}

          <div className="chip-row">
            <button type="button" className="btn bezel-out heavy" onClick={runImport} disabled={busy}>
              Import
            </button>
            <button type="button" className="btn bezel-out" onClick={() => setText(SAMPLE_IMPORT)}>
              Sample text
            </button>
          </div>
        </div>
      </Bezel>
    </div>
  )
}
