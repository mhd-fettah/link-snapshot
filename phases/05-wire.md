# Phase 5 — Wire capture

**Depends on:** **2 + 3 + 4** done.  
**Goal:** full happy path from the UI.

**Parallel:** none across people — this is the merge. Inside, one person: button → IPC, then progress UI, then cancel, then done copy.

## Do

- Capture → `startCapture({ urls, saveHtml })`
- While running: lock well, swap to **Cancel**, show `n / m` + 4px bar + 4–6 line log from `onProgress`
- Cancel → `cancelCapture()` (current page finishes)
- On batch end: main already `shell.openPath`; UI shows “Saved to …” (no Open button)
- Per-URL errors in the log; no crash
- After run, Capture re-enabled

## Done when

Paste 2–3 URLs, Capture, files on disk, Explorer opens, Cancel works mid-batch.

## Test

- [ ] PNG names `{host}-{n}`
- [ ] Images + HTML writes `.html`
- [ ] Invalid line skipped
- [ ] Bot-block: log + cascade, app stays up
- [ ] First run uses Downloads
