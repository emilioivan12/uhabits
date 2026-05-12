# Web UI for uHabits — Stage 1 Plan (Client-Only)

## Current Status (as of 2026-05-10)

| Stage | Status | Notes |
|---|---|---|
| Stage 0 — Project skeleton | ✅ Done | `uhabits-web/` scaffolded; Vite + React 18 + TS + Vitest + Playwright + ESLint + Prettier; CI workflow at `.github/workflows/web.yml` |
| Stage 1 — Core domain in TypeScript | ✅ Done | 83 tests passing across 10 test files; two rounds of code review + fixes applied; all CI checks green |
| Stage 2 — Persistence (sqlite-wasm) | 🔲 Next | See roadmap below |
| Stage 3 — Habit list screen | 🔲 Pending | |
| Stage 4 — Habit detail screen | 🔲 Pending | |
| Stage 5 — Edit habit form + polish | 🔲 Pending | |
| Stage 6 — Import Android `.db` | 🔲 Stretch | |

### Stage 1 deliverables (completed)

**Core files implemented** (`uhabits-web/src/core/`):
- `timestamp.ts` — day-index wrapper (days since 1970-01-01 UTC); `Timestamp.fromYMD`, `.plus`, `.minus`, `.truncate`, weekday, `getToday`/`getTodayWithOffset`/`setFixedLocalTime`
- `models.ts` — `Frequency`, `PaletteColor` (20-color palette), `WeekdayList`, `HabitType`, `NumericalHabitType`, `Reminder`
- `entry.ts` — `Entry`, sentinel values `UNKNOWN=-1 NO=0 YES_AUTO=1 YES_MANUAL=2 SKIP=3`
- `entries.ts` — `EntryList` (add, get, getKnown, getByInterval, recomputeFrom, computeWeekdayFrequency), `buildIntervals`, `snapIntervalsTogether`, `buildEntriesFromInterval`, `groupedSum`, `countSkippedDays`
- `scoring.ts` — `Score.compute` (EMA), `ScoreList.recompute` (numerical + boolean, AT_LEAST/AT_MOST); SKIP-guard improvement over Kotlin
- `streaks.ts` — `Streak`, `StreakList.recompute` + `getBest`
- `habit.ts` — `Habit`, `buildHabit`; `recompute()` wires entries → scores → streaks
- `habitList.ts` — `HabitList` (add, remove, removeAll, getById, getByUuid, update, resort, iterator)
- `observable.ts` — `ModelObservable` (subscribe/notify pattern)
- `modelFactory.ts` — factory for wiring together in-memory instances
- `commands/` — `Command` interface, `CommandRunner`, `CreateHabitCommand`, `EditHabitCommand`, `DeleteHabitsCommand`, `ArchiveHabitsCommand`, `UnarchiveHabitsCommand`, `ChangeHabitColorCommand`, `CreateRepetitionCommand`
- `testing/fixtures.ts` — `HabitFixtures` for tests

**Test files** (all green, `npm test`):
`timestamp.test.ts`, `models.test.ts`, `entries.test.ts`, `scoring.test.ts`, `streaks.test.ts`, `commands/CreateHabitCommand.test.ts`, `commands/EditHabitCommand.test.ts`, `commands/CreateRepetitionCommand.test.ts`, `commands/dormant.test.ts`, `App.test.tsx`

**CI**: `.github/workflows/web.yml` — runs typecheck → build → lint → format:check → test on push/PR to `dev` when `uhabits-web/**` changes.

**Known divergences from Kotlin** (intentional, documented in code):
- `scoring.ts`: SKIP entries excluded from rolling sum (Kotlin lets SKIP=3 pollute it; TS guards cleanly)
- `habit.ts`: `today.plus(30)` projects scores 30 days into the future for UI trend display
- PRNG in `entries.test.ts` weekday-frequency test uses a JS LCG, not JVM `Random`

---

## Context

You like uHabits but don't have an Android phone. Goal: build a **client-only browser version** of Loop Habit Tracker that faithfully reproduces the core daily-use experience (habit list, check-ins, score chart, history heatmap) without a backend. Future stages should be able to import/export the Android app's data.

