import type { DropPos, NodeLoc, PackList, PackNode, PackingStyle } from './types'

export function now(): number {
  return Date.now()
}

export function newId(): string {
  return crypto.randomUUID()
}

export function createNode(
  title: string,
  extras: Partial<Omit<PackNode, 'id' | 'title' | 'createdAt' | 'updatedAt'>> = {},
): PackNode {
  const t = now()
  return {
    id: newId(),
    title,
    notes: extras.notes ?? '',
    packed: extras.packed ?? false,
    qty: extras.qty ?? 1,
    colorId: extras.colorId ?? null,
    style: extras.style ?? null,
    collapsed: extras.collapsed ?? false,
    children: extras.children ?? [],
    createdAt: t,
    updatedAt: t,
  }
}

export function createList(title: string, children: PackNode[] = []): PackList {
  const t = now()
  return {
    id: newId(),
    title,
    notes: '',
    children,
    createdAt: t,
    updatedAt: t,
  }
}

export function cloneNode(node: PackNode): PackNode {
  const t = now()
  return {
    ...node,
    id: newId(),
    createdAt: t,
    updatedAt: t,
    children: node.children.map(cloneNode),
  }
}

export function touch(node: PackNode, patch: Partial<PackNode> = {}): PackNode {
  return { ...node, ...patch, updatedAt: now() }
}

export function findNode(nodes: PackNode[], id: string, parentId: string | null = null, depth = 0, path: string[] = []): NodeLoc | null {
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index]
    if (node.id === id) {
      return { node, parentId, index, depth, path }
    }
    const inner = findNode(node.children, id, node.id, depth + 1, [...path, node.id])
    if (inner) return inner
  }
  return null
}

export function findById(nodes: PackNode[], id: string): PackNode | null {
  return findNode(nodes, id)?.node ?? null
}

export function isDescendant(nodes: PackNode[], ancestorId: string, nodeId: string): boolean {
  const ancestor = findById(nodes, ancestorId)
  if (!ancestor) return false
  return findById(ancestor.children, nodeId) !== null
}

export function collectIds(nodes: PackNode[]): string[] {
  const ids: string[] = []
  const walk = (ns: PackNode[]) => {
    for (const n of ns) {
      ids.push(n.id)
      walk(n.children)
    }
  }
  walk(nodes)
  return ids
}

export function ancestorsOf(nodes: PackNode[], id: string): PackNode[] {
  const loc = findNode(nodes, id)
  if (!loc) return []
  return loc.path.map((pid) => findById(nodes, pid)).filter((n): n is PackNode => n !== null)
}

export function updateWhere(nodes: PackNode[], id: string, fn: (node: PackNode) => PackNode): PackNode[] {
  return nodes.map((n) => {
    if (n.id === id) return fn(n)
    const children = updateWhere(n.children, id, fn)
    if (children === n.children) return n
    return { ...n, children, updatedAt: now() }
  })
}

export function updateNode(nodes: PackNode[], id: string, patch: Partial<PackNode>): PackNode[] {
  return updateWhere(nodes, id, (n) => touch(n, patch))
}

export function extractNode(nodes: PackNode[], id: string): { next: PackNode[]; taken: PackNode | null } {
  let taken: PackNode | null = null
  const next: PackNode[] = []
  for (const n of nodes) {
    if (n.id === id) {
      taken = n
      continue
    }
    const inner = extractNode(n.children, id)
    if (inner.taken) taken = inner.taken
    next.push(inner.taken ? { ...n, children: inner.next, updatedAt: now() } : n)
  }
  return { next, taken }
}

export function insertAt(
  nodes: PackNode[],
  parentId: string | null,
  index: number,
  node: PackNode,
): PackNode[] {
  if (parentId === null) {
    const copy = [...nodes]
    const i = Math.max(0, Math.min(index, copy.length))
    copy.splice(i, 0, node)
    return copy
  }
  return nodes.map((n) => {
    if (n.id === parentId) {
      const children = [...n.children]
      const i = Math.max(0, Math.min(index, children.length))
      children.splice(i, 0, node)
      return touch(n, { children, collapsed: false })
    }
    const children = insertAt(n.children, parentId, index, node)
    return children === n.children ? n : touch(n, { children })
  })
}

