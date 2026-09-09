# PRD: Read It (macOS)

## 1. Introduction / Overview

**Read It** is a macOS menu-bar utility that reads highlighted text aloud using **xAI Grok Text to Speech**. The user selects text in any app, then triggers reading via the system right-click **Services** menu or **Shift + middle mouse button**. A menu-bar icon provides Stop, Settings, and status.

## 2. Goals

1. Speak selected text with Grok voices from anywhere on macOS.
2. Offer a discoverable right-click path (Services → Read It) and a fast Shift+middle-click trigger.
3. Guide first-time users through obtaining or pasting an xAI API key.
4. Let users choose voice, speed, and a custom trigger; save/load settings profiles.
5. Keep a polished, calm menu-bar presence without a Dock-centric UI.

## 3. User Stories

| ID | Story |
|----|-------|
| US-1 | As a reader, I want to highlight text, right-click, and choose Read It so Grok speaks the selection. |
| US-2 | As a reader, I want Shift+middle-click to read the current selection without opening a menu. |
| US-3 | As a new user, I want an install screen that asks whether I have an xAI API key or need to get one, with the right links. |
| US-4 | As a user, I want to pick among Grok voices (Ara, Eve, Leo, Rex, Sal) and adjust speed. |
| US-5 | As a user, I want to rebind the trigger and save/load settings profiles. |
| US-6 | As a user, I want a menu-bar icon to stop speech and open settings. |

## 4. Functional Requirements

1. Menu-bar accessory app (`LSUIElement`); no primary Dock window.
2. Register macOS Service **“Read It”** for selected UTF-8 plain text.
3. Default global trigger: **Shift + middle mouse button** via CGEvent tap (Accessibility required).
4. Trigger must be rebindable in Settings (keyboard and/or mouse combo).
5. First launch (and whenever no API key is stored): onboarding — “Do you have one, or do you need to get one?” with console/docs links and secure paste into Keychain.
6. TTS via `POST https://api.x.ai/v1/tts`; voices via `GET /v1/tts/voices` with built-in fallback list.
7. Speed control `0.7`–`1.5` (API `speed`).
8. Settings profiles: save / load / delete named JSON profiles (non-secret prefs only; API key remains in Keychain).
9. Single concurrent utterance; Stop from menu bar; new request cancels previous.
10. Enforce 15,000-character limit with a clear error.

## 5. Non-Goals (v1)

- Top-level context-menu injection outside Services
- Floating PopClip toolbar
- Streaming WebSocket TTS
- Custom voice cloning UI
- Windows / Linux / iOS

## 6. Success Metrics

- User can complete API key onboarding and hear selected text within one session on a Mac.
- Right-click Services and Shift+middle-click both produce speech when permissions and key are set.

## 7. Open Questions

- None for v1 scope as of plan approval.
