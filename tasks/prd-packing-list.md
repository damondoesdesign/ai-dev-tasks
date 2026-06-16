# PRD: Packing List (iPhone)

## 1. Introduction / Overview

A personal iPhone app for planning and executing trip packing. The user maintains a reusable **item library**, creates **trips**, selects which **bags (containers)** they are bringing, then assigns library items into those bags with optional **packing styles** and **user-defined color tags** (e.g., Dive, Photo, Clothes).

The app solves the problem of ad-hoc packing lists that don’t reflect real-world constraints: multiple bags, mixed gear types (clothes, toiletries, camera, dive), and how items are physically packed (roll, fold, hard case, liquid bag, etc.).

**v1** is iPhone-only, offline-first, and single-user. **v2** will add shared trips with collaborators; v1 must use data models and a repository layer that make that adoption straightforward without a rewrite.

---

## 2. Goals

1. Let the user define which bags they are bringing on a trip before adding items.
2. Provide a persistent item library organized by category, with user-defined color tags and optional packing styles.
3. Support drag-and-drop (and tap-to-add fallback) to move items from the library into trip bags, reorder within bags, and move between bags.
4. Track packing progress with check-off per item.
5. Allow starting a trip from scratch or duplicating a previous trip (bags, items, tags, and styles).
6. Structure persistence and services so v2 shared lists can be added by extending storage/sync, not replacing core logic.

---

## 3. User Stories

| ID | Story |
|----|-------|
| US-1 | As a traveler, I want to create a new trip and pick which bags I’m bringing so my packing plan matches what I actually carry. |
| US-2 | As a traveler, I want to duplicate a previous trip so I don’t rebuild the same dive/camera setup every time. |
| US-3 | As a traveler, I want a library of reusable items (clothes, toiletries, camera, dive, etc.) so I don’t retype common gear. |
| US-4 | As a traveler, I want to tag items with colors and names like “Dive”, “Photo”, or “Clothes” so I can visually group related gear across categories. |
| US-5 | As a traveler, I want to assign a packing style (roll, fold, hard case, etc.) to items so I know how to pack them inside a bag. |
| US-6 | As a traveler, I want to drag items from the library into a bag (or tap to add) so packing assignment feels fast on iPhone. |
| US-7 | As a traveler, I want to reorder items within a bag and move items between bags so my packing order matches how I load luggage. |
| US-8 | As a traveler, I want to check off items as I pack and see progress (e.g., 12/18) so I know what’s left. |
| US-9 | As a traveler, I want all data saved locally without an account so the app works offline on v1. |
| US-10 | As a future user (v2), I want the same trip structure to support sharing with another person without losing my existing trips. |

---

## 4. Functional Requirements

### 4.1 Platform & scope

1. The app must target **iPhone only** (no iPad-optimized layout required in v1).
2. The app must support **iOS 17+** (SwiftUI + SwiftData).
3. The app must work **fully offline** in v1 with no login required.

### 4.2 Trips

4. The system must allow the user to **create a trip** with at minimum a name; optional fields: start date, end date, notes.
5. When creating a trip, the user must choose one of:
   - **Start from scratch** — empty trip, then select bags.
   - **Duplicate previous trip** — copy bags, packed items, tag assignments, and packing styles from an existing trip. The new trip must get a new UUID and default name (e.g., “Copy of Bali Dive Trip”), editable by the user.
6. Duplication must **not** modify the source trip.
7. The system must list all trips, sorted by most recently modified (default).
8. The user must be able to rename and delete a trip (with confirmation for delete).

### 4.3 Bags (predefined containers)

9. The system must provide a **fixed set of predefined bag types** for v1:

   | Bag type | Description |
   |----------|-------------|
   | Carry-on | Main cabin luggage |
   | Personal item | Under-seat / small backpack |
   | Checked bag | Checked luggage |
   | Camera case | Rigid or dedicated camera bag |
   | Dive bag | Dive equipment bag |
   | Day pack | Day trips / excursions |
   | Toiletry kit | Dopp kit / liquids-focused pouch |

10. For each trip, the user must **select which bags apply** (multi-select from the predefined list).
11. The user must be able to **reorder bags** within a trip (display order only).
12. Each bag on a trip may optionally have a **user nickname** (e.g., “Pelican 1510” for Camera case); the underlying bag type remains predefined.
13. **Phase 1 UX:** Trip creation flow emphasizes bag selection before item assignment. Item assignment may be disabled or empty until at least one bag is selected.

### 4.4 Item library

14. The system must maintain a **global item library** independent of any single trip.
15. Each library item must have:
    - Name (required)
    - Category (required): user-selectable; suggested defaults include Clothes, Toiletries, Camera, Dive, Documents, Electronics, Misc — user may add custom category names in v1.
    - Optional **default bag type** (one of predefined bags)
    - Optional **default packing style** (see 4.6)
    - Optional **color tag** (see 4.5)
    - Optional notes