Constraints set by the user:
- The first stage must be **client-only** (no server).
- Reuse as much existing logic as possible; do not rewrite for the sake of it.
- Do not modify the existing Android/Kotlin core.
- Choose the path that makes future Android-data import/export easiest.

Recommendation chosen: a **fresh TypeScript + React + Vite app** at a new `uhabits-web/` module, using **sqlite-wasm** as the storage engine so Android `.db` exports drop in unchanged. The set of algorithms to port is small (~500 LOC). The Android codebase stays untouched.

---

## Executive Recommendation

| Decision | Choice | Why |
|---|---|---|
| Language | **TypeScript** (full client) | Pure algorithms in core are small (~500 LOC); JVM-coupled bits (`Timestamp`, `DateUtils`, `JdbcDatabase`, `JavaCanvas`) would have to change anyway for any browser target. TS gives the fastest dev loop and zero changes to the Android core. |
| UI framework | **React 18 + Vite + TS** | Familiar, broad chart-lib options, easy Vitest + Playwright testing. |
| Persistence | **sqlite-wasm** (`@sqlite.org/sqlite-wasm`) with **OPFS** for durability | Android `.db` exports load with no conversion; reuse the existing 25 SQL migration files (`uhabits-core/src/jvmMain/resources/migrations/`) as text assets; matches Android schema 1:1. |
| Charts | **HTML Canvas 2D**, ported from `HistoryChart.kt` / `BarChart.kt` / `Ring.kt` shapes | Drawing logic is geometry; ports cleanly. Avoid heavy chart libs. |
| Reuse strategy | Port **only what the MVP needs**: scoring, streaks, score-list recompute, entry recompute, 7 commands, history-card layout math | Honors "less code"; defers everything not in the MVP. |
| Out of scope (Stage 1) | Reminders, notifications, widgets, Tasker, CSV import, theme switcher, settings, archive | Pure client cannot schedule reliable OS alarms; rest are postponable. |

---

## Repository Findings Summary

- Two Gradle modules. `uhabits-core/` is declared KMP but only `jvm()` is configured — no JS/Wasm target today.
- `commonMain` is small (`org.isoron.platform.{gui,io,time,utils}` — Canvas interface, LocalDate, file I/O interface). The vast majority of logic lives in `jvmMain`.
- Latest DB schema is **version 25** (`uhabits-core/src/jvmMain/resources/migrations/25.sql`; `Constants.kt: DATABASE_VERSION = 25`).
- All habit mutations go through `CommandRunner.run(command)`. There is **no `undo()` method** on `CommandRunner` today — undo is not a current Android feature, and the web MVP will not advertise it.
- Persistence interface is clean (`Database`, `Cursor`, `Repository` in `uhabits-core/.../database/`); JVM impl is `JdbcDatabase` (JDBC), Android impl is `AndroidDatabase` (`android.database.sqlite`). A web impl will sit alongside these conceptually but live in the new TS codebase.
- Pure-logic files with no `import java.*`: `Score.kt`, `ScoreList.kt`, `StreakList.kt`, `Entry.kt`, `EntryList.kt`, `Frequency.kt`, `PaletteColor.kt`, `WeekdayList.kt`, `HabitMatcher.kt`, `Habit.kt`, the 7 `commands/*.kt`, presenters under `ui/screens/habits/{list,show}/`, and chart drawing under `ui/views/`.
- JVM-only blockers: `Timestamp.kt` (`java.util.Calendar`), `DateUtils.kt` (`java.time.YearMonth`, `java.util.Calendar`), `JdbcDatabase.kt` (`java.sql.*`), `MigrationHelper.kt` (`java.io.InputStream`), `JavaCanvas.kt` (`java.awt.*`), all `io/` importers.
- Tests: ~47 unit tests in `uhabits-core/src/jvmTest/`. The most load-bearing are `ScoreListTest.kt` (numerical + boolean cases), `EntryListTest.kt`, `StreakListTest.kt`, `TimestampTest.kt`, the 7 command tests, and presenter behavior tests.

