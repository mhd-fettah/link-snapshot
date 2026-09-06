# Phase 7 — Ship

**Depends on:** installers need **6**. Docs do not.  
**Goal:** someone else can run and install it.

**Parallel:** README + `electron-builder` fields in `package.json` anytime after **1**. `npm run build` and the test checklist after **6**. NSIS and portable are one builder run, not two workstreams.

## Do

`electron-builder --win`: `appId` `com.n3xt.linksnap`, `productName` `LinkSnap`, targets **nsis + portable**. Output `dist/`. Prefer system Chrome; README: install Chrome or Edge.

**README:** `npm start`, `npm run build`, Chrome/Edge note, what the app does.

Suggested commits (plain, no co-author):

1. `Add capture engine and dependencies`
2. `Add Electron shell and IPC`
3. `Add LinkSnap UI`
4. `Add Windows build config and README`

## Done when

Portable exe and NSIS installer both launch LinkSnap. Checklist below is green.

## Test

- [ ] 2–3 URLs → files
- [ ] HTML mode
- [ ] Dupes skipped
- [ ] Cancel
- [ ] Headless simple site; headed fallback
- [ ] Explorer auto-open
- [ ] Downloads then last folder
- [ ] Theme + viewport persist
- [ ] Paste count animation
