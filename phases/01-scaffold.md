# Phase 1 — Scaffold

**Depends on:** none  
**Goal:** `npm start` opens a 720×640 window titled LinkSnap.

**Parallel:** with **0**. After this, **2 / 3 / 4** can start together (`src/` vs `electron/` vs `ui/`). Do not start Playwright or full UI here.

## Do

1. Fill `package.json`: `main` → `electron/main.js`, scripts `start` / `build`, deps later in phase 2. This phase: **electron only** (`^33`).
2. `electron/main.js`: `BrowserWindow` 720×640, min 640×560, `webPreferences: { preload, contextIsolation: true, nodeIntegration: false }`, load `ui/index.html`.
3. `electron/preload.js`: empty `contextBridge` object (real APIs in phase 3).
4. `ui/index.html`: “LinkSnap” text only.
5. `.gitignore`: `node_modules`, `dist`, `playwright` artifacts.

Do **not** add Playwright, UI CSS, or electron-builder yet.

## Done when

- `npm start` shows an empty native-chrome window
- Renderer cannot `require('fs')`

## Test

- Window size ~720×640
- Close / reopen works
