import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import { parseListText } from '../model/parse'
import { seedDoc } from '../model/sample'
import { loadDoc, saveDoc } from '../model/storage'
import {
  addChild,
  cloneNode,
  createList,
  createNode,
  findById,
  findNode,
  focusedChildren,
  moveNode,
  progress,
  removeNode,
  togglePacked,
  updateNode,
} from '../model/tree'
import type { AppDoc, ColorTag, DropPos, PackList, PackNode, PackingStyle } from '../model/types'
import { parsedToNodes } from '../ocr/recognize'

export type ConfirmState = {
  title: string
  body: string
  danger?: boolean
  confirmLabel?: string
  onConfirm: () => void
} | null

export type UiState = {
  selectedId: string | null
  inspectorId: string | null
  focusId: string | null
  query: string
  unpackedOnly: boolean
  showImport: boolean
  showColors: boolean
  mobilePane: 'lists' | 'tree' | 'detail'
  confirm: ConfirmState
  importDraft: string
}

type State = {
  doc: AppDoc
  past: AppDoc[]
  future: AppDoc[]
  ui: UiState
}

type DocMutator = (doc: AppDoc) => AppDoc

const MAX_HISTORY = 60

const initialUi: UiState = {
  selectedId: null,
  inspectorId: null,
  focusId: null,
  query: '',
  unpackedOnly: false,
  showImport: false,
  showColors: false,
  mobilePane: 'tree',
  confirm: null,
  importDraft: '',
}

function cloneDoc(doc: AppDoc): AppDoc {
  return structuredClone(doc)
}

function withList(doc: AppDoc, listId: string | null, fn: (list: PackList) => PackList): AppDoc {
  const id = listId ?? doc.activeListId
  return {
    ...doc,
    lists: doc.lists.map((l) => {
      if (l.id !== id) return l
      return { ...fn(l), updatedAt: Date.now() }
    }),
  }
}

function reduceDoc(state: State, mut: DocMutator): State {
  const next = mut(cloneDoc(state.doc))
  return {
    ...state,
    doc: next,
    past: [...state.past, state.doc].slice(-MAX_HISTORY),
    future: [],
  }
}