16. The user must be able to **create, edit, and delete** library items.
17. The library must support **search** by name and **filter** by category and color tag.
18. Deleting a library item must **not** remove it from existing trips’ packed copies; packed items are snapshots (see 4.7).

### 4.5 Color tags (user-defined)

19. The user must be able to create **color tags** with:
    - User-defined **name** (e.g., Dive, Photo, Clothes, Critical)
    - **Color** chosen from a predefined palette (minimum 10 distinct colors; no custom hex in v1)
20. Color tags must be assignable to **library items** and **packed items on a trip**.
21. Tags must be **reusable** across items and trips.
22. The user must be able to edit tag name/color and delete tags; deleting a tag removes the association from items but does not delete items.
23. Trip and library list UIs must show a **visible color indicator** (dot, stripe, or chip) for tagged items.
24. The user must be able to **filter** packed items and library items by color tag.

### 4.6 Packing styles

25. The system must support **packing styles** as optional labels on library items and packed trip items.
26. v1 must include a **fixed list** of packing styles:

   | Style | Typical use |
   |-------|-------------|
   | Roll | Rolled clothing |
   | Fold | Folded clothing |
   | Hard case | Rigid protection (camera, dive regs) |
   | Liquid bag | TSA / liquids pouch |
   | Electronics pouch | Cables, batteries, small electronics |
   | Wear on plane | Worn, not packed in bag |
   | Loose | No special method |

27. The user must be able to assign or change packing style per packed item on a trip (overrides library default).
28. Packing style must display in trip bag item rows (compact label or icon + text).

### 4.7 Packing items onto a trip

29. From a trip view, the user must **add items from the library** to a selected bag by:
    - **Tap to add:** pick item(s) from library sheet → assign to bag (and optionally set style/tag before confirm).
    - **Drag and drop:** long-press library item → drop on bag section (primary interaction on iPhone after tap-to-add is implemented).
30. Adding an item creates a **PackedItem** record linked to the trip and bag, copying name, category, tag, and style from the library at add time (snapshot).
31. The same library item may be added **multiple times** to a trip (e.g., two t-shirts) — each instance is a separate PackedItem.
32. The user must be able to **reorder** PackedItems within a bag.
33. The user must be able to **move** a PackedItem to another bag on the same trip (drag or context action).
34. The user must be able to **remove** a PackedItem from a trip without deleting the library item.
35. The user must be able to **edit** a PackedItem on the trip (name, tag, style, notes) without changing the library original.

### 4.8 Check-off & progress

36. Each PackedItem must have an **isPacked** boolean toggled by tap.
37. Each bag must show packed count (e.g., `3/5`).
38. The trip must show overall progress (e.g., `12/18 packed`).
39. The user must be able to filter a trip view to **show unpacked items only**.

### 4.9 Navigation & screens (v1)

40. Minimum screen set:
    - **Trips list** — create, duplicate, open, delete trips
    - **Trip detail** — bags as sections, items within each bag, progress, add-from-library entry point
    - **Library** — browse/search/filter, CRUD items
    - **Settings / manage** — color tags CRUD, categories (if custom), about
41. Primary navigation: tab bar or equivalent with **Trips** and **Library**; tag management accessible from Library or Settings.

### 4.10 Data & v2-ready architecture

42. All entities must use **stable UUID** primary identifiers.
43. All sync-relevant entities must include **createdAt**, **updatedAt**, and **version** (integer, increment on update).
44. Trip model must include nullable **ownerId** and **collaboratorIds** (empty in v1) for future sharing.
45. Business logic must go through **repository protocols** (e.g., `TripRepository`, `LibraryRepository`, `TagRepository`) with a v1 **LocalStore** implementation (SwiftData).
46. v1 must not implement cloud sync, auth, or real-time collaboration; a **SyncRepository** or CloudKit adapter is a v2 non-goal for implementation but the protocol boundary must exist as a stub or documented extension point.
47. Recommended v2 path: **CloudKit** sharing for Apple-only collaboration; document this in code comments or architecture note, not implemented in v1.

---

## 5. Non-Goals (Out of Scope for v1)

- iPad layout or multi-column split view
- User accounts, sign-in, or backend API
- Real-time shared editing with other users (v2)
- iCloud sync (optional v1.1; not required for v1 launch)
- Push notifications or reminders
- Weight/volume limits, airline rules, or AI suggestions
- Custom hex colors for tags
- Custom bag types (only predefined list + nickname)
- Photo attachments per item
- Widgets and Apple Watch
- Android or web clients

---

## 6. Design Considerations

### Information hierarchy

```
Trip
 └── Bag (predefined type + optional nickname)
      └── PackedItem (snapshot from library)
           ├── Color tag (optional)
           ├── Packing style (optional)
           └── isPacked
```

