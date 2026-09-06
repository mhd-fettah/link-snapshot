# Phase 6 — Settings

**Depends on:** **3** (config) + **4** (gear in the layout). Viewport-in-screenshots needs **5**.  
**Goal:** gear panel, persisted.

**Parallel:** dark tokens + panel CSS with **4**. Theme persist with **3** before **5**. Do **not** parallel viewport testing with an unfinished capture wire.

## Do

Overlay card in the same window (not a second `BrowserWindow`). 250ms as in phase 0.

- **Appearance:** Light / Dark → `document.documentElement dataset.theme` + `setConfig({ theme })`
- **Viewport:** `1280×800` | `1366×900` (default) | `1920×1080` → `setConfig({ viewport })`
- Load `getConfig()` on boot so theme/viewport/folder survive relaunch
- Viewport is passed into capture (already from config in phase 3)

## Done when

Toggle dark, quit, reopen — still dark. Change viewport, capture — PNG size matches preset.

## Test

- [ ] Theme persist
- [ ] Viewport persist
- [ ] Main canvas unchanged (no extra toggles outside the gear)
