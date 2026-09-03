# Tokyo

A private, offline-first trip map and day-by-day itinerary for a small group. Built for iPhones (add to Home Screen), works in any browser.

- **Map**: a minimal, near-monochrome vector map of Greater Tokyo with your places as pins. Filter by category (Food, Coffee, Bars, Shops, Parks, Museums, Shrines, Sights, Stay, Transit), by your own groups ("Must do", "Rainy day"), or by day.
- **Places**: search Google for a restaurant, shop or park by name (or paste a Google Maps link) and the app pulls in photos, hours, address, phone, website and a short description. Add your own notes.
- **Days**: a 14-day plan. Drag to reorder stops, move stops between days, set times and notes. Each day can be shown on the map as a numbered route.
- **Directions**: one button. Walking if you're within about 1.4 km, otherwise Tokyo's train network, opened in Google Maps.
- **Roles**: editors change things; viewers see everything and get directions. Password-protected.
- **Offline**: the app shell, all trip data and place photos are stored on the phone. The map itself can be downloaded once for fully offline use.
- **Light / dark**: toggle per person, remembered on their profile.

The project lives in `tokyo/` and is independent of the rest of this repository.

---

## How it's built (and why)

| Need | Choice | Why |
|---|---|---|
| Place data (photos, hours, address, description) | **Google Places API (New)** | This is the sanctioned way to get what you'd otherwise "scrape" from Google. Scraping Google Maps is against its terms and breaks constantly. Menus are not exposed by the API; the place's website link is one tap away. |
| Base map | **MapLibre GL + Protomaps vector tiles** | Google's map tiles cannot be cached for offline use. Protomaps tiles come as a single `.pmtiles` file, which the app downloads to the phone once. It also gives us a truly minimal, custom-styled map. |
| Directions | **Google Maps deep links** | Google Maps' Tokyo transit routing is the best there is, and the app opens straight into it with the right mode chosen. |
| Shared data + accounts | **Firebase Auth + Firestore** | Real-time sync between the editor and viewers, built-in offline persistence on iOS, and a free tier that a five-person trip will never leave. |
| App | **React + Vite PWA** | Installable from Safari, updates itself, no App Store. |

Without any keys configured the app runs in **local mode**: single device, data in the browser. That's how the screenshots and tests run.

---

## Setup (about 30 minutes)

You need: a Google account, Node 20+, and the Firebase CLI (`npm i -g firebase-tools`).

### 1. Install

```bash
cd tokyo
npm install
cp .env.example .env
```

### 2. Firebase project (accounts + shared data + hosting)

1. Go to <https://console.firebase.google.com>, **Add project** (call it `tokyo-trip` or similar, Analytics off).
2. **Build → Authentication → Get started → Email/Password → Enable**.
3. **Build → Firestore Database → Create database** (production mode, region `asia-northeast1` Tokyo).
4. **Project settings (gear) → Your apps → Web (`</>`)**. Register an app; copy `apiKey`, `authDomain`, `projectId`, `appId` into `.env`.
5. Put your own email in `VITE_OWNER_EMAIL` in `.env` **and** replace `OWNER_EMAIL` in `firestore.rules`.
6. In **Authentication → Users → Add user**, create your account with that email and a password.
7. Deploy the rules and hosting:

   ```bash
   firebase login
   cp .firebaserc.example .firebaserc   # put your projectId in it
   firebase deploy --only firestore:rules
   npm run build && firebase deploy --only hosting
   ```

   Firebase prints your URL (`https://<project>.web.app`). Open it, sign in, and your editor profile is created automatically. Everyone else you add from **Settings → People**.

### 3. Google Places key (place lookup)

1. <https://console.cloud.google.com> → select the same project Firebase created.
2. **APIs & Services → Library → "Places API (New)" → Enable**. (Not the legacy "Places API".)
3. **APIs & Services → Credentials → Create credentials → API key**. Edit the key:
   - *Application restrictions*: Websites → add `https://<project>.web.app/*` and `http://localhost:5174/*`.
   - *API restrictions*: restrict to **Places API (New)**.
4. Paste the key into `VITE_GOOGLE_PLACES_KEY`.

Billing must be enabled on the Cloud project for Places to respond, but Google gives a monthly free allowance that dwarfs what a trip planner uses (a few hundred lookups total).

### 4. Offline map tiles

