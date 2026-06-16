# PackingList (iPhone)

Personal packing list app for iPhone (iOS 17+). Plan trips by choosing bags, build a reusable item library, and pack with color tags and packing styles.

## Features (v1)

- **Trips** — create from scratch or duplicate a previous trip
- **Predefined bags** — carry-on, checked, camera case, dive bag, and more
- **Item library** — reusable items with category, color tag, and packing style
- **Color tags** — user-defined groups (Dive, Photo, Clothes, etc.)
- **Packing styles** — roll, fold, hard case, liquid bag, and more
- **Drag and drop** — move items between bags; drag from library sheet onto bag sections
- **Offline-first** — SwiftData local storage, no account required
- **v2-ready** — repository layer and sync metadata reserved for future CloudKit sharing

## Open in Xcode

1. Open `PackingList/PackingList.xcodeproj` in Xcode 15+ on macOS
2. Select an iPhone simulator (iOS 17+)
3. Run the **PackingList** scheme

The app links the local Swift package `PackingListCore`.

## Project layout

```
PackingListCore/          Shared domain types, duplication logic, repository protocols
PackingList/
  PackingList/            SwiftUI app + SwiftData models
  PackingListTests/       iOS unit tests (run in Xcode)
  scripts/validate.sh     CI validation script
```

## Validate (Linux / CI)

```bash
chmod +x PackingList/scripts/validate.sh
./PackingList/scripts/validate.sh
```

Runs `PackingListCore` unit tests and verifies the Xcode project scaffold.

## v2 notes

`TripRecord` includes `ownerId` and `collaboratorIds`. `SyncRepository` in PackingListCore documents the CloudKit sharing extension point.
