# Phase 3 — Electron IPC + config

**Depends on:** **1**. `startCapture` needs **2**; folder/config/dialog do not.  
**Goal:** main process owns folder, config, and capture; renderer only talks through preload.

**Parallel:**
- With **2** and **4**: implement `selectFolder`, `getConfig`, `setConfig` first.
- Block only the capture IPC until `src/capture.js` exists.
- One owner for `electron/main.js` + `preload.js`.

## Do

`userData/config.json` (no extra package):

```json
{ "outputDir": null, "theme": "light", "viewport": "1366x900" }
```

`null` outputDir → `app.getPath('downloads')` on first use; then persist last chosen path.

**preload** (`contextBridge`):

- `selectFolder()`
- `getConfig()` / `setConfig(partial)`
- `startCapture({ urls, saveHtml })` — outputDir + viewport from config
- `cancelCapture()`
- `onProgress(cb)`

**main**

- `dialog.showOpenDialog({ properties: ['openDirectory'] })`
- Run `src/capture.js`; forward progress via `webContents.send`
- `shell.openPath(outputDir)` when a run finishes (success or mixed) — hook here even if UI is still stub
- Capture never in renderer

Keep `ui/` as a few buttons that log IPC results if needed, or wait for phase 4.

## Done when

DevTools: `window.api.selectFolder()` returns a path; config round-trips; start/cancel exist without throwing.

## Test

- [ ] Picker returns a directory
- [ ] Relaunch keeps last folder
- [ ] `nodeIntegration` still false
