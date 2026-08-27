import { describe, expect, it } from 'vitest'
import { parseListText, parsedToPlain } from './parse'

describe('parseListText', () => {
  it('parses indented lists into nested folders', () => {
    const tree = parseListText(`Clothes
  Shirt
  Pants
    Belt
Dive
  Regulator`)
    expect(tree.map((n) => n.title)).toEqual(['Clothes', 'Dive'])
    expect(tree[0].children.map((n) => n.title)).toEqual(['Shirt', 'Pants'])
    expect(tree[0].children[1].children.map((n) => n.title)).toEqual(['Belt'])
    expect(tree[1].children[0].title).toBe('Regulator')
  })

  it('parses markdown headers, bullets, checkboxes, and quantities', () => {
    const tree = parseListText(`# Clothes
- [ ] Rash guard x2
- [x] Socks (4)
  - Ankle

Toiletries:
  Sunscreen`)
    expect(tree[0].title).toBe('Clothes')
    expect(tree[0].children[0]).toMatchObject({ title: 'Rash guard', packed: false, qty: 2 })
    expect(tree[0].children[1]).toMatchObject({ title: 'Socks', packed: true, qty: 4 })
    expect(tree[0].children[1].children[0].title).toBe('Ankle')
    expect(tree[1].title).toBe('Toiletries')
    expect(tree[1].children[0].title).toBe('Sunscreen')
  })

  it('round-trips a simple tree through plain text', () => {
    const text = `[ ] Shirt
[x] Passport`
    const tree = parseListText(text)
    expect(parsedToPlain(tree)).toBe(text)
  })

  it('skips decorative rules and empty lines', () => {
    const tree = parseListText(`Clothes
---
  Shirt

  Pants`)
    expect(tree).toHaveLength(1)
    expect(tree[0].children.map((n) => n.title)).toEqual(['Shirt', 'Pants'])
  })
})
