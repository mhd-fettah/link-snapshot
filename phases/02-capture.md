# Phase 2 — Capture engine

**Depends on:** phase 1 optional (CLI can exist first). Electron not required.  
**Goal:** from a terminal, capture URLs to a folder. Same recipe as Mac Dubizzle.

**Parallel:** with **3** (folder/config only) and **4** (static UI). Do not touch `ui/` or `electron/` in this phase. Inside: parse URLs vs launch cascade vs screenshot loop can be split, then join into one `capture()`.

**Prototype:** `C:\Users\Gaming PC\Desktop\mac laptop\mac dubizzil\screenshot.js`

## Do

Add deps (no others): `playwright`, `playwright-extra`, `puppeteer-extra-plugin-stealth`.  
`npx playwright install chromium` (fallback only).

`src/capture.js` exports `capture({ urls, outputDir, saveHtml, viewport, onProgress, shouldCancel })`.

**Launch (once per batch, then keep):** Chrome → Edge → Chromium. Mode: **headless** → if that batch fails to launch or first URL is bot-blocked, **headed minimized** → **headed full**. Close browser at end/cancel.

**Per URL:** `goto` 90s `domcontentloaded` → wait 5s → Access denied check → `fullPage` PNG `{hostname}-{n}.png` → optional HTML. Continue on error. Cancel **between** URLs.

**Parse helper** (same file or `src/urls.js`): split lines, trim, drop empty/invalid, **dedupe keep first**, return `{ urls, duplicatesRemoved }`. Sequential only.

Optional `node src/capture.js urls.txt ./out` for this phase so you can test without UI.

## Done when

Two public URLs produce `{host}-1.png`, `{host}-2.png`. HTML flag writes `.html`. Bad URL logs and continues.

## Test

- [ ] example.com (or similar) headless
- [ ] `saveHtml: true`
- [ ] invalid URL skipped
- [ ] cancel after URL 1
- [ ] filenames use hostname
