import { createList, createNode } from './tree'
import type { AppDoc, ColorTag, PackNode } from './types'

function item(
  title: string,
  opts: {
    notes?: string
    packed?: boolean
    qty?: number
    colorId?: string | null
    style?: PackNode['style']
    children?: PackNode[]
  } = {},
): PackNode {
  return createNode(title, {
    notes: opts.notes ?? '',
    packed: opts.packed ?? false,
    qty: opts.qty ?? 1,
    colorId: opts.colorId ?? null,
    style: opts.style ?? null,
    children: opts.children ?? [],
  })
}

export const DEFAULT_TAGS: ColorTag[] = [
  { id: 'tag-dive', name: 'Dive', hex: '#3dc4ff' },
  { id: 'tag-photo', name: 'Photo', hex: '#ffb000' },
  { id: 'tag-clothes', name: 'Clothes', hex: '#c8c8c8' },
  { id: 'tag-critical', name: 'Critical', hex: '#ff5a36' },
]

export function seedDoc(): AppDoc {
  const bali = createList('Bali Dive', [
    item('Clothes', {
      colorId: 'tag-clothes',
      children: [
        item('Rash guard', { qty: 2, style: 'roll', colorId: 'tag-dive', notes: 'Boat days + extra for salt.' }),
        item('Board shorts', { qty: 2, style: 'roll' }),
        item('Warm layer', { style: 'fold', notes: 'Temple evenings get windy.' }),
        item('Underwear', { qty: 6, style: 'roll' }),
        item('Socks', { qty: 4, packed: true, style: 'roll' }),
      ],
    }),
    item('Dive', {
      colorId: 'tag-dive',
      children: [
        item('Regulator set', { style: 'hard_case', colorId: 'tag-critical', notes: '1st + 2nd stage, octo, SPG. Check DIN/yoke.' }),
        item('BCD', { style: 'loose' }),
        item('Mask + snorkel', { style: 'hard_case' }),
        item('Fins', { style: 'loose' }),
        item('3mm wetsuit', { style: 'fold' }),
        item('Dive computer', { style: 'electronics_pouch', colorId: 'tag-critical' }),
        item('SMB + spool', { children: [item('SMB'), item('Finger spool')] }),
      ],
    }),
    item('Camera', {
      colorId: 'tag-photo',
      children: [
        item('Body', { style: 'hard_case', colorId: 'tag-photo', notes: 'Dual batteries charged the night before.' }),
        item('16–35', { style: 'hard_case', colorId: 'tag-photo' }),
        item('Housing + ports', { style: 'hard_case', colorId: 'tag-dive' }),
        item('Strobe batteries', { qty: 8, style: 'electronics_pouch' }),
      ],
    }),
    item('Toiletries', {
      children: [
        item('Sunscreen SPF 50', { style: 'liquid_bag' }),
        item('Toothbrush'),
        item('Meds', { colorId: 'tag-critical', notes: 'Cipro, ibuprofen, ear drops.' }),
      ],
    }),
    item('Documents', {
      colorId: 'tag-critical',
      children: [
        item('Passport', { packed: true, colorId: 'tag-critical' }),
        item('DAN insurance card', { colorId: 'tag-dive' }),
        item('Nitrox card'),
      ],
    }),
  ])

  const weekend = createList('Weekend Escape', [
    item('Wear on plane', {
      children: [
        item('Jacket', { style: 'wear_on_plane' }),
        item('Headphones', { style: 'wear_on_plane' }),
      ],
    }),
    item('Clothes', {
      colorId: 'tag-clothes',
      children: [
        item('T-shirt', { qty: 2, style: 'roll' }),
        item('Jeans', { style: 'fold' }),
        item('Sweater', { style: 'fold' }),
      ],
    }),
    item('Electronics', {
      children: [
        item('Phone charger', { style: 'electronics_pouch' }),
        item('Watch cable', { style: 'electronics_pouch' }),
      ],
    }),
    item('Toiletries', {
      children: [item('Toothbrush'), item('Deodorant', { style: 'liquid_bag' })],
    }),
  ])

  return {
    version: 1,
    lists: [bali, weekend],
    tags: DEFAULT_TAGS,
    activeListId: bali.id,
  }
}

export const SAMPLE_IMPORT = `# Clothes
- [ ] Rash guard x2
- [ ] Board shorts
  - Belt
- [x] Socks x4

# Dive
- Regulator set
- BCD
- Mask + snorkel

Toiletries:
  Sunscreen SPF 50
  Toothbrush
`
