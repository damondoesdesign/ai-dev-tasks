# PACK//LIST

Nested packing lists for **Mac** and **iPhone**. Black panel, white monospace type, pixel 3D bezels. Folders inside folders. Import from paste, a text file, or a screenshot.

This is the app that matches the nested-list / import / monochrome brief. The earlier SwiftUI iPhone prototype still lives in `/PackingList` if you want native iOS later.

## Run it

```bash
cd app
npm install
npm run dev
```

Open the printed URL (usually `http://localhost:5173`).

- **Mac:** use that URL in Safari or Chrome. Double-click a row for details. Drag `::` onto another row to nest.
- **iPhone:** same URL on your network, or Share → Add to Home Screen. Bottom dock: Lists / List / Info / Import. Long-press `::` to drag. Tap `i` for details. Tap `–` on a folder to open it.

Data stays in this browser (`localStorage`). No account.

## What it does

- Nested categories / items / sub-lists (drop *into* a row to make a folder)
- Check-off + progress (`14/32`)
- Color codes with a customizer (hex + presets). UI chrome stays monochrome; color is a stripe + chip
- Details pane: notes, quantity, packing style, duplicate, delete
- Import: paste, `.txt` / `.md`, screenshot OCR (on-device via Tesseract)
- Export text or JSON from `···`
- Undo / redo (`⌘Z` / `⌘⇧Z`)
- Search and “Open” (unpacked only)
- Demo lists: **Bali Dive** and **Weekend Escape**

Typography uses IBM Plex Mono at light / regular / italic / semibold / bold. A type customizer is intentionally deferred.

## Tests

```bash
npm test
npm run build
```
