# uhabits-web

Mobile-first, offline-first PWA version of Loop Habit Tracker.

## v1 scope implemented
- Habit CRUD (yes/no and numerical)
- Daily check-ins
- Sorting, filtering, archive/unarchive behavior
- Streak and score summaries
- Local persistence with IndexedDB (Dexie)
- Installable PWA with service worker
- Opt-in local telemetry queue for client errors/events

## Development
```bash
npm install
npm run dev
```

## Quality commands
```bash
# Unit/integration tests (Vitest + Testing Library)
npm test

# Browser smoke E2E (Playwright)
npm run test:e2e

# Release checks: build + PWA artifact checks + bundle budgets
npm run check:release
```

## Playwright setup (first run)
```bash
npx playwright install chromium
```

## Release guidance
Use the checklist in [`docs/release-readiness.md`](./docs/release-readiness.md).