type Action =
  | { type: 'hydrate'; doc: AppDoc }
  | { type: 'ui'; patch: Partial<UiState> }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'selectList'; id: string }
  | { type: 'newList'; title: string }
  | { type: 'renameList'; id: string; title: string }
  | { type: 'deleteList'; id: string }
  | { type: 'duplicateList'; id: string }
  | { type: 'setListNotes'; notes: string }
  | { type: 'addNode'; parentId: string | null; title: string }
  | { type: 'updateNode'; id: string; patch: Partial<PackNode> }
  | { type: 'togglePacked'; id: string }
  | { type: 'deleteNode'; id: string }
  | { type: 'duplicateNode'; id: string }
  | { type: 'move'; id: string; targetId: string | null; pos: DropPos }
  | { type: 'collapse'; id: string; collapsed: boolean }
  | { type: 'collapseAll'; collapsed: boolean }
  | { type: 'importNodes'; nodes: PackNode[]; mode: 'new' | 'root' | 'selected'; title?: string }
  | { type: 'addTag'; tag: ColorTag }
  | { type: 'updateTag'; id: string; patch: Partial<ColorTag> }
  | { type: 'deleteTag'; id: string }
  | { type: 'resetSample' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return { ...state, doc: action.doc }
    case 'ui':
      return { ...state, ui: { ...state.ui, ...action.patch } }
    case 'undo': {
      const prev = state.past[state.past.length - 1]
      if (!prev) return state
      return {
        ...state,
        doc: prev,
        past: state.past.slice(0, -1),
        future: [state.doc, ...state.future],
      }
    }
    case 'redo': {
      const nxt = state.future[0]
      if (!nxt) return state
      return {
        ...state,
        doc: nxt,
        past: [...state.past, state.doc],
        future: state.future.slice(1),
      }
    }
    case 'selectList':
      return {
        ...state,
        doc: { ...state.doc, activeListId: action.id },
        ui: { ...state.ui, selectedId: null, inspectorId: null, focusId: null, mobilePane: 'tree' },
      }
    case 'newList':
      return reduceDoc(state, (doc) => {
        const list = createList(action.title || 'Untitled')
        return { ...doc, lists: [list, ...doc.lists], activeListId: list.id }
      })
    case 'renameList':
      return reduceDoc(state, (doc) => ({
        ...doc,
        lists: doc.lists.map((l) => (l.id === action.id ? { ...l, title: action.title, updatedAt: Date.now() } : l)),
      }))
    case 'deleteList':
      return reduceDoc(state, (doc) => {
        const lists = doc.lists.filter((l) => l.id !== action.id)
        const activeListId = doc.activeListId === action.id ? (lists[0]?.id ?? null) : doc.activeListId
        return { ...doc, lists, activeListId }
      })
    case 'duplicateList':
      return reduceDoc(state, (doc) => {
        const src = doc.lists.find((l) => l.id === action.id)
        if (!src) return doc
        const copy: PackList = {
          ...src,
          id: crypto.randomUUID(),
          title: `Copy of ${src.title}`,
          children: src.children.map(cloneNode),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        return { ...doc, lists: [copy, ...doc.lists], activeListId: copy.id }
      })
    case 'setListNotes':
      return reduceDoc(state, (doc) => withList(doc, doc.activeListId, (l) => ({ ...l, notes: action.notes })))
    case 'addNode':
      return reduceDoc(state, (doc) =>
        withList(doc, doc.activeListId, (l) => ({
          ...l,
          children: addChild(l.children, action.parentId, createNode(action.title || 'Untitled')),
        })),
      )
    case 'updateNode':
      return reduceDoc(state, (doc) =>
        withList(doc, doc.activeListId, (l) => ({
          ...l,
          children: updateNode(l.children, action.id, action.patch),
        })),
      )
    case 'togglePacked':
      return reduceDoc(state, (doc) =>
        withList(doc, doc.activeListId, (l) => ({
          ...l,
          children: togglePacked(l.children, action.id),
        })),
      )
    case 'deleteNode': {
      const next = reduceDoc(state, (doc) =>
        withList(doc, doc.activeListId, (l) => ({
          ...l,
          children: removeNode(l.children, action.id),
        })),
      )
      const clear = (id: string | null) => (id === action.id ? null : id)
      return {
        ...next,
        ui: {
          ...next.ui,
          selectedId: clear(state.ui.selectedId),
          inspectorId: clear(state.ui.inspectorId),
          focusId: clear(state.ui.focusId),
        },
      }
    }
    case 'duplicateNode':
      return reduceDoc(state, (doc) =>
        withList(doc, doc.activeListId, (l) => {
          const loc = findNode(l.children, action.id)
          if (!loc) return l
          const copy = cloneNode(loc.node)
          copy.title = `${loc.node.title} copy`
          return { ...l, children: addChild(l.children, loc.parentId, copy, loc.index + 1) }
        }),
      )
    case 'move':
      return reduceDoc(state, (doc) =>
        withList(doc, doc.activeListId, (l) => ({
          ...l,
          children: moveNode(l.children, action.id, action.targetId, action.pos),
        })),
      )
    case 'collapse':
      return reduceDoc(state, (doc) =>
        withList(doc, doc.activeListId, (l) => ({
          ...l,
          children: updateNode(l.children, action.id, { collapsed: action.collapsed }),
        })),
      )
    case 'collapseAll':
      return reduceDoc(state, (doc) =>
        withList(doc, doc.activeListId, (l) => {
          const walk = (nodes: PackNode[]): PackNode[] =>
            nodes.map((n) => ({
              ...n,
              collapsed: n.children.length ? action.collapsed : n.collapsed,
              children: walk(n.children),
              updatedAt: Date.now(),
            }))
          return { ...l, children: walk(l.children) }
        }),
      )
    case 'importNodes':
      return reduceDoc(state, (doc) => {
        let nodes = action.nodes
        let title = action.title || 'Imported'
        if (action.mode === 'new' && !action.title && nodes.length === 1 && nodes[0].children.length) {
          title = nodes[0].title
          nodes = nodes[0].children
        }
        if (action.mode === 'new') {
          const list = createList(title, nodes)
          return { ...doc, lists: [list, ...doc.lists], activeListId: list.id }
        }
        return withList(doc, doc.activeListId, (l) => {
          const parentId = action.mode === 'selected' ? state.ui.selectedId : state.ui.focusId
          if (parentId) {
            let children = l.children
            for (const n of nodes) children = addChild(children, parentId, n)
            return { ...l, children }
          }
          return { ...l, children: [...l.children, ...nodes] }
        })
      })
    case 'addTag':
      return reduceDoc(state, (doc) => ({ ...doc, tags: [...doc.tags, action.tag] }))
    case 'updateTag':
      return reduceDoc(state, (doc) => ({
        ...doc,
        tags: doc.tags.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)),
      }))
    case 'deleteTag':
      return reduceDoc(state, (doc) => ({
        ...doc,
        tags: doc.tags.filter((t) => t.id !== action.id),
        lists: doc.lists.map((l) => ({
          ...l,
          children: stripTag(l.children, action.id),
        })),
      }))
    case 'resetSample':
      return reduceDoc(state, () => seedDoc())
    default:
      return state
  }
}

function stripTag(nodes: PackNode[], tagId: string): PackNode[] {
  return nodes.map((n) => ({
    ...n,
    colorId: n.colorId === tagId ? null : n.colorId,
    children: stripTag(n.children, tagId),
  }))
}

const StoreContext = createContext<ReturnType<typeof useStoreValue> | null>(null)

