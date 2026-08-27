export type PackingStyle =
  | 'roll'
  | 'fold'
  | 'hard_case'
  | 'liquid_bag'
  | 'electronics_pouch'
  | 'wear_on_plane'
  | 'loose'

export const PACKING_STYLES: { id: PackingStyle; label: string }[] = [
  { id: 'roll', label: 'Roll' },
  { id: 'fold', label: 'Fold' },
  { id: 'hard_case', label: 'Hard case' },
  { id: 'liquid_bag', label: 'Liquid bag' },
  { id: 'electronics_pouch', label: 'Electronics pouch' },
  { id: 'wear_on_plane', label: 'Wear on plane' },
  { id: 'loose', label: 'Loose' },
]

export type ColorTag = {
  id: string
  name: string
  hex: string
}

export type PackNode = {
  id: string
  title: string
  notes: string
  packed: boolean
  qty: number
  colorId: string | null
  style: PackingStyle | null
  collapsed: boolean
  children: PackNode[]
  createdAt: number
  updatedAt: number
}

export type PackList = {
  id: string
  title: string
  notes: string
  children: PackNode[]
  createdAt: number
  updatedAt: number
}

export type AppDoc = {
  version: 1
  lists: PackList[]
  tags: ColorTag[]
  activeListId: string | null
}

export type DropPos = 'before' | 'after' | 'inside'

export type NodeLoc = {
  node: PackNode
  parentId: string | null
  index: number
  depth: number
  path: string[]
}

export const PRESET_COLORS: { name: string; hex: string }[] = [
  { name: 'White', hex: '#f5f5f5' },
  { name: 'Silver', hex: '#c8c8c8' },
  { name: 'Gray', hex: '#888888' },
  { name: 'Signal red', hex: '#ff5a36' },
  { name: 'Amber', hex: '#ffb000' },
  { name: 'Yellow', hex: '#ffe600' },
  { name: 'Green', hex: '#3dff7a' },
  { name: 'Cyan', hex: '#3dc4ff' },
  { name: 'Violet', hex: '#7a5cff' },
  { name: 'Magenta', hex: '#ff4d9a' },
  { name: 'Mint', hex: '#7dffc3' },
  { name: 'Brown', hex: '#c48a5a' },
]
