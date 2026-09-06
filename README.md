# LinkSnap

Paste URLs → capture full-page PNG screenshots (optional HTML) → Explorer opens the output folder.

**Requires Chrome or Edge** installed on Windows (Playwright uses them first; bundled Chromium is fallback only).

## Dev

```bash
npm install
npx playwright install chromium   # fallback browser only
npm start
```

## Build

```bash
npm run build
```

Outputs to `dist/`:
- `LinkSnap Setup x.x.x.exe` (NSIS installer)
- `LinkSnap x.x.x.exe` (portable)

## Usage

1. Paste URLs (one per line) in the text area
2. Choose **Images** or **Images + HTML**
3. Pick an output folder (defaults to Downloads, then remembers last used)
4. Click **Capture** — progress shows in the log; **Cancel** stops after the current page
5. When done, Explorer opens the folder automatically

Settings (gear icon): light/dark theme and viewport preset (1280×800, 1366×900, 1920×1080).

Files are named `{hostname}-{n}.png` (and `.html` when enabled). Duplicate URLs are skipped.

## License

MIT
