# Stage 2 — Implementation Log

> This file records exactly what was done, when, and any findings that deviate from the plan.
> Plan reference: `plans/stage-2-persistence.md`

---

## Step 1 — Add the dependency and bundle migrations ✅

**Date**: 2026-05-12
**Status**: Complete

### What was done

1. **Installed `@sqlite.org/sqlite-wasm`**
   - Command: `npm --prefix uhabits-web install @sqlite.org/sqlite-wasm`
   - Resolved version: **3.53.0-build1** (pinned in `package-lock.json`)
   - `package.json` now lists `"@sqlite.org/sqlite-wasm": "^3.53.0-build1"` under `dependencies`.
   - Note from the plan: pin to a specific version to avoid API drift. The lockfile pins it; the caret in `package.json` means future `npm install` could bump to a later build. Tighten to an exact version (remove `^`) before shipping.

2. **Copied 17 migration files verbatim**
   - Source: `uhabits-core/src/jvmMain/resources/migrations/`
   - Destination: `uhabits-web/src/storage/migrations/`
   - Files: `09.sql` through `25.sql` (17 files; `01.sql..08.sql` intentionally absent — squashed into the initial schema captured by `09.sql`).
   - Verified with `diff -r` — output was empty (byte-identical copies).

3. **Created `uhabits-web/src/storage/migrations/index.ts`**
   - Imports all 17 SQL files using Vite's `?raw` suffix (returns the file content as a plain string).
   - Exports `MIGRATIONS: Record<number, string>` keyed 9..25.
   - Exports `LATEST_VERSION = 25` as a single source of truth for the current schema version.

4. **No changes needed to `vite.config.ts` or `tsconfig.app.json`**
   - `uhabits-web/src/vite-env.d.ts` already contains `/// <reference types="vite/client" />` and a `declare module "*.sql?raw"` ambient declaration. Both `?raw` type coverage requirements were already met by the Stage 0 scaffold.

### Verification results

| Check | Result |
|---|---|
| `npm --prefix uhabits-web run typecheck` | ✅ No errors |
| `npm --prefix uhabits-web run build` | ✅ Clean build (31 modules, 142 kB / 45 kB gzip) |
| `npm --prefix uhabits-web test` | ✅ 83/83 passing — Stage 1 tests untouched |
| `diff -r` on migration files | ✅ Empty — byte-identical copies |
| SQL strings in production bundle | ⚠️ Not present yet (tree-shaken: `migrations/index.ts` has no importer until `dbOpener.ts` is wired in Step 5). Expected and correct. |

### Deviation from plan

- **`vite.config.ts` unchanged** — plan said "sanity-check" adding the `?raw` support; it was already present via `vite-env.d.ts`. No action needed.
- **`tsconfig.app.json` unchanged** — plan suggested adding `"types": ["vite/client"]`; the `/// <reference types="vite/client" />` triple-slash directive in `vite-env.d.ts` already satisfies this. No action needed.
- **Tree-shaking** — the bundle verification grep (`grep "alter table Repetitions add column notes"`) found no hit because `migrations/index.ts` is not yet imported anywhere. This is correct; the SQL strings will appear in the bundle after Step 5 wires `dbOpener.ts` into `main.tsx`.

---

## Post-review fixes (2026-05-12) ✅

Applied after code review flagged three issues:

1. **`tsconfig.test.json` — added `"vite/client"` to `types`**
   - Without this, any storage test that imports `migrations/index.ts` (starting at Step 2) would fail typecheck because `*.sql?raw` was not visible in the test compilation scope.
   - `tsconfig.test.json:5`: `"types": ["vitest/globals", "@testing-library/jest-dom", "vite/client"]`

2. **CI Node version bumped 20 → 22; `package.json` engines updated to `>=22`**
   - `@sqlite.org/sqlite-wasm` declares `"engines": { "node": ">=22" }`. Running on Node 20 is an unsupported configuration that could silently break under stricter npm settings.
   - `.github/workflows/web.yml:28`: `node-version: "22"`
   - `uhabits-web/package.json` `engines.node`: `">=22"`

3. **Removed caret from sqlite-wasm version**
   - Plan (Section 7, Risk #2) explicitly requires an exact pin. Changed `"^3.53.0-build1"` → `"3.53.0-build1"` in `package.json`.

All 83 tests still passing; typecheck clean after fixes.

---

## Steps remaining

| Step | Status |
|---|---|
| Step 1 — Dependency + migrations | ✅ Done |
| Step 2 — Port `SQLParser.kt` → `sqlParser.ts` | 🔲 Next |
| Step 3 — `WebDatabase` + `WebCursor` over sqlite-wasm | 🔲 Pending |
| Step 4 — Port `MigrationHelper.kt` → `migrationHelper.ts` | 🔲 Pending |
| Step 5 — `dbOpener.ts` (OPFS + in-memory fallback) | 🔲 Pending |
| Step 6 — Port `HabitRecord` + `EntryRecord` | 🔲 Pending |
| Step 7 — `HabitRepository` + `EntryRepository` | 🔲 Pending |
| Step 8 — Wire `CommandRunner` to persistence | 🔲 Pending |
| Step 9 — `<EphemeralBanner>` UI | 🔲 Pending |