### iPhone UX

- **Trip detail:** vertically stacked, collapsible bag sections (disclosure groups).
- **Add items:** floating or toolbar button opens **library sheet** with search/filter; long-press enables drag to bag headers.
- **Drag-and-drop:** implement after tap-to-add; use long-press lift + drop targets on bag sections.
- **Color tags:** small colored chip with tag name on list rows; filter control in toolbar.
- **Duplicate trip:** offered on create flow and via swipe/context on trips list.

### Empty states

- New trip with bags but no items: prompt “Add from Library”.
- Empty library: prompt to create first item with example categories.

### Accessibility

- Color tags must not rely on color alone — always show tag **name** text adjacent to color indicator.
- Support Dynamic Type and VoiceOver labels for drag targets and check-off.

---

## 7. Technical Considerations

### Stack

- **Language:** Swift
- **UI:** SwiftUI
- **Persistence:** SwiftData (iOS 17+)
- **Architecture:** MVVM or similar; views → view models → repositories → SwiftData

### Core models (conceptual)

| Model | Key fields |
|-------|------------|
| `Trip` | id, name, dates?, notes?, ownerId?, collaboratorIds[], createdAt, updatedAt, version |
| `TripBag` | id, tripId, bagType (enum), nickname?, sortOrder |
| `LibraryItem` | id, name, category, defaultBagType?, defaultPackingStyle?, colorTagId?, notes?, timestamps |
| `PackedItem` | id, tripId, tripBagId, libraryItemId?, name, category, colorTagId?, packingStyle?, isPacked, sortOrder, notes?, timestamps |
| `ColorTag` | id, name, colorIndex (palette), timestamps |
| `PackingStyle` | enum (fixed list) |
| `BagType` | enum (predefined list) |

### Repository layer (v1)

```text
protocol TripRepository {
  func fetchTrips() async throws -> [Trip]
  func createTrip(name: String, bags: [BagType]) async throws -> Trip
  func duplicateTrip(from sourceId: UUID, newName: String) async throws -> Trip
  func deleteTrip(id: UUID) async throws
  // ... packed item operations
}

protocol LibraryRepository { ... }
protocol TagRepository { ... }
```

v1: single `LocalSwiftDataStore` conforming to all protocols.  
v2: add `CloudKitSyncStore` decorator or parallel implementation without changing ViewModels.

### Duplication behavior

When duplicating a trip, deep-copy:

- All `TripBag` rows (new IDs, same types/order/nicknames)
- All `PackedItem` rows (new IDs, mapped to new bag IDs, preserve tag/style/packed state — default **unpacked** for duplicate is acceptable; **prefer copying isPacked as false** for a fresh packing run)

### Build phasing (implementation order)

1. Project scaffold, models, SwiftData schema, repositories (local only)
2. Trips list + create from scratch + bag picker
3. Color tags CRUD
4. Item library CRUD + categories + filters
5. Trip detail: add items (tap), reorder, move, remove, check-off
6. Trip duplication
7. Drag-and-drop polish
8. UI polish, empty states, accessibility pass

---

## 8. Success Metrics

Qualitative for a personal v1:

1. User can create a trip, select bags, and pack from library in under 5 minutes for a familiar trip (after library is seeded).
2. Duplicating a previous trip produces an accurate copy of bags and items without manual re-entry.
3. Drag-and-drop and tap-to-add both work on a physical iPhone (iOS 17+).
4. No data loss after app restart (persistence verified).
5. Code review confirms repository boundaries allow adding CloudKit sync without rewriting ViewModels.

---

## 9. Open Questions

| # | Question | Default if unresolved |
|---|----------|------------------------|
| 1 | On duplicate trip, should **isPacked** reset to false for all items? | **Yes** — treat duplicate as a new packing run |
| 2 | Should deleting a trip be soft-delete (recoverable) or permanent? | **Permanent** with confirmation alert in v1 |
| 3 | Maximum number of color tags or library items? | No hard limit in v1; optimize if performance issues arise |
| 4 | Allow inline **quick-add** item on trip without saving to library? | **No** in v1 — all items come from library (keeps library as source of truth) |
| 5 | App name / branding | TBD |

---

## Appendix: Example user flow

1. Open app → **Trips** → **New Trip** → name “Bali Dive”
2. Select bags: Carry-on, Dive bag, Camera case
3. **Library** tab → add items: rash guard (Clothes, tag “Dive”, roll), regulator (Dive, tag “Dive”, hard case), camera body (Camera, tag “Photo”, hard case)
4. Return to trip → **Add from Library** → assign items to bags
5. Reorder within Dive bag; set liquid bag style on sunscreen in toiletry kit
6. Pack trip: check off items; filter unpacked
7. Next year: **Duplicate** “Bali Dive” → rename → adjust items
