import type { Group, Place, TripData } from './types'
import { defaultTrip } from './types'

/** A small starter set so the app isn't empty on first run. Coordinates are approximate. */
export function samplePlaces(): { places: Place[]; groups: Group[] } {
  const now = Date.now()
  const g1: Group = { id: 'g_mustdo', name: 'Must do', order: 0, createdAt: now }
  const g2: Group = { id: 'g_rain', name: 'Rainy day', order: 1, createdAt: now }
  const mk = (id: string, p: Omit<Place, 'id' | 'photos' | 'createdAt' | 'updatedAt' | 'groupIds'> & { groupIds?: string[] }): Place =>
    ({ id, photos: [], createdAt: now, updatedAt: now, groupIds: [], ...p })
  const places: Place[] = [
    mk('p_meiji', { name: 'Meiji Jingu', nameJa: '明治神宮', category: 'temple', lat: 35.6764, lng: 139.6993, address: '1-1 Yoyogikamizonocho, Shibuya', description: 'Forested Shinto shrine next to Yoyogi Park. Go early; the gravel approach under the cedars is the best part.', hours: ['Monday: Sunrise – Sunset', 'Tuesday: Sunrise – Sunset', 'Wednesday: Sunrise – Sunset', 'Thursday: Sunrise – Sunset', 'Friday: Sunrise – Sunset', 'Saturday: Sunrise – Sunset', 'Sunday: Sunrise – Sunset'], groupIds: [g1.id] }),
    mk('p_yoyogi', { name: 'Yoyogi Park', nameJa: '代々木公園', category: 'park', lat: 35.6717, lng: 139.6949, address: '2-1 Yoyogikamizonocho, Shibuya', description: 'Big open lawns, ginkgo avenue turns gold in late November.' }),
    mk('p_fuglen', { name: 'Fuglen Tokyo', category: 'coffee', lat: 35.6690, lng: 139.6905, address: '1-16-11 Tomigaya, Shibuya', description: 'Norwegian coffee bar in Tomigaya; cocktails after dark.', notes: 'Cash or card both fine. Cortado.', hours: ['Monday: 8:00 AM – 7:00 PM', 'Tuesday: 8:00 AM – 7:00 PM', 'Wednesday: 8:00 AM – 1:00 AM', 'Thursday: 8:00 AM – 1:00 AM', 'Friday: 8:00 AM – 2:00 AM', 'Saturday: 9:00 AM – 2:00 AM', 'Sunday: 9:00 AM – 12:00 AM'] }),
    mk('p_shibuya', { name: 'Shibuya Crossing', category: 'sight', lat: 35.6595, lng: 139.7004, address: 'Dogenzaka, Shibuya', description: 'Watch from Shibuya Sky or the Tsutaya Starbucks.', groupIds: [g1.id] }),
    mk('p_nezu', { name: 'Nezu Museum', nameJa: '根津美術館', category: 'museum', lat: 35.6622, lng: 139.7176, address: '6-5-1 Minamiaoyama, Minato', description: 'Kengo Kuma building, pre-modern East Asian art and a garden with a tea house.', hours: ['Monday: Closed', 'Tuesday: 10:00 AM – 5:00 PM', 'Wednesday: 10:00 AM – 5:00 PM', 'Thursday: 10:00 AM – 5:00 PM', 'Friday: 10:00 AM – 5:00 PM', 'Saturday: 10:00 AM – 5:00 PM', 'Sunday: 10:00 AM – 5:00 PM'], groupIds: [g2.id] }),
    mk('p_gyoen', { name: 'Shinjuku Gyoen', nameJa: '新宿御苑', category: 'park', lat: 35.6852, lng: 139.7100, address: '11 Naitomachi, Shinjuku', description: 'Three gardens in one: Japanese, French and English. ¥500.' }),
    mk('p_tsukiji', { name: 'Tsukiji Outer Market', nameJa: '築地場外市場', category: 'food', lat: 35.6654, lng: 139.7707, address: '4-16-2 Tsukiji, Chuo', description: 'Breakfast crawl: tamagoyaki, uni, strawberry daifuku.', notes: 'Go before 9. Most stalls shut by early afternoon.', groupIds: [g1.id] }),
    mk('p_teamlab', { name: 'teamLab Planets', category: 'museum', lat: 35.6492, lng: 139.7899, address: '6-1-16 Toyosu, Koto', description: 'Walk-through digital art, barefoot. Book a timed slot.', booked: true, groupIds: [g2.id] }),
    mk('p_senso', { name: 'Senso-ji', nameJa: '浅草寺', category: 'temple', lat: 35.7148, lng: 139.7967, address: '2-3-1 Asakusa, Taito', description: 'Tokyo’s oldest temple. Nakamise street leads up to it.', groupIds: [g1.id] }),
    mk('p_tnm', { name: 'Tokyo National Museum', nameJa: '東京国立博物館', category: 'museum', lat: 35.7188, lng: 139.7765, address: '13-9 Uenokoen, Taito', description: 'Samurai armour, swords and ukiyo-e in Ueno Park.', groupIds: [g2.id] }),
    mk('p_ginza6', { name: 'Ginza Six', category: 'shop', lat: 35.6699, lng: 139.7640, address: '6-10-1 Ginza, Chuo', description: 'Department store with Tsutaya Books on top and a rooftop garden.' }),
    mk('p_tsite', { name: 'Daikanyama T-Site', category: 'shop', lat: 35.6503, lng: 139.6997, address: '17-5 Sarugakucho, Shibuya', description: 'Tsutaya bookshop campus; magazines, vinyl, Anjin lounge upstairs.' }),
    mk('p_shimokita', { name: 'Shimokitazawa', category: 'shop', lat: 35.6614, lng: 139.6682, address: 'Kitazawa, Setagaya', description: 'Vintage shops, curry, small venues. Wander from the station.' }),
    mk('p_kiyosumi', { name: 'Kiyosumi Garden', nameJa: '清澄庭園', category: 'park', lat: 35.6798, lng: 139.7963, address: '3-3-9 Kiyosumi, Koto', description: 'Stroll garden with stepping stones across the pond.' }),
    mk('p_afuri', { name: 'Afuri Ebisu', category: 'food', lat: 35.6478, lng: 139.7115, address: '1-1-7 Ebisu, Shibuya', description: 'Yuzu shio ramen. Ticket machine at the door.' }),
    mk('p_tokyost', { name: 'Tokyo Station', nameJa: '東京駅', category: 'station', lat: 35.6812, lng: 139.7671, address: '1 Marunouchi, Chiyoda', description: 'Shinkansen hub; Character Street and ramen street underground.' }),
    mk('p_golden', { name: 'Golden Gai', category: 'bar', lat: 35.6938, lng: 139.7046, address: '1 Kabukicho, Shinjuku', description: 'Six alleys of tiny bars. Look for ones without a cover charge sign.' }),
  ]
  return { places, groups: [g1, g2] }
}

export function sampleData(): TripData {
  const { places, groups } = samplePlaces()
  const trip = defaultTrip()
  const mkItems = (ids: string[], times: (string | undefined)[] = []) => ids.map((placeId, i) => ({ id: `i_${placeId}_${i}`, placeId, time: times[i] }))
  return {
    trip,
    places: Object.fromEntries(places.map((p) => [p.id, p])),
    groups: Object.fromEntries(groups.map((g) => [g.id, g])),
    days: {
      d0: { id: 'd0', index: 0, title: 'Land, Shibuya', items: mkItems(['p_fuglen', 'p_meiji', 'p_yoyogi', 'p_shibuya'], ['10:00', '11:30', undefined, '17:00']) },
      d1: { id: 'd1', index: 1, title: 'East side', note: 'Early start for the market.', items: mkItems(['p_tsukiji', 'p_ginza6', 'p_kiyosumi', 'p_teamlab'], ['08:00', undefined, undefined, '16:00']) },
      d2: { id: 'd2', index: 2, title: 'Asakusa & Ueno', items: mkItems(['p_senso', 'p_tnm']) },
    },
  }
}