---

## Feature Inventory & MVP Cut

### Stage 1 MVP (must-have)

| Feature | Maps to Android | Web rebuild from |
|---|---|---|
| List screen: habits with today's checkmark + 7-day strip | `activities/habits/list/`, `views/HabitCardView.kt`, `core/ui/screens/habits/list/ListHabitsBehavior.kt` | New React component; reuse layout math from `HabitListHeader.kt` |
| Toggle boolean check-in (YES / NO / SKIP) | `views/CheckmarkButtonView.kt`, `commands/CreateRepetitionCommand.kt` | Port command logic |
| Numerical check-in dialog | `views/NumberButtonView.kt`, `common/dialogs/NumberDialog.kt` | New React modal |
| Create / edit habit (name, color, type, frequency, target, unit) | `activities/habits/edit/EditHabitActivity.kt`, `commands/CreateHabitCommand.kt`, `commands/EditHabitCommand.kt` | Port command logic; new form UI |
| Detail screen: overview ring, history heatmap, score chart, streak list | `activities/habits/show/`, `core/ui/screens/habits/show/views/`, `core/ui/views/{HistoryChart,BarChart,Ring}.kt` | Port chart drawing to Canvas 2D |
| Persistence (sqlite-wasm + OPFS) | `core/database/`, `models/sqlite/` | New TS storage layer that mirrors `Database`/`Repository` shape |
| Import an Android `.db` export (drag-and-drop) | n/a (Android exports it natively) | Stage 1 stretch; Stage 2 promotes |

### Postponed (Stage 2+)

- Archive/unarchive, drag-to-reorder, multi-select operations
- Filtering (show archived, hide completed)
- CSV import (Loop / HabitBull / Rewire / Tickmate)
- Settings screen (theme, first weekday, checkmark order, midnight delay)
- Theme switching (light / dark / pure black) — start with system-preference dark/light only
- Bug reporter
- Auto-save notes on entries (already in Android trunk; defer to Stage 2)

### Skipped permanently for client-only

- Reminders / notifications (OS scheduling unavailable)
- Home-screen widgets
- Tasker / automation integration
- Auto-backup via SAF

---

## Architecture & Migration Map

| Existing path | Stage 1 disposition | Web target |
|---|---|---|
| `uhabits-core/.../models/Score.kt` | **Port** (pure math, ~30 LOC) | `web/src/core/scoring.ts` |
| `uhabits-core/.../models/ScoreList.kt` | **Port** (recompute is ~60 LOC) | `web/src/core/scoring.ts` |
| `uhabits-core/.../models/StreakList.kt` | **Port** | `web/src/core/streaks.ts` |
| `uhabits-core/.../models/EntryList.kt` (in-memory + recompute) | **Port** boolean auto-fill + iteration helpers | `web/src/core/entries.ts` |
| `uhabits-core/.../models/{Habit,Entry,Frequency,PaletteColor,WeekdayList,HabitType}.kt` | **Port** as TS types/classes | `web/src/core/models.ts` |
| `uhabits-core/.../models/Timestamp.kt` | **Replace** with a TS wrapper around `Temporal.PlainDate` (or a thin `LocalDate` shim using `date-fns`) | `web/src/core/timestamp.ts` |
| `uhabits-core/.../commands/*.kt` (7 files + `CommandRunner.kt`) | **Port** as TS classes implementing `Command { execute(): void }`; observers fire on completion | `web/src/core/commands/` |
| `uhabits-core/.../database/{Database,Cursor,Repository}.kt` | **Reimplement** thin TS adapter over sqlite-wasm | `web/src/storage/sqlite.ts` |
| `uhabits-core/src/jvmMain/resources/migrations/*.sql` (1.sql – 25.sql) | **Copy** as `web/src/storage/migrations/*.sql` (text assets bundled via Vite `?raw` import) | Same migration runner pattern; bumped versions tracked in a `db_version` row |
| `uhabits-core/.../models/sqlite/{SQLiteHabitList,SQLiteEntryList}.kt` + `records/*.kt` | **Port** column shapes only | `web/src/storage/repositories.ts` |
| `uhabits-core/.../ui/views/{HistoryChart,BarChart,Ring}.kt` | **Port** drawing logic to HTML Canvas 2D | `web/src/charts/` |
| `uhabits-core/.../ui/screens/habits/list/ListHabitsBehavior.kt` | **Port** as a React-friendly state hook | `web/src/screens/list/useHabitList.ts` |
| `uhabits-core/.../ui/screens/habits/show/ShowHabit.kt` + `views/*.kt` | **Port** as React components driven by store | `web/src/screens/show/` |
| `uhabits-core/.../preferences/Preferences.kt` | **Defer**; minimal in-memory prefs for Stage 1 | Postponed |
| `uhabits-core/.../reminders/ReminderScheduler.kt` | **Skip** (Stage 1 is client-only) | n/a |
| `uhabits-core/.../io/*` (CSV / DB importers/exporters) | **Skip** (Stage 1); revisit Stage 2 | n/a |
| `uhabits-android/**` | **Untouched** | n/a |

