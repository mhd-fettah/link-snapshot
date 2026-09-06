# Phase 0 — Design language

**Code:** none. Keep this open while building UI (phases 4–6).

**Parallel:** with **1–3** (no files to conflict). Required before **4** CSS, not before capture.

**Intent:** macOS utility panel on Windows. One accent. No dashboard, glass, or custom traffic lights.

**Sources:** Apple HIG color / windows / buttons / type. Mobbin paywalled. Font: **Segoe UI Variable** → Segoe UI → system-ui (do not embed SF Pro).

## Tokens

**Light:** `--bg #F2F2F7` `--surface #FFF` `--text #000000d9` `--text-2 #3C3C4399` `--text-3 #3C3C434D` `--sep #C6C6C8` `--accent #007AFF` `--danger #FF3B30` `--ok #28CD41`

**Dark:** `--bg #1C1C1E` `--surface #2C2C2E` `--text #FFFFFFD9` `--text-2 #EBEBF599` `--text-3 #EBEBF54D` `--sep #38383A` `--accent #0A84FF` `--danger #FF453A` `--ok #32D74B`

Focus: 3px `rgba(0,122,255,0.45)`. CSS: `:root` + `[data-theme="dark"]`.

## Type

| Use | Size |
|-----|------|
| Capture / segments | 13px 600 |
| Body / log | 13px / 18px |
| Path | 12px |
| Count / dupes | 11px |
| Placeholder | 10px |
| URLs in well | 12px mono |

## Layout

Window **720×640**, min 640×560, native title bar. Margins **20px** (14px under title). Sections **12–16px**. Label→control **8px**.

```
[ gear 28 ]
[ paste well ~220px+ ]
[ count pill ] [ N duplicates removed ]
[ Images | Images + HTML ]   height 22
[ path … ] [ Browse ]
[ Capture ]                  height 32, full width, --accent
```

Radii: controls **6**, well **10**, pills **999**. Well shadow only: `0 1px 2px rgba(0,0,0,.06)`.

## Motion

`cubic-bezier(0.22, 1, 0.36, 1)`. Segment 150ms, pill 200ms scale 0.96→1, settings 250ms, progress 200ms, done 350ms. `prefers-reduced-motion` → 1ms.

## Copy

Sentence case. **Capture**, **Cancel**, **Browse**. Settings: **Appearance**, **Viewport**.

## Done when

Anyone implementing UI can build from this file without reopening the old monolith plan.
