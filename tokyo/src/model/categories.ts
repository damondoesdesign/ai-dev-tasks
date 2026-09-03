import type { CategoryId } from './types'

export interface CategoryDef {
  id: CategoryId
  label: string
  /** Single-glyph mark used on the map and in lists. */
  mark: string
  /** Google place types that map onto this category, first match wins. */
  types: string[]
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'food', label: 'Food', mark: 'F', types: ['restaurant', 'meal_takeaway', 'bakery', 'ramen_restaurant', 'sushi_restaurant', 'japanese_restaurant', 'food', 'meal_delivery', 'fast_food_restaurant', 'dessert_shop', 'ice_cream_shop'] },
  { id: 'coffee', label: 'Coffee', mark: 'C', types: ['cafe', 'coffee_shop', 'tea_house'] },
  { id: 'bar', label: 'Bars', mark: 'B', types: ['bar', 'night_club', 'pub', 'wine_bar', 'izakaya'] },
  { id: 'shop', label: 'Shops', mark: 'S', types: ['store', 'shopping_mall', 'clothing_store', 'book_store', 'department_store', 'market', 'home_goods_store', 'gift_shop', 'electronics_store', 'shoe_store', 'jewelry_store', 'convenience_store', 'grocery_store', 'supermarket'] },
  { id: 'park', label: 'Parks', mark: 'P', types: ['park', 'garden', 'national_park', 'botanical_garden', 'hiking_area', 'beach', 'zoo'] },
  { id: 'museum', label: 'Museums', mark: 'M', types: ['museum', 'art_gallery', 'aquarium', 'planetarium', 'cultural_center', 'performing_arts_theater'] },
  { id: 'temple', label: 'Shrines', mark: 'T', types: ['shinto_shrine', 'buddhist_temple', 'place_of_worship', 'hindu_temple', 'church'] },
  { id: 'sight', label: 'Sights', mark: 'V', types: ['tourist_attraction', 'observation_deck', 'landmark', 'historical_landmark', 'monument', 'amusement_park', 'stadium', 'historical_place'] },
  { id: 'hotel', label: 'Stay', mark: 'H', types: ['lodging', 'hotel', 'hostel', 'ryokan', 'guest_house', 'bed_and_breakfast'] },
  { id: 'station', label: 'Transit', mark: 'R', types: ['train_station', 'subway_station', 'transit_station', 'airport', 'bus_station'] },
  { id: 'other', label: 'Other', mark: 'O', types: [] },
]

export const CATEGORY_MAP: Record<CategoryId, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, CategoryDef>

export function categoryFromTypes(types: string[] | undefined, primary?: string): CategoryId {
  const all = [primary, ...(types ?? [])].filter(Boolean) as string[]
  for (const t of all) {
    for (const c of CATEGORIES) if (c.types.includes(t)) return c.id
  }
  return 'other'
}
