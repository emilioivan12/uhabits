# Release Readiness Checklist (v1)

This checklist is the Phase 6 gate for `uhabits-web` beta drops.

## 1) Automated gates
Run all commands from `uhabits-web/`:

```bash
npm test
npm run test:e2e
npm run check:release
```

Expected:
- All tests pass.
- `check:release` verifies required PWA artifacts:
  - `dist/manifest.webmanifest`
  - `dist/sw.js`
  - `dist/index.html`
- Bundle budgets pass:
  - Main JS asset <= `400000` bytes
  - Main CSS asset <= `12000` bytes

## 2) Mobile QA matrix (manual)

| Area | Android Chrome | iOS Safari | Pass criteria |
| --- | --- | --- | --- |
| First load | Required | Required | App loads and renders habit list shell |
| Install prompt | Required | Optional (browser-dependent) | Install UX is visible when installable path is available |
| Offline after first load | Required | Required | Habit list opens while offline and existing local data is shown |
| Create/edit habit | Required | Required | Habit can be created/edited with persisted changes after reload |
| Daily interaction | Required | Required | Toggle/check-in updates streak/score and survives reload |
| Archive/unarchive flow | Required | Required | Archived items are hidden/shown according to preferences |
| Settings persistence | Required | Required | Preference changes persist (theme/filter/question mark/telemetry toggle) |

## 3) Telemetry validation (opt-in)
- Default state must be disabled.
- Enabling telemetry in Settings must allow local queue writes in `localStorage` key `loop_web_telemetry_queue`.
- Disabling telemetry must stop new event writes.

## 4) Offline/PWA validation details
- Verify service worker registration in DevTools (`Application` tab).
- Reload app once while online to warm cache.
- Switch DevTools network to offline mode.
- Reload and confirm app shell + existing habits render.

## 5) Release notes minimum content
- Build SHA/date
- Known limitations (no cloud sync, no reminders, no import/export in v1)
- Any temporary QA waivers and mitigation