function useStoreValue() {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    doc: loadDoc(),
    past: [],
    future: [],
    ui: initialUi,
  }))

  useEffect(() => {
    saveDoc(state.doc)
  }, [state.doc])

  const activeList = state.doc.lists.find((l) => l.id === state.doc.activeListId) ?? state.doc.lists[0] ?? null
  const tree = activeList?.children ?? []
  const viewNodes = focusedChildren(tree, state.ui.focusId)
  const selected = state.ui.selectedId ? findById(tree, state.ui.selectedId) : null
  const inspected = state.ui.inspectorId ? findById(tree, state.ui.inspectorId) : selected
  const stats = progress(tree)

  const openInspector = useCallback((id: string | null) => {
    dispatch({
      type: 'ui',
      patch: {
        inspectorId: id,
        mobilePane: id ? 'detail' : 'tree',
        ...(id ? { selectedId: id } : {}),
      },
    })
  }, [])

  const api = useMemo(() => {
    return {
      doc: state.doc,
      ui: state.ui,
      activeList,
      tree,
      viewNodes,
      selected,
      inspected,
      stats,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      dispatch,
      select: (id: string | null) => dispatch({ type: 'ui', patch: { selectedId: id } }),
      openInspector,
      setQuery: (query: string) => dispatch({ type: 'ui', patch: { query } }),
      setUnpackedOnly: (unpackedOnly: boolean) => dispatch({ type: 'ui', patch: { unpackedOnly } }),
      setFocus: (focusId: string | null) => dispatch({ type: 'ui', patch: { focusId, selectedId: null } }),
      setPane: (mobilePane: UiState['mobilePane']) => dispatch({ type: 'ui', patch: { mobilePane } }),
      toggleImport: (showImport?: boolean, importDraft?: string) =>
        dispatch({
          type: 'ui',
          patch: {
            showImport: showImport ?? !state.ui.showImport,
            ...(importDraft != null ? { importDraft } : {}),
          },
        }),
      toggleColors: (showColors?: boolean) => dispatch({ type: 'ui', patch: { showColors: showColors ?? !state.ui.showColors } }),
      confirm: (confirm: ConfirmState) => dispatch({ type: 'ui', patch: { confirm } }),
      undo: () => dispatch({ type: 'undo' }),
      redo: () => dispatch({ type: 'redo' }),
      selectList: (id: string) => dispatch({ type: 'selectList', id }),
      newList: (title = 'Untitled list') => {
        dispatch({ type: 'newList', title })
        dispatch({ type: 'ui', patch: { mobilePane: 'tree', focusId: null, selectedId: null } })
      },
      renameList: (id: string, title: string) => dispatch({ type: 'renameList', id, title }),
      deleteList: (id: string) => dispatch({ type: 'deleteList', id }),
      duplicateList: (id: string) => dispatch({ type: 'duplicateList', id }),
      addNode: (parentId: string | null, title = 'New item') => dispatch({ type: 'addNode', parentId, title }),
      updateNode: (id: string, patch: Partial<PackNode>) => dispatch({ type: 'updateNode', id, patch }),
      setStyle: (id: string, style: PackingStyle | null) => dispatch({ type: 'updateNode', id, patch: { style } }),
      togglePacked: (id: string) => dispatch({ type: 'togglePacked', id }),
      deleteNode: (id: string) => dispatch({ type: 'deleteNode', id }),
      duplicateNode: (id: string) => dispatch({ type: 'duplicateNode', id }),
      move: (id: string, targetId: string | null, pos: DropPos) => dispatch({ type: 'move', id, targetId, pos }),
      collapse: (id: string, collapsed: boolean) => dispatch({ type: 'collapse', id, collapsed }),
      collapseAll: (collapsed: boolean) => dispatch({ type: 'collapseAll', collapsed }),
      importText: (text: string, mode: 'new' | 'root' | 'selected', title?: string) => {
        const nodes = parsedToNodes(parseListText(text))
        dispatch({ type: 'importNodes', nodes, mode, title })
        dispatch({ type: 'ui', patch: { showImport: false, mobilePane: 'tree' } })
      },
      importNodes: (nodes: PackNode[], mode: 'new' | 'root' | 'selected', title?: string) => {
        dispatch({ type: 'importNodes', nodes, mode, title })
        dispatch({ type: 'ui', patch: { showImport: false, mobilePane: 'tree' } })
      },
      addTag: (tag: ColorTag) => dispatch({ type: 'addTag', tag }),
      updateTag: (id: string, patch: Partial<ColorTag>) => dispatch({ type: 'updateTag', id, patch }),
      deleteTag: (id: string) => dispatch({ type: 'deleteTag', id }),
      resetSample: () => dispatch({ type: 'resetSample' }),
      setListNotes: (notes: string) => dispatch({ type: 'setListNotes', notes }),
    }
  }, [state, activeList, tree, viewNodes, selected, inspected, stats, openInspector])

  return api
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue()
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('StoreProvider missing')
  return ctx
}