**State management**: a single `HabitsStore` (Zustand or a small custom store) holds habits + entries in memory; `CommandRunner.run(cmd)` mutates the store, persists to sqlite-wasm, and notifies React via the store's subscription. This mirrors Android's "all mutations through CommandRunner" rule.

---

## Test Migration Map

| Existing test | Action | New location |
|---|---|---|
| `core/.../models/ScoreTest.kt`, `ScoreListTest.kt` | **Translate** every case to Vitest. These define numerical correctness and must pass byte-for-byte. | `web/src/core/scoring.test.ts` |
| `core/.../models/StreakListTest.kt` | Translate to Vitest | `web/src/core/streaks.test.ts` |
| `core/.../models/EntryListTest.kt` | Translate cases that exercise `recomputeFrom` (boolean auto-fill) | `web/src/core/entries.test.ts` |
| `core/.../models/TimestampTest.kt` | Translate; use to validate the Temporal/date-fns shim | `web/src/core/timestamp.test.ts` |
| `core/.../commands/*Test.kt` (7) | Translate the run-and-inspect-state pattern | `web/src/core/commands/*.test.ts` |
| `core/.../ui/screens/habits/list/ListHabitsBehaviorTest.kt` | Translate behavior cases against the React store | `web/src/screens/list/useHabitList.test.ts` |
| `core/.../ui/views/{HistoryChart,BarChart}Test.kt` | Translate as Canvas snapshot tests (compare to baseline PNGs) | `web/tests/charts.snapshot.test.ts` |
| `core/.../models/sqlite/*Test.kt`, `database/RepositoryTest.kt` | Reimplement against sqlite-wasm running in the Vitest jsdom-with-OPFS-shim env | `web/src/storage/*.test.ts` |
| `core/.../database/migrations/Version{22,23}Test.kt` | Use as a template for a generic migration runner test | `web/src/storage/migrations.test.ts` |
| Android `androidTest/` (Espresso, view snapshots) | **Replace** with Playwright E2E; do not port Espresso 1:1 | `web/e2e/` |

**New tests Stage 1 must add**:
- An end-to-end Playwright spec: open app → create boolean habit → check today → reload → verify state persists.
- A migration smoke test: load Android export `.db` (small fixture) → assert 5+ habits visible.
- Component tests for `<HabitCard>`, `<HistoryHeatmap>`, `<ScoreChart>` (Vitest + React Testing Library).

**Gaps to call out**:
- `CommandRunner` has no `undo()` method. Web MVP will not expose undo.
- `BaseUnitTest.kt` loads test assets via classpath; web tests will use Vite's `?raw` and `?url` imports for fixtures.

---

## Kotlin vs TypeScript — Recorded Decision

**Chosen: TypeScript rewrite of the small algorithm surface; Android core untouched.**

