# uhabits-web

Browser client for Loop Habit Tracker. Stage 0 scaffold — a Vite + React + TypeScript app that builds, lints, and renders a placeholder. The Android core (`uhabits-core/`, `uhabits-android/`) is unmodified.

See `../WEB_UI_PLAN.md` for the staged roadmap and the architecture/migration map.

## Requirements

- Node.js 20+ (this scaffold was built against Node 22 / npm 10).

## Common commands

```bash
npm install          # install deps
npm run dev          # vite dev server on http://localhost:5173
npm run build        # type-check + production build to dist/
npm run typecheck    # tsc -b --noEmit
npm test             # vitest (jsdom) — unit + component
npm run lint         # eslint
npm run format       # prettier --write .

npm run e2e:install  # one-time: install Playwright browsers
npm run e2e          # Playwright smoke test (boots dev server)
```

## Layout

```
uhabits-web/
  src/
    App.tsx              # placeholder UI
    App.test.tsx         # vitest + RTL placeholder
    main.tsx             # React entry
    index.css            # base styles
    test/setup.ts        # jest-dom matchers for vitest
  e2e/
    smoke.spec.ts        # Playwright smoke test
  index.html
  vite.config.ts         # Vite + Vitest config (jsdom)
  playwright.config.ts
  tsconfig.json          # references app + node configs
```

## Stage 0 scope

- Project skeleton only. No domain logic ported yet.
- The next stage (Stage 1 in `WEB_UI_PLAN.md`) ports `Timestamp`, `Score`, `ScoreList` and their tests.
