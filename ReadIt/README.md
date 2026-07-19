# Read It (macOS)

Menu-bar utility that reads highlighted text aloud with **xAI Grok Text to Speech**.

**Want a double-clickable app (no daily Xcode)?** See [DOWNLOAD.md](DOWNLOAD.md) — download the zip from GitHub Actions, or run `./ReadIt/scripts/package.sh` once on a Mac.

## What it does

- **Right-click** highlighted text → **Services → Read It**
- **Shift + middle mouse button** (wheel click) reads the current selection
- **Menu bar icon** (top-right) for Read Selection, Stop, Settings, and API key setup
- First launch walks you through **having vs getting** an xAI API key
- Settings: Grok voice (Ara / Eve / Leo / Rex / Sal), speed `0.7×–1.5×`, custom trigger, save/load profiles

## Open in Xcode

1. On a Mac, open `ReadIt/ReadIt.xcodeproj` in Xcode 15+
2. Select the **Read It** scheme (My Mac)
3. Run

The app links the local Swift package `ReadItCore`.

If the Xcode project is missing or stale:

```bash
python3 ReadIt/generate_xcode_project.py
```

## First-run setup

1. Launch Read It — a welcome window asks whether you already have an xAI API key.
2. **I need to get one** opens [console.x.ai](https://console.x.ai/) and TTS docs.
3. **I have one** lets you paste the key (stored in Keychain, validated via `GET /v1/tts/voices`).
4. Grant **Accessibility** when prompted (needed for Shift+middle-click and reading selection outside Services).
5. If **Services → Read It** is missing: System Settings → Keyboard → Keyboard Shortcuts → Services → enable **Read It**.

## Project layout

```
ReadItCore/          TTS client, settings/profiles, unit tests
ReadIt/
  ReadIt/            SwiftUI menu-bar app
  ReadItTests/       App smoke tests (Xcode)
  scripts/validate.sh
```

## Validate (Linux / CI)

```bash
chmod +x ReadIt/scripts/validate.sh
./ReadIt/scripts/validate.sh
```

Runs project scaffold checks and `ReadItCore` tests when a Swift toolchain is available.

## Notes

- App Sandbox is off so global mouse/keyboard taps and Services can work reliably for a personal utility.
- Settings profiles store voice, speed, language, and trigger — never the API key.
- TTS requests go to `https://api.x.ai/v1/tts` (15,000 character limit per request).