Reasoning (your stated priorities in order):
1. **"Don't touch core logic as much as possible"** → Android Kotlin code stays exactly as-is; we reimplement the tiny pure-logic surface in TS. (The Kotlin/JS path would have *required* invasive changes to `Timestamp`, `DateUtils`, `JdbcDatabase`, `JavaCanvas`, plus a build-system overhaul to add JS targets — i.e., a *lot* of touching the core.)
2. **"Less code"** → MVP TS port is ~500 LOC of algorithms + ~1500 LOC of UI. Kotlin/JS path needs all of that *plus* kotlinx-datetime migration, Canvas/Storage adapters, and kotlin-react interop — strictly more code.
3. **"Easier"** → React + Vite + Vitest is the lowest-friction modern web stack. No kotlin-wrappers, no Gradle dance.
4. **"Future Android import/export"** → sqlite-wasm reads Android `.db` files directly with the same schema. Same migration files (`1.sql` … `25.sql`) get copied as text assets. No conversion layer.

Trade-off accepted: the algorithm code now lives in two places (Kotlin in Android, TS in web). For ~500 LOC of math that has been stable for years (and is locked by tests), the divergence cost is low. If/when the Android core is refactored to KMP cleanly, the web port can switch to the shared Kotlin/JS module — but that is a future call.

---

## Staged Roadmap

### ✅ Stage 0 — Project skeleton (DONE)

- **Objective**: a `uhabits-web/` module that builds, lints, and renders "Hello, habits".
- **Delivered**: `uhabits-web/` scaffolded with Vite + React 18 + TS, Vitest + React Testing Library, Playwright, ESLint + Prettier. CI workflow added. `App.test.tsx` placeholder passes.

### ✅ Stage 1 — Core domain in TypeScript (DONE)

- **Objective**: port the pure algorithms with their full test coverage.
- **Delivered**: 83 tests green across 10 files. All algorithms ported (see "Stage 1 deliverables" in the status table at the top). Floating-point parity confirmed — no drift observed. `Timestamp` epoch verified as days since 1970-01-01 UTC midnight, matching Android.

### 🔲 NEXT — Stage 2 — Persistence with sqlite-wasm (≈ 1–2 days)

- **Objective**: durable browser storage that mirrors the Android schema.
- **Tasks**:
  - Add `@sqlite.org/sqlite-wasm`. Use OPFS-backed VFS for durability; fall back to in-memory for browsers without OPFS.
  - Copy `uhabits-core/src/jvmMain/resources/migrations/{1..25}.sql` to `web/src/storage/migrations/`. Bundle each as `?raw`. Implement a migration runner mirroring `MigrationHelper.kt` (read the integer prefix, apply in order, store latest applied version in a table `db_version`).
  - Implement `Database` and `Cursor` shape in TS using sqlite-wasm's prepared statements.
  - Implement `HabitRepository` + `EntryRepository` matching `HabitRecord.kt`/`EntryRecord.kt` column shapes.
  - Wire `CommandRunner.run(cmd)` so each command persists to SQLite synchronously (sqlite-wasm is sync) and then notifies subscribers.
- **Files**: `web/src/storage/{sqlite.ts, migrations.ts, repositories.ts, migrations/*.sql}`.
- **Tests**:
  - Migration runner test: starting from an empty DB, apply all 25 migrations and assert the resulting schema matches Android.
  - Repository round-trip tests for habits and entries.
  - One reload test in Playwright: create a habit, reload page, habit still present.
- **Done when**: closing and reopening the browser tab preserves state.
- **Risks**:
  - OPFS support is not 100% across browsers (Safari has it as of 2023+; older Firefox lacked it). For Stage 1 we accept that Safari < 17 / Firefox < 111 fall back to in-memory.
  - sqlite-wasm bundle is ~1MB gzipped; acceptable for an MVP.
- **Open question**: do we need WAL mode? Probably not for single-tab use; defer.

### Stage 3 — Habit list screen (≈ 2 days)

