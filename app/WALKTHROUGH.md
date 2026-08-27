# Morning walkthrough — PACK//LIST

Ready for 7:30. This is the nested packing list you asked for: Mac + iPhone, folders-inside-folders, import from text/screenshot/paste, black/white monospace panel with pixel bezels.

## 1. Open it (2 minutes)

On your Mac:

```bash
cd app
npm install
npm run dev
```

Safari or Chrome → `http://localhost:5173`.

You should see **PACK//LIST** with two seeded lists: **Bali Dive** and **Weekend Escape**. Black background, white IBM Plex Mono, inset/outset one-line rows.

iPhone: join the same Wi-Fi, open the Mac’s LAN URL from the terminal (Vite prints it), then **Share → Add to Home Screen**. Use the bottom dock.

## 2. Nested folder structure

The data model is a tree. Anything can contain anything.

- Drag the `::` handle onto the **middle** of another row to drop *inside* (it becomes a folder).
- Drag to the top/bottom edge to reorder.
- Desktop indent shows the whole tree. iPhone is one folder at a time; tap `–` on a category to enter it, breadcrumbs to go up.

Try: drag **Socks** onto **Documents**, then undo with `⌘Z`.

## 3. Details

Double-click a row (or tap `i`). Right pane / Info tab: title, notes, quantity, color code, packing style (roll, fold, hard case, …), add-inside, open-folder, duplicate, delete.

This is the “double click into an item” view.

## 4. Import (the party trick)

Click **Import**.

- **Paste:** drop this in and hit Import as a new list:

```
Clothes
  Shirt x2
  Pants
    Belt
Dive
  Regulator
```

- **File:** `app/public/examples/bali-dive.txt`
- **Photo:** screenshot a handwritten or printed list. OCR runs in the browser (first run downloads language data; give it a few seconds).

You can also paste a multiline list anywhere outside a field — the import drawer opens prefilled. Paste an image the same way.

Land in: new list, current folder, or inside the selected item.

## 5. Color codes

**Colors** (desktop) or `···` isn’t required — open an item’s details and **Edit palette**. Rename, hex, system picker, presets. Rows get a left stripe. The chrome stays black/white on purpose.

## 6. Daily packing loop

1. Pick or duplicate a list (`···` → Duplicate list).
2. Check boxes as you pack. Category checks pack every child.
3. **Open** filter hides packed leaves.
4. Search filters the tree.
5. Export `.txt` or `.json` from `···` if you want a backup.

## Keyboard (Mac)

| Key | Action |
|-----|--------|
| `⌘Z` / `⌘⇧Z` | Undo / redo |
| Space | Toggle packed |
| Enter | Open details |
| `n` / `N` | New item / new child |
| Delete | Delete selected (asks first) |
| Escape | Close drawers |

## What we deferred (you asked for later)

- Global typography customizer (weights are already used in the UI: light meta, regular items, italic styles, semibold folders, bold titles)
- iCloud / multi-device sync
- Native Swift wrapper (the earlier iPhone SwiftData app is still in `/PackingList`)

## If it looks empty

`···` → **Load sample**. That replaces local data with the demo trips.
