import { describe, expect, it } from 'vitest'
import {
  addChild,
  createNode,
  findNode,
  isDescendant,
  isFullyPacked,
  moveNode,
  progress,
  removeNode,
  togglePacked,
  visibleTree,
} from './tree'

function folder(title: string, children: ReturnType<typeof createNode>[]) {
  return createNode(title, { children })
}

describe('tree', () => {
  it('nests an item inside another (folder drop)', () => {
    const a = createNode('Clothes')
    const b = createNode('Shirt')
    const moved = moveNode([a, b], b.id, a.id, 'inside')
    expect(moved).toHaveLength(1)
    expect(moved[0].children[0].title).toBe('Shirt')
  })

  it('reorders siblings before/after', () => {
    const a = createNode('A')
    const b = createNode('B')
    const c = createNode('C')
    const after = moveNode([a, b, c], c.id, a.id, 'after')
    expect(after.map((n) => n.title)).toEqual(['A', 'C', 'B'])
    const before = moveNode(after, b.id, a.id, 'before')
    expect(before.map((n) => n.title)).toEqual(['B', 'A', 'C'])
  })

  it('refuses to drop a folder into its own descendant', () => {
    const shirt = createNode('Shirt')
    const clothes = folder('Clothes', [shirt])
    const root = [clothes]
    const next = moveNode(root, clothes.id, shirt.id, 'inside')
    expect(next).toBe(root)
    expect(isDescendant(root, clothes.id, shirt.id)).toBe(true)
  })

  it('toggles a folder as a deep packed/unpacked action', () => {
    const tree = [
      folder('Dive', [createNode('Mask'), createNode('Fins')]),
    ]
    const packed = togglePacked(tree, tree[0].id)
    expect(isFullyPacked(packed[0])).toBe(true)
    expect(packed[0].children.every((c) => c.packed)).toBe(true)
    const unpacked = togglePacked(packed, packed[0].id)
    expect(unpacked[0].children.every((c) => c.packed)).toBe(false)
  })

  it('counts only leaves toward progress, including qty', () => {
    const tree = [
      folder('Clothes', [createNode('Shirt', { qty: 2 }), createNode('Pants', { packed: true })]),
    ]
    expect(progress(tree)).toEqual({ packed: 1, total: 3 })
  })

  it('adds, locates, and removes nodes', () => {
    const root = createNode('Trip')
    const child = createNode('Item')
    const tree = addChild([root], root.id, child)
    expect(findNode(tree, child.id)?.parentId).toBe(root.id)
    expect(removeNode(tree, child.id)[0].children).toHaveLength(0)
  })

  it('filters unpacked leaves while keeping ancestor folders', () => {
    const packed = createNode('Socks', { packed: true })
    const open = createNode('Shirt')
    const tree = [folder('Clothes', [packed, open])]
    const visible = visibleTree(tree, '', true)
    expect(visible[0].children.map((n) => n.title)).toEqual(['Shirt'])
  })
})