export function moveNode(
  nodes: PackNode[],
  id: string,
  targetId: string | null,
  pos: DropPos,
): PackNode[] {
  if (id === targetId) return nodes
  if (targetId && isDescendant(nodes, id, targetId)) return nodes

  const source = findNode(nodes, id)
  if (!source) return nodes

  if (pos === 'inside') {
    if (!targetId) return nodes
    const { next, taken } = extractNode(nodes, id)
    if (!taken) return nodes
    return insertAt(next, targetId, Number.POSITIVE_INFINITY, taken)
  }

  const destParentId = targetId ? (findNode(nodes, targetId)?.parentId ?? null) : null
  const destLoc = targetId ? findNode(nodes, targetId) : null
  let destIndex = destLoc ? (pos === 'before' ? destLoc.index : destLoc.index + 1) : nodes.length

  if (source.parentId === destParentId && source.index < destIndex) destIndex -= 1

  const { next, taken } = extractNode(nodes, id)
  if (!taken) return nodes
  return insertAt(next, destParentId, destIndex, taken)
}

export function removeNode(nodes: PackNode[], id: string): PackNode[] {
  return extractNode(nodes, id).next
}

export function addChild(nodes: PackNode[], parentId: string | null, child: PackNode, index?: number): PackNode[] {
  return insertAt(nodes, parentId, index ?? Number.POSITIVE_INFINITY, child)
}

export function setPackedDeep(node: PackNode, packed: boolean): PackNode {
  return {
    ...node,
    packed,
    updatedAt: now(),
    children: node.children.map((c) => setPackedDeep(c, packed)),
  }
}

export function togglePacked(nodes: PackNode[], id: string): PackNode[] {
  return updateWhere(nodes, id, (n) => {
    const packed = n.children.length ? !isFullyPacked(n) : !n.packed
    return setPackedDeep(n, packed)
  })
}

export type Progress = { packed: number; total: number }

export function progress(nodes: PackNode[]): Progress {
  let packed = 0
  let total = 0
  const walk = (ns: PackNode[]) => {
    for (const n of ns) {
      if (n.children.length === 0) {
        total += Math.max(1, n.qty)
        if (n.packed) packed += Math.max(1, n.qty)
      } else {
        walk(n.children)
      }
    }
  }
  walk(nodes)
  return { packed, total }
}

export function isFullyPacked(node: PackNode): boolean {
  const p = progress([node])
  return p.total > 0 && p.packed === p.total
}

export type FlatRow = {
  id: string
  node: PackNode
  depth: number
  parentId: string | null
  index: number
  path: string[]
}

export function flatten(
  nodes: PackNode[],
  options: { respectCollapsed?: boolean; parentId?: string | null; depth?: number; path?: string[] } = {},
): FlatRow[] {
  const respectCollapsed = options.respectCollapsed ?? true
  const parentId = options.parentId ?? null
  const depth = options.depth ?? 0
  const path = options.path ?? []
  const out: FlatRow[] = []
  nodes.forEach((node, index) => {
    out.push({ id: node.id, node, depth, parentId, index, path })
    if (!respectCollapsed || !node.collapsed) {
      out.push(
        ...flatten(node.children, {
          respectCollapsed,
          parentId: node.id,
          depth: depth + 1,
          path: [...path, node.id],
        }),
      )
    }
  })
  return out
}

export function nodeMatches(node: PackNode, query: string): boolean {
  if (!query.trim()) return true
  const q = query.trim().toLowerCase()
  return node.title.toLowerCase().includes(q) || node.notes.toLowerCase().includes(q)
}

export function filterTree(
  nodes: PackNode[],
  pred: (node: PackNode) => boolean,
): PackNode[] {
  const out: PackNode[] = []
  for (const n of nodes) {
    const children = filterTree(n.children, pred)
    if (pred(n) || children.length) {
      out.push(children === n.children ? n : { ...n, children, collapsed: false })
    }
  }
  return out
}

export function visibleTree(
  nodes: PackNode[],
  query: string,
  unpackedOnly: boolean,
): PackNode[] {
  return filterTree(nodes, (n) => {
    if (unpackedOnly && n.children.length === 0 && n.packed) return false
    if (unpackedOnly && n.children.length > 0 && isFullyPacked(n)) return false
    return !query || nodeMatches(n, query)
  })
}

export function breadcrumb(nodes: PackNode[], focusId: string | null): { id: string; title: string }[] {
  if (!focusId) return []
  const loc = findNode(nodes, focusId)
  if (!loc) return []
  const crumbs: { id: string; title: string }[] = []
  for (const id of loc.path) {
    const n = findById(nodes, id)
    if (n) crumbs.push({ id: n.id, title: n.title })
  }
  crumbs.push({ id: loc.node.id, title: loc.node.title })
  return crumbs
}

export function focusedChildren(nodes: PackNode[], focusId: string | null): PackNode[] {
  if (!focusId) return nodes
  return findById(nodes, focusId)?.children ?? nodes
}

export function applyStyle(nodes: PackNode[], id: string, style: PackingStyle | null): PackNode[] {
  return updateNode(nodes, id, { style })
}

export function recountTitle(list: PackList): string {
  const p = progress(list.children)
  return `${list.title} ${p.packed}/${p.total}`
}
