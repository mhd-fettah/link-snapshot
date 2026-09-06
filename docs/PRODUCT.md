# LinkSnap — Product documentation

Windows desktop app. Paste a list of URLs, capture full-page screenshots (and optional HTML) to a folder, then open that folder in Explorer.

**Repo:** https://github.com/mhd-fettah/link-snapshot.git

---

## What it does

| Feature | Behaviour |
|---------|-----------|
| URL input | Paste one URL per line in a text area |
| Validation | Invalid lines skipped; duplicates removed (first kept) |
| Output format | **Images** (PNG only) or **+ HTML** (PNG + page HTML) |
| Output folder | Defaults to Downloads; remembers last chosen folder |
| Capture | Sequential, one browser session per batch |
| Progress | Live count, progress bar, colour-coded log |
| Cancel | Stops after the current page finishes |
| On complete | Opens Explorer when at least one file was saved |
| Settings | Light/dark theme, viewport preset (1280×800, 1366×900, 1920×1080) |

---

## User flow

1. Open LinkSnap.
2. Paste URLs (one per line).
3. Review URL count; check duplicate/invalid warnings if shown.
4. Choose output format and folder (or keep default Downloads).
5. Click **Capture** (or `Ctrl+Enter`).
6. Watch progress; **Cancel** or `Escape` to stop early.
7. Explorer opens the output folder when files were saved.

**Keyboard shortcuts**

| Key | Action |
|-----|--------|
| `Ctrl+Enter` | Start capture (when enabled) |
| `Escape` | Cancel capture, or close settings |
| Click folder path | Copy full path to clipboard |

---

## Capture engine

**Browser cascade:** Chrome → Edge → bundled Chromium (Playwright fallback).

**Mode cascade:** headless → headed minimized → headed full (on launch failure or bot-block).

**Per URL:**

1. `goto` with 90s timeout, `domcontentloaded`
2. Wait 5 seconds
3. Check for “Access denied” (bot protection)
4. Full-page PNG → `{hostname}-{n}.png`
5. Optional HTML → `{hostname}-{n}.html`
6. Continue on error; honour cancel between URLs

**Filename rule:** hostname without `www.`, incrementing per host (`example.com-1.png`, `example.com-2.png`).

**Requirements:** Chrome or Edge installed on Windows (preferred). Run `npx playwright install chromium` for fallback only.

---

## Architecture

```
electron/main.js      Main process — window, IPC, config, capture orchestration
electron/preload.js   contextBridge API (no node in renderer)
src/capture.js        Playwright capture batch
src/urls.js           URL parse / dedupe / validation
ui/index.html         Markup
ui/styles.css         Design tokens + layout
ui/app.js             Renderer logic
```

**IPC API** (`window.api`):

| Method | Purpose |
|--------|---------|
| `getConfig()` | Theme, viewport, output folder, `isDefaultFolder` |
| `setConfig(partial)` | Persist settings |
| `selectFolder()` | Native folder picker |
| `startCapture({ urls, saveHtml })` | Run batch |
| `cancelCapture()` | Request cancel |
| `onProgress(cb)` | Progress + log events |
| `parseUrls(text)` | Parse URL list in renderer |

**Config** (`userData/config.json`):

```json
{
  "outputDir": null,
  "theme": "light",
  "viewport": "1366x900"
}
```

`outputDir: null` → Downloads until user picks a folder.

---

## UI & design

macOS-style utility panel on Windows. Native title bar. Segoe UI Variable → Segoe UI → system-ui.

**Window:** 720×640 (min 640×560).

**Themes:** CSS variables on `:root` and `[data-theme="dark"]`. Accent `#007AFF` / `#0A84FF`.

**Layout:** Gear → paste well → count/meta → format segment → folder row → progress/log → done banner → Capture.

**Feedback:**

- Count pill animates on change
- Invalid/duplicate lines shown in meta caption
- Progress: `n / m · Loading host…` / `Capturing host…`
- Done banner: ✓ success, ⚠ partial/cancelled-with-saves, ✕ failed/cancelled-empty
- Log lines: green (saved), red (failed), grey (info)

---

## Build & distribution

```bash
npm install
npm start          # dev
npm run build      # dist/
```

**Outputs:** NSIS installer + portable exe (`appId`: `com.n3xt.linksnap`).

**Icon:** `build/icon.png`

---

## Out of scope (v2)

- Bookmark import
- Custom filename prefix
- Retry failed URLs only
- Locale / timezone picker
- Parallel URL capture
- Drag-and-drop URL files
- Capture history

---

## CLI (dev / testing)

```bash
node src/capture.js urls.txt ./output [--html]
```

Same capture logic as the UI, without Electron.