The map reads a single `tokyo.pmtiles` file. Build it once on your Mac:

```bash
brew install pmtiles
npm run tiles          # runs scripts/extract-tiles.sh → public/tiles/tokyo.pmtiles
```

The extract covers Greater Tokyo (roughly Hachioji to Narita, Yokohama to Omiya) at street-level detail and comes out around 100–200 MB. It's gitignored; it deploys with the site (`firebase deploy --only hosting` uploads `dist/`, so run `npm run build` after generating it). On each phone, **Settings → Offline → Download** stores it locally; from then on the map never touches the network.

If you'd rather not host the file, set `VITE_TILES_URL` to a Protomaps API URL (`https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt`) with `VITE_PROTOMAPS_KEY`; the map then loads online and keeps whatever areas you've looked at.

### 5. Put it on phones

Open the site in Safari → Share → **Add to Home Screen**. Sign in once while online. After that it opens full-screen, offline, with the trip data already there. On the editor's phone (and ideally each viewer's), run **Settings → Offline → Save all** once the places are final so photos are stored too.

---

## Daily use

**Editor**
- *Places → Add*: type a name ("Fuglen Shibuya", "Afuri Ebisu") or paste a Google Maps link. Pick the result, adjust category and groups, add a note, optionally drop it straight onto a day.
- *Days*: pick a day, **Add a place**, drag the `⋮⋮` handle to reorder, `…` for time/note, move to another day, or remove.
- *Settings → Groups*: create your own collections. They show up as filters on the map and in Places.
- *Settings → People*: add viewers or editors with an email and a password you choose; send them the link and password. Roles can be flipped later.
- *Settings → Trip*: name, first day, number of days.

**Viewer**
- Map, Places and Days are all there; tap any pin or row for details.
- **Directions** picks walking or train based on where you're standing.
- The day filter on the map (the "All days" chip) shows one day as a numbered route.

**Everyone**: appearance (light / dark / auto) is saved to your profile.

---

## Importing from Google Maps

Google doesn't offer an API for reading someone's saved lists, and its short share links can't be opened from inside a web app. Two reliable routes, both in **Settings → Import from Google Maps**:

### Saved lists (the ones you make in the Google Maps app)

1. Go to <https://takeout.google.com>.
2. **Deselect all**, then tick only **Maps (your places)**. Next step → Create export.
3. Download and unzip. Inside `Takeout/Maps (your places)/` you'll find:
   - `Saved Places.json`: everything you've **starred** (has coordinates).
   - `Saved/<List name>.csv`: one file per named list (name and Google Maps URL per row).
4. Import a CSV or the JSON. Leave **Look up on Google** on: names are matched to real places so you get coordinates, photos and hours.

### Custom maps (Google My Maps)

1. Open the map at <https://www.google.com/mymaps>.
2. Menu `⋮` next to the map title → **Export to KML/KMZ** → *Entire map*.
3. Import the `.kml`/`.kmz`. Each **layer** becomes a group here, and pins already carry coordinates.

For one-off places, skip all of this: **Places → Add** and type the name.

A JSON backup exported from Settings can be re-imported the same way.

---

## Development

```bash
npm run dev        # http://localhost:5174, local mode unless .env is filled in
npm run build      # typecheck + production build into dist/ (with service worker)
npm run preview    # serve dist/ on :4174
npm run icons      # regenerate PNG icons from the vermilion-dot mark
```

Layout: `src/lib` (Places API, importers, offline cache, map style, Firestore/local repos), `src/state` (store + hash router), `src/components` (screens and sheets), `src/model` (types, categories, starter data), `src/sw.ts` (service worker).

Data model in Firestore: `users/{uid}` (name, email, role, theme), `trips/main` (name, start date, days), `trips/main/places/{id}`, `trips/main/groups/{id}`, `trips/main/days/{d0..d13}` (ordered `items` of `{placeId, time?, note?}`). Rules: any signed-in person with a profile can read; only editors can write; people can change their own name and theme.

## Limits worth knowing

- Google's API doesn't provide menus. The place website is linked; the editor's notes field is the place for "order the yuzu shio".
- Place photos come from Google and require attribution under Google's terms if you ever share the app more widely.
- Removing a person in Settings revokes their access immediately, but their login remains in Firebase Authentication until you delete it there.
- Transit directions need a connection (they open Google Maps). Everything else works offline once the map is downloaded.