- **Objective**: see all habits and check today.
- **Tasks**:
  - `<HabitListPage>` reads from store; renders `<HabitCard>` per habit.
  - `<HabitCard>` shows name, color stripe, score ring (port of `Ring.kt` to Canvas 2D), and a 7-day check strip ported from `HabitListHeader.kt`/`CheckmarkButton.kt` rendering shapes.
  - Click a checkbox → dispatch `CreateRepetitionCommand` for that habit + day; UI updates from store subscription.
  - Numerical-habit click opens a `<NumberDialog>` modal, ports `NumberDialog.kt` behavior (enter value + optional note).
  - "+ New habit" floating button opens the create form.
- **Files**: `web/src/screens/list/{HabitListPage.tsx, HabitCard.tsx, NumberDialog.tsx, useHabitList.ts}`, `web/src/charts/{Ring.ts, CheckmarkStrip.ts}`.
- **Tests**:
  - Component test: render `<HabitCard>` with a fixture habit, click today's checkbox, assert command dispatched.
  - Playwright: create boolean habit → check today → reload → still checked.
  - Visual snapshot: Ring at 0%, 50%, 100%.
- **Done when**: you can install the app locally, create habits, check them off, and the data persists.

### Stage 4 — Habit detail screen (≈ 2–3 days)

- **Objective**: parity with Android's "show habit" page for the four key cards.
- **Tasks**:
  - Route `/habit/:id` renders `<ShowHabitPage>` with: `<OverviewCard>` (score ring + 30-day delta), `<HistoryHeatmap>` (port `HistoryChart.kt`), `<ScoreChart>` (port `BarChart.kt` for score history), `<StreakList>` (port `StreakCart.kt`).
  - Heatmap: render a 365-cell grid on Canvas 2D, color-mapped to entry value × score.
  - Score chart: port `BarChart.kt`'s axis/bar geometry; respect daily/weekly/monthly bucketing toggles (Stage 4 ships daily only; weekly/monthly toggles ship empty buttons for Stage 5).
- **Files**: `web/src/screens/show/{ShowHabitPage.tsx, OverviewCard.tsx, HistoryHeatmap.tsx, ScoreChart.tsx, StreakList.tsx}`, `web/src/charts/{HistoryChart.ts, BarChart.ts}`.
- **Tests**:
  - Snapshot test (PNG diff) for HistoryHeatmap and ScoreChart against a fixture habit.
  - Playwright: create habit → check 7 days → open detail → assert heatmap shows 7 colored cells.
- **Done when**: the detail screen visually matches Android within reasonable tolerance.
- **Risks**: chart-rendering parity. The Android core uses an abstract `Canvas` interface — text metrics and font loading will differ. For MVP, accept visual differences as long as numbers (score values, streak counts) match.

### Stage 5 — Edit habit form + small polish (≈ 1–2 days)

- **Objective**: full create/edit lifecycle.
- **Tasks**:
  - `<EditHabitForm>` with name, description, color picker (10 PaletteColor swatches), type (boolean/numerical), target value + unit (numerical only), frequency picker (X per Y days, daily, weekdays).
  - System-preference dark/light theme.
  - Empty-state UI when no habits exist.
- **Files**: `web/src/screens/edit/{EditHabitForm.tsx, ColorPicker.tsx, FrequencyPicker.tsx}`.
- **Tests**: form validation tests; Playwright create-edit-delete flow.
- **Done when**: full habit lifecycle works through the UI.

### Stage 6 (stretch within Stage 1) — Import Android `.db`

- **Objective**: drag-and-drop an Android `Loop Habits Backup ….db` file and see it loaded.
- **Tasks**:
  - File-picker / drag-drop zone on a Settings page.
  - Read file → write bytes to OPFS → close current sqlite-wasm handle → reopen against the new file → run migrations to current version (in case import is older).
- **Files**: `web/src/screens/settings/ImportPage.tsx`, `web/src/storage/import.ts`.
- **Tests**: load a checked-in fixture `.db` (small, sanitized export) → assert habits show up.
- **Done when**: an Android user can drop their backup file in and use the web UI on the same data.

