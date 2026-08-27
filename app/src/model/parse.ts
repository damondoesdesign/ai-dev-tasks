export type ParsedNode = {
  title: string
  packed: boolean | null
  qty: number
  children: ParsedNode[]
}

type Row = {
  depth: number
  title: string
  packed: boolean | null
  qty: number
}

function indentOf(line: string): { indent: number; rest: string } {
  let i = 0
  let spaces = 0
  while (i < line.length) {
    const ch = line[i]
    if (ch === ' ') {
      spaces += 1
      i += 1
    } else if (ch === '\t') {
      spaces += 2
      i += 1
    } else {
      break
    }
  }
  return { indent: Math.floor(spaces / 2), rest: line.slice(i) }
}

function parseTitle(raw: string): { title: string; packed: boolean | null; qty: number } {
  let s = raw.trim()
  let packed: boolean | null = null

  const box = s.match(/^\[([ xX✓✔])\]\s*(.*)$/)
  if (box) {
    packed = box[1] !== ' '
    s = box[2]
  } else if (/^[☐□]\s+/.test(s)) {
    packed = false
    s = s.replace(/^[☐□]\s+/, '')
  } else if (/^[☑✓✔☒]\s+/.test(s)) {
    packed = true
    s = s.replace(/^[☑✓✔☒]\s+/, '')
  }

  let qty = 1
  const qtyMatch = s.match(/^(.*?)(?:\s+[x×](\d+)|\s+\((\d+)\))\s*$/i)
  if (qtyMatch && (qtyMatch[2] || qtyMatch[3])) {
    s = qtyMatch[1]
    qty = Number.parseInt(qtyMatch[2] || qtyMatch[3], 10)
  }

  return { title: s.replace(/\s+/g, ' ').trim(), packed, qty }
}

function looksLikeGarbage(title: string): boolean {
  if (!title) return true
  const letters = title.replace(/[^a-zA-Z0-9]/g, '')
  return letters.length === 0
}

function assemble(rows: Row[]): ParsedNode[] {
  const roots: ParsedNode[] = []
  const stack: { depth: number; node: ParsedNode }[] = []
  for (const row of rows) {
    const node: ParsedNode = {
      title: row.title,
      packed: row.packed,
      qty: row.qty,
      children: [],
    }
    while (stack.length && stack[stack.length - 1].depth >= row.depth) stack.pop()
    if (!stack.length) roots.push(node)
    else stack[stack.length - 1].node.children.push(node)
    stack.push({ depth: row.depth, node })
  }
  return roots
}

export function parseListText(text: string): ParsedNode[] {
  const rawLines = text.replace(/\r\n/g, '\n').replace(/^\uFEFF/, '').split('\n')
  const rows: Row[] = []
  let mdBase = -1

  for (const raw of rawLines) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    if (/^[-*=_]{3,}$/.test(trimmed)) continue

    const { indent, rest } = indentOf(raw)
    if (!rest) continue

    const header = rest.match(/^(#{1,6})\s+(.*)$/)
    if (header) {
      const depth = header[1].length - 1
      mdBase = depth
      const parsed = parseTitle(header[2])
      if (looksLikeGarbage(parsed.title)) continue
      rows.push({ depth, ...parsed })
      continue
    }

    const category = rest.match(/^([^:]{1,40}):$/)
    if (category && !/https?:/i.test(rest) && !/^\d/.test(category[1])) {
      const parsed = parseTitle(category[1])
      if (looksLikeGarbage(parsed.title)) continue
      let depth = indent
      if (indent === 0) {
        mdBase = -1
        depth = 0
      } else if (mdBase >= 0) {
        depth = indent + mdBase + 1
      }
      rows.push({ depth, ...parsed, packed: null })
      continue
    }

    let body = rest
    const bullet = body.match(/^(?:[-*+]\s+|\d+[.)]\s+)(.*)$/)
    if (bullet) body = bullet[1]

    const parsed = parseTitle(body)
    if (looksLikeGarbage(parsed.title)) continue

    const depth = indent + (mdBase >= 0 ? mdBase + 1 : 0)
    rows.push({ depth, ...parsed })
  }

  return assemble(rows)
}

export function parsedToPlain(nodes: ParsedNode[], depth = 0): string {
  return nodes
    .map((n) => {
      const pad = '  '.repeat(depth)
      const mark = n.packed === true ? '[x] ' : n.packed === false ? '[ ] ' : ''
      const qty = n.qty > 1 ? ` x${n.qty}` : ''
      const line = `${pad}${mark}${n.title}${qty}`
      const kids = n.children.length ? `\n${parsedToPlain(n.children, depth + 1)}` : ''
      return line + kids
    })
    .join('\n')
}
