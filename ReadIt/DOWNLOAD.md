# Download & run Read It (no daily Xcode needed)

Yes — once packaged, you use Read It like a normal Mac app: unzip → double-click → menu bar icon.

Building that package still needs a Mac **once** (or GitHub’s Mac builders). This cloud/Linux environment cannot produce a real `.app` binary.

## Easiest path for you: GitHub Actions download

1. Open the repo on GitHub: https://github.com/damondoesdesign/ai-dev-tasks
2. Click the **Actions** tab
3. Select workflow **Package Read It**
4. Open the latest green run (or click **Run workflow**)
5. At the bottom, download the artifact **ReadIt-macOS**
6. Unzip it on your Mac
7. Double-click **Read It.app**
8. If macOS blocks it: right-click the app → **Open** → **Open**

You do **not** need Xcode after that for normal use.

## Alternative: package once on your Mac

If you already installed Xcode:

```bash
cd /path/to/ai-dev-tasks
chmod +x ReadIt/scripts/package.sh
./ReadIt/scripts/package.sh
```

Then open:

- `ReadIt/dist/ReadIt.app` (double-click), or
- `ReadIt/dist/ReadIt.zip` (share/download)

## App Store vs downloadable app

| | Double-click download (what we’re doing) | Mac App Store |
|--|------------------------------------------|---------------|
| For you | Unzip and open | Search & install |
| Needs | Build zip (Actions or one Mac package) | Apple Developer Program (~$99/yr), review, sandbox rules |
| Fit for Read It | Good — menu-bar utilities often ship this way | Harder — global mouse taps + Accessibility fight the App Store sandbox |

Read It is set up for **direct download**. True App Store listing is a later project (signing, notarization, sandbox redesign).

## After it opens

1. Complete the API key welcome screen ([console.x.ai](https://console.x.ai/))
2. Allow **Accessibility** when asked
3. Highlight text → **Services → Read It**, or **Shift + middle-click**