---

## Risks & Open Questions

1. **`Timestamp` semantics**: confirm "day index" is days since 1970-01-01 in UTC midnight (or local). Port test cases will catch off-by-one drift.
2. **Score floating-point parity**: existing Kotlin uses JVM `Math.exp`/`Math.log`. JS uses the same IEEE 754 routines but rounding may differ at the last bit. If `ScoreListTest` translation finds drift, tighten epsilon or pin a small lookup table.
3. **OPFS coverage**: older Firefox/Safari fall back to in-memory and lose state on reload. Acceptable for MVP; flag in UI.
4. **sqlite-wasm bundle size** (~1MB gzipped): acceptable but worth measuring with `vite build --report`.
5. **`CommandRunner` has no `undo()`** in core. The MVP will not advertise undo; postpone the design.
6. **Chart visual parity**: aim for numerical parity; visual parity is best-effort. We do not need to match Android pixel-for-pixel.
7. **No reminders in Stage 1**: deliberate. Service Workers + Web Push could revisit in Stage 2+ but require user permission and notably degrade on iOS.
8. **Diverging algorithm code**: the Android Kotlin and the web TS share no compile-time dependency. Stage 1 tests assert behavioral parity; later stages should add a CI job that compares fixtures against Android's expected outputs if/when Android changes the algorithm.

---

## Critical Files (read first when implementing)

When porting, open these in order:

1. `uhabits-core/src/jvmMain/java/org/isoron/uhabits/core/models/Timestamp.kt` — defines the day index semantics.
2. `uhabits-core/src/jvmMain/java/org/isoron/uhabits/core/models/Score.kt` — exponential moving average formula.
3. `uhabits-core/src/jvmMain/java/org/isoron/uhabits/core/models/ScoreList.kt` — recompute order, freq weighting.
4. `uhabits-core/src/jvmMain/java/org/isoron/uhabits/core/models/EntryList.kt` — boolean auto-fill (`recomputeFrom`).
5. `uhabits-core/src/jvmMain/java/org/isoron/uhabits/core/commands/CreateRepetitionCommand.kt` — the canonical "user clicks a check" path.
6. `uhabits-core/src/jvmMain/java/org/isoron/uhabits/core/ui/screens/habits/list/ListHabitsBehavior.kt` — list-screen state machine to mirror in `useHabitList.ts`.
7. `uhabits-core/src/jvmMain/java/org/isoron/uhabits/core/ui/views/HistoryChart.kt` — heatmap geometry.
8. `uhabits-core/src/jvmMain/java/org/isoron/uhabits/core/ui/views/Ring.kt` — overview ring.
9. `uhabits-core/src/jvmMain/resources/migrations/{1..25}.sql` — copy verbatim into web migration assets.
10. `uhabits-core/src/jvmTest/.../models/ScoreListTest.kt` and `EntryListTest.kt` — these are your acceptance tests.

---

## Suggested First Implementation Task

**Stage 0 + Stage 1's `Score`/`Timestamp` port**, behind a single PR titled "uhabits-web: scaffold + core scoring port".

Concretely:
1. Scaffold `uhabits-web/` with Vite + React + TS + Vitest + Playwright (Stage 0).
2. Port `Timestamp` and write `timestamp.test.ts` mirroring `TimestampTest.kt`.
3. Port `Score.compute` and `ScoreList.recompute`; mirror `ScoreListTest.kt` cases.
4. Confirm all ported tests pass green.

This delivers the riskiest piece (numerical parity) first and gives a clean platform for the rest of the roadmap.

---

## Verification

After Stage 1:
- `npm --prefix uhabits-web test` → green.
- `npm --prefix uhabits-web run typecheck` → no errors.
- A short manual demo: create a habit → check it 5 days → reload → state preserved → open detail → see heatmap with 5 cells lit.
- A Playwright run: `npm --prefix uhabits-web run e2e` → green.

Stage-end demo: a localhost web app where you can use the same daily check-in workflow you would on Android. Stretch: drop your Android `.db` export and see it work.
