import { seedDoc } from './sample'
import type { AppDoc } from './types'

export const STORAGE_KEY = 'packlist.doc.v1'

export function loadDoc(): AppDoc {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedDoc()
    const parsed = JSON.parse(raw) as AppDoc
    if (parsed?.version !== 1 || !Array.isArray(parsed.lists)) return seedDoc()
    return parsed
  } catch {
    return seedDoc()
  }
}

export function saveDoc(doc: AppDoc): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(doc))
}

export function exportPlain(doc: AppDoc): string {
  const list = doc.lists.find((l) => l.id === doc.activeListId) ?? doc.lists[0]
  if (!list) return ''
  const lines: string[] = [`# ${list.title}`, '']
  const walk = (nodes: typeof list.children, depth: number) => {
    for (const n of nodes) {
      const pad = '  '.repeat(depth)
      const mark = n.children.length ? '' : n.packed ? '[x] ' : '[ ] '
      const qty = n.qty > 1 ? ` x${n.qty}` : ''
      lines.push(`${pad}${mark}${n.title}${qty}`)
      walk(n.children, depth + 1)
    }
  }
  walk(list.children, 0)
  return lines.join('\n')
}
