# Stage 2 — Persistence with sqlite-wasm

**Module**: `uhabits-web/`
**Predecessor**: Stage 1 (core domain in TypeScript — DONE, 83 tests green)
**Estimated effort**: 1–2 days
**Done when**: closing and reopening the browser tab preserves all habit state, the Android `.db` schema is reproduced 1:1, and a Playwright reload-survives test passes.

---

## 1. Goals & non-goals

### Goals
- Durable browser storage that mirrors the Android schema **byte-for-byte** so future `.db` import (Stage 6) is a file copy, not a translation.
- Reuse all 17 of Android's existing SQL migration files (`09.sql` … `25.sql`) **verbatim** as Vite text assets.
- A `Database` / `Cursor` TypeScript shape that mirrors `uhabits-core/.../database/{Database,Cursor}.kt` — same method names, same null semantics — so future commands and repositories port mechanically.
- `HabitRepository` + `EntryRepository` that round-trip `Habit` / `Entry` instances against SQLite.
- `CommandRunner.run(cmd)` now persists each command's effect synchronously after the in-memory mutation, then notifies subscribers (existing order preserved).
- Graceful fallback: if OPFS is unavailable, fall back to in-memory mode and **visibly flag the user** in the UI shell (one banner; no silent data loss).

### Non-goals (kept out of Stage 2)
- Drag-and-drop `.db` import (that is Stage 6).
- Multi-tab coordination / `BroadcastChannel` syncing (single-tab use is fine for the MVP).
- WAL mode, vacuum scheduling, or any tuning beyond defaults.
- A worker-thread SQLite (we'll start on the main thread; promote to a worker only if a future stage needs it).
- Touching the Android/Kotlin core.

---

## 2. Up-front decisions

| Decision | Choice | Reason |
|---|---|---|
| SQLite engine | **`@sqlite.org/sqlite-wasm`** (official build) | First-party, actively maintained, ships an OPFS VFS, sync API on main thread. |
| Durability | **OPFS-backed VFS** (`opfs` sahPool variant), with **in-memory fallback** | OPFS gives us a real file the user can later export. SAH-pool variant avoids the COOP/COEP cross-origin-isolation requirement, so we don't need to change Vite's HTTP headers. |
| DB version tracking | **`PRAGMA user_version`** | Matches `JdbcDatabase.kt` (`override val version: Int { query("PRAGMA user_version")… }`). One source of truth; no extra `db_version` table needed (this corrects WEB_UI_PLAN.md line 199, which proposed a new table — we should follow Android's existing convention). |
| Initial schema bootstrap | On fresh DB (`user_version == 0`), **set `user_version = 8`** before running migrations, so `09.sql` runs as the "first" migration that creates tables | Migrations `01.sql..08.sql` were squashed years ago and are not in the repo. Android's `SQLiteOpenHelper.onCreate` effectively skips them. We replicate that behavior. |
| SQL parsing | **Port `SQLParser.kt` to TS** (small: ~100 LOC, handles `;`, `--`, `/* */`, and `'string'`) | Necessary because migration files contain multiple statements per file. Don't add a dependency for ~100 LOC. |
| ID generation | Let SQLite assign `id` via `integer primary key autoincrement` (mirrors Android) | The current in-memory `HabitList` already accepts ids on insert; we'll have repos populate `habit.id` from `lastInsertRowId` and pass it through. |
| Synchronous vs async API | **Synchronous** sqlite-wasm calls on the main thread | The Android `Database` interface is synchronous; commands and repos assume sync. The OPFS-SAH-Pool API is sync. This keeps the port 1:1. |
| Commit boundary | Wrap each `CommandRunner.run()` in a single SQLite transaction | Matches Android's per-command consistency guarantee. |
| Bundling | Migration `.sql` files imported as `?raw` strings via Vite | Same approach the WEB_UI_PLAN.md recommended (line 199); no runtime FS access needed. |

---

## 3. Repository facts that constrain this stage

- Migrations directory contains **17 files**, `09.sql` through `25.sql` (verified via `ls uhabits-core/src/jvmMain/resources/migrations/`). `01.sql..08.sql` are intentionally absent.
- `09.sql` issues `CREATE TABLE` for `Habits`, `Checkmarks`, `Repetitions`, `Streak`, `Score`. After applying it, `user_version` should be **9**.
- `25.sql` is `alter table Repetitions add column notes text;`. After applying it, `user_version` should be **25**, matching `Constants.kt:23` (`DATABASE_VERSION = 25`).
- `HabitRecord.kt` table name is `habits` (lowercase via `@Table(name = "habits")`), columns include `description`, `question`, `name`, `freq_num`, `freq_den`, `color`, `position`, `reminder_hour`, `reminder_min`, `reminder_days`, `highlight`, `archived`, `type`, `target_value`, `target_type`, `unit`, `id`, `uuid`.
- `EntryRecord.kt` table is `Repetitions` (preserved from the original schema; *not* renamed to `entries` despite the in-memory class name), columns `id`, `habit` (FK), `timestamp` (unix-time milliseconds — store as raw `Timestamp.unixTime`), `value`, `notes`.
- `MigrationHelper.kt` reads files named `%02d.sql` (zero-padded). The TS migration runner must use the same naming so the import map keys match: `"09"`, `"10"`, … `"25"`.
- `SQLParser.kt` strips `--` line comments, `/* … */` block comments, collapses whitespace, and splits on top-level `;`. We need that fidelity — at least one migration file uses string literals containing semicolons (verify during port: run all 17 files through both parsers and diff the statement lists).

---

## 4. Folder layout (after Stage 2)

```
uhabits-web/src/storage/
  ├─ sqlite.ts                  // WebDatabase + WebCursor — wraps sqlite-wasm
  ├─ sqlParser.ts               // Port of SQLParser.kt
  ├─ migrationHelper.ts         // Port of MigrationHelper.kt; reads ?raw imports
  ├─ migrations/
  │    ├─ 09.sql … 25.sql       // Copied byte-for-byte from uhabits-core/.../migrations/
  │    └─ index.ts              // `import nine from './09.sql?raw'; export const MIGRATIONS = { 9: nine, … };`
  ├─ records/
  │    ├─ HabitRecord.ts        // Port of HabitRecord.kt copyFrom/copyTo
  │    └─ EntryRecord.ts        // Port of EntryRecord.kt copyFrom/toEntry
  ├─ repositories/
  │    ├─ HabitRepository.ts    // CRUD + listAll for Habit
  │    └─ EntryRepository.ts    // CRUD + getByHabit for Entry
  ├─ dbOpener.ts                // openDatabase(): opens OPFS or in-memory; runs migrations
  └─ persistence.ts             // Wires repos to CommandRunner via a listener

uhabits-web/src/storage/__tests__/   (or co-located .test.ts files — match Stage 1 convention)
  ├─ sqlParser.test.ts
  ├─ migrationHelper.test.ts
  ├─ habitRepository.test.ts
  ├─ entryRepository.test.ts
  └─ persistence.test.ts
```

Existing Stage 1 files are touched only minimally:
- `src/core/modelFactory.ts` gains a `persistence?` parameter so the store can hand a `Persistence` to the factory; default stays in-memory so all Stage 1 tests keep passing untouched.
- `src/core/commands/CommandRunner.ts` is **not** modified directly. Persistence subscribes via the existing `addListener` API — that's the whole point of the listener pattern.

---

## 5. Implementation steps

### Step 1 — Add the dependency and bundle migrations
1. `npm --prefix uhabits-web install @sqlite.org/sqlite-wasm`.
2. Copy `uhabits-core/src/jvmMain/resources/migrations/{09..25}.sql` → `uhabits-web/src/storage/migrations/`. Use `cp`, do not retype. Verify with `diff -r` after.
3. Add `migrations/index.ts` that imports each as `?raw` and exports a `Record<number, string>` keyed by integer version (9..25).
4. Update `vite.config.ts` to ensure `.sql` is treated as an asset (Vite's `?raw` suffix is built-in, so this should "just work" — sanity-check with a one-line console.log during dev).
5. In `tsconfig.app.json`, add `"types": ["vite/client"]` if not already, so `?raw` imports type-check.

**Verification**: `npm --prefix uhabits-web run typecheck` succeeds; `npm --prefix uhabits-web run build` includes the 17 SQL strings in the bundle (`grep "alter table Repetitions add column notes" dist/assets/*.js` finds one hit).

### Step 2 — Port `SQLParser.kt` → `sqlParser.ts`
- Single exported function `parse(sql: string): string[]`.
- Faithful state machine: `NONE | STRING | COMMENT | COMMENT_BLOCK`.
- Test by feeding each of the 17 migration files in and asserting non-empty arrays whose joined result, modulo whitespace, equals the original minus comments. Also test pathological inputs:
  - `"select ';' as s;"` → one statement, not two.
  - `"-- a;\nselect 1;"` → one statement.
  - `"/* x; y */ select 1;"` → one statement.
- **Test source of truth**: pick one migration that's known to be hairy (e.g. one that uses string literals) and translate the same Kotlin test from `uhabits-core/src/jvmTest/.../database/SQLParserTest.kt` if it exists; otherwise write fresh cases mirroring the Kotlin parser's edge cases.

### Step 3 — Port the `Database` interface and implement `WebDatabase` over sqlite-wasm
- `src/storage/sqlite.ts` exports `WebDatabase` and `WebCursor` matching the Kotlin shapes:
  - `query(q: string, ...params: string[]): WebCursor`
  - `update(table, values, where, ...params): number`
  - `insert(table, values): number | null`  (returns `lastInsertRowId`)
  - `delete(table, where, ...params): void`
  - `execute(query, ...params): void`
  - `beginTransaction() / setTransactionSuccessful() / endTransaction()`
  - `version` getter via `PRAGMA user_version`
  - `setVersion(v: number)` helper for the migration helper (not on the Kotlin interface — Kotlin uses `PRAGMA user_version = N` directly via `execute`; we should do the same so the surface stays identical).
- Bind parameters use sqlite-wasm's `bind` API; map TS `null | number | string` → SQLite types. Reproduce Kotlin's "null binds as `Types.INTEGER`" only if it matters (sqlite-wasm doesn't care about the typed null in practice — test this).
- `WebCursor.close()` releases the prepared statement. Implement `Symbol.dispose` so callers can use `using cursor = db.query(...)` (TS 5.2+; our tsconfig is 5.6).

### Step 4 — Port `MigrationHelper.kt` → `migrationHelper.ts`
```ts
class MigrationHelper {
  constructor(private db: WebDatabase, private migrations: Record<number, string>) {}
  migrateTo(target: number): void {
    // Special-case: if version is 0 (fresh DB), jump-start to 8 to match Android's onCreate behaviour.
    if (this.db.version === 0) this.db.execute("PRAGMA user_version = 8");
    for (let v = this.db.version + 1; v <= target; v++) {
      const sql = this.migrations[v];
      if (!sql) throw new Error(`Migration ${v} not found`);
      this.db.beginTransaction();
      try {
        for (const stmt of parse(sql)) this.db.execute(stmt);
        this.db.execute(`PRAGMA user_version = ${v}`);
        this.db.setTransactionSuccessful();
      } finally {
        this.db.endTransaction();
      }
    }
  }
}
```
- Note: the Kotlin version does **not** wrap each migration in a transaction; we add that because a partially-applied migration with no rollback would corrupt the OPFS file. This is a deliberate, well-known divergence — document it in a one-line comment in the code.

### Step 5 — `dbOpener.ts`: open OPFS or fall back
- Try `await sqlite3InitModule(); const db = new oo1.OpfsSAHPoolDb('uhabits.sqlite3')`.
- On failure (browser lacks OPFS, or in some private modes): create an in-memory DB (`new oo1.DB(':memory:')`) and set a module-level boolean `isEphemeral = true` that the UI can read.
- After opening, run `new MigrationHelper(db, MIGRATIONS).migrateTo(25)`.
- Export `openDatabase(): Promise<{ db: WebDatabase; isEphemeral: boolean }>`.
- **Lifecycle**: app calls `openDatabase()` once at startup (top of `main.tsx`), pipes the result into a context provider. Closing the tab releases the OPFS handle; no `close()` plumbing needed in app code.

### Step 6 — Port the record classes
- `HabitRecord.ts`: a plain class with public fields matching every column in `HabitRecord.kt`, plus `copyFrom(habit: Habit)` and `copyTo(habit: Habit)` methods translating the same logic line-for-line. Reminder handling: when `model.hasReminder()`, set `reminderHour/Min/Days`; else null them out. `highlight` is always 0 (legacy column).
- `EntryRecord.ts`: same pattern, with `timestamp = entry.timestamp.unixTime` and the `notes ?? ""` round-trip preserved.
- These are intentionally dumb data holders so the diff against the Kotlin originals is small and reviewable.

### Step 7 — `HabitRepository` + `EntryRepository`
- API per repo:
  - `listAll(): Habit[]` — `SELECT * FROM habits ORDER BY position` → build `HabitRecord`s from the cursor → `copyTo` into freshly built `Habit`s via the existing `buildHabit` factory.
  - `findById(id: number): Habit | null`
  - `insert(habit: Habit): void` — uses `HabitRecord.copyFrom`, calls `db.insert("habits", record)`, writes the returned id back into `habit.id`.
  - `update(habit: Habit): void`
  - `delete(habit: Habit): void` — also cascades to `Repetitions WHERE habit = ?`.
- `EntryRepository`:
  - `listByHabit(habitId: number): Entry[]` ordered by `timestamp` DESC (matches `SQLiteEntryList.kt`).
  - `upsert(habitId: number, entry: Entry): void` — `INSERT OR REPLACE` semantics keyed on `(habit, timestamp)`. (Stage 1's `EntryList.add` already handles in-memory replacement; we just mirror it on disk.)
  - `deleteByHabit(habitId: number): void`.
- Cursors must be closed in `try/finally`; consider a small `withCursor(db, sql, params, fn)` helper to make this less error-prone (one place, three lines, used everywhere).

### Step 8 — Wire `CommandRunner` to persistence
- New `persistence.ts` exports `attachPersistence(runner: CommandRunner, habits: HabitList, db: WebDatabase): void`.
- Implementation: register a single `CommandListener` that switches on the concrete command type and calls the matching repo method:
  - `CreateHabitCommand` → `habitRepo.insert(cmd.habit)`
  - `EditHabitCommand` → `habitRepo.update(cmd.habit)` (write the *new* state, which `command.run()` already applied in memory)
  - `DeleteHabitsCommand` → for each: `habitRepo.delete(habit)`
  - `ArchiveHabitsCommand` / `UnarchiveHabitsCommand` / `ChangeHabitColorCommand` → `habitRepo.update(habit)`
  - `CreateRepetitionCommand` → `entryRepo.upsert(habitId, entry)`
- Each listener invocation runs inside a `beginTransaction/setTransactionSuccessful/endTransaction` block.
- Initial load: at startup, `habitRepo.listAll()` → for each, `entryRepo.listByHabit(id)` → use the *existing* (non-command) mutation paths on `HabitList` / `EntryList` to seed the in-memory state, then `recompute()` each habit so scores/streaks materialise.
- **Important**: the seed path must not push records back through the persistence listener (would double-write). Either (a) attach the listener *after* seeding (preferred — simplest), or (b) gate the listener on a `seeding` flag.

### Step 9 — Surface OPFS-fallback state to the UI shell
- A tiny `<EphemeralBanner>` rendered above `<App>` when `isEphemeral === true`: "Your browser does not support persistent storage. Habits will be lost when you close this tab."
- This is the entire UI work in Stage 2; full screens come in Stages 3–4.

---

## 6. Tests to add (Stage 2 acceptance)

| Test | Type | Location |
|---|---|---|
| `sqlParser.test.ts` — comments, strings, semicolons | Vitest unit | `src/storage/sqlParser.test.ts` |
| `migrationHelper.test.ts` — fresh DB ends at version 25; schema matches expected `sqlite_master` snapshot | Vitest, against an in-memory sqlite-wasm | `src/storage/migrationHelper.test.ts` |
| `habitRepository.test.ts` — insert → listAll round-trips name, color, freq, type, target, uuid, reminder, archived | Vitest | co-located |
| `entryRepository.test.ts` — upsert replaces same `(habit, timestamp)` row; listByHabit returns DESC order | Vitest | co-located |
| `persistence.test.ts` — run each of the 7 commands through `CommandRunner`, reload via a fresh repo + `listAll`, assert state matches | Vitest integration | co-located |
| Playwright reload-survives | E2E | `e2e/persistence.spec.ts`: open page → create habit (via UI when Stage 3 lands; for now, via a debug button or a `window.__test__` hook) → reload → habit still there |

**Schema parity check** (do this once, by hand, and capture the output as a fixture):
1. Build the Android app, install it on the emulator, open it once, `adb pull /data/data/org.isoron.uhabits/databases/uhabits.db`.
2. `sqlite3 uhabits.db '.schema' > android.schema.sql`.
3. After running our migration helper to v25, dump the same: `db.exec('.schema')` (or query `sqlite_master`).
4. Diff. They must match exactly modulo whitespace. Commit the Android-side dump as a test fixture under `src/storage/__fixtures__/android.schema.sql`.

---

## 7. Risks & open questions

1. **Migration 1-8 jump-start**: the plan above assumes setting `user_version = 8` on a fresh DB is faithful to Android. Confirm by inspecting `LoopDbHelper` (or equivalent `SQLiteOpenHelper`) in `uhabits-android` during implementation. *If* Android instead pre-creates the schema in code and then runs migrations from 9, we'd want to inline the same `CREATE TABLE` statements that 09.sql contains — but since 09.sql itself creates the tables, the simple jump-start is almost certainly equivalent.
2. **OPFS SAH-Pool API stability**: the `OpfsSAHPoolDb` constructor signature has changed across sqlite-wasm releases. Pin a known-good version in `package.json` and update intentionally, not via `^`.
3. **Persistence durability**: OPFS writes are not auto-fsynced. For an MVP that's fine, but a power-cut during a write *can* corrupt the file. Acceptable for Stage 2; revisit if it bites.
4. **Browser compatibility**: Chrome 102+, Edge 102+, Safari 17+, Firefox 111+. iOS Safari < 17 falls back to ephemeral storage. The banner from Step 9 makes this visible.
5. **Bundle size**: sqlite-wasm is ~1MB gzipped. Measure with `vite build --report`. If it's a concern, lazy-load the storage module (the app shell can show a "Loading…" splash while the WASM streams in). Defer this optimization unless it becomes a real issue.
6. **Schema drift**: when Android bumps `DATABASE_VERSION`, our migrations folder gets out of date. Add a CI check (`scripts/check-migrations.sh`) that diffs `uhabits-web/src/storage/migrations/` against `uhabits-core/src/jvmMain/resources/migrations/` and fails on mismatch. One-line guard, big future payoff.
7. **Tests in jsdom**: sqlite-wasm needs WebAssembly and (for OPFS) a real worker context. Run the storage tests against the *in-memory* variant only; OPFS-specific behavior gets exercised by Playwright (a real browser). Configure Vitest to use the `node` env for `src/storage/**/*.test.ts` if jsdom causes issues.

---

## 8. Sequencing & PR plan

Two PRs land cleanly:

**PR A — "uhabits-web: SQL parser + migration runner"** (small, mechanical, easy to review)
- Adds `@sqlite.org/sqlite-wasm`.
- Copies migration files.
- Implements `sqlParser.ts`, `migrationHelper.ts`, `sqlite.ts`.
- Tests: `sqlParser.test.ts`, `migrationHelper.test.ts`, and a `sqlite.test.ts` that proves `WebDatabase` round-trips a tiny CREATE/INSERT/SELECT.
- No `App.tsx` changes, no UI changes. Zero risk to existing Stage 1 functionality.

**PR B — "uhabits-web: repositories + CommandRunner persistence"** (the real wiring)
- Adds `records/`, `repositories/`, `persistence.ts`, `dbOpener.ts`.
- Wires `main.tsx` to open the DB, seed the in-memory state, attach the persistence listener.
- Adds `<EphemeralBanner>`.
- Tests: per-repo round-trip tests, the end-to-end persistence test that exercises all 7 commands, and the Playwright reload test (via a temporary debug hook on `window`).

Both PRs target `dev`, both keep `WEB_UI_PLAN.md` updated (Stage 2 status flips to ✅ at the end of PR B), and both stay under the existing CI gate (typecheck → build → lint → format → test).

---

## 9. Definition of done

- [ ] All 17 migration files reside in `uhabits-web/src/storage/migrations/` and `diff -r` against the Kotlin source is empty.
- [ ] Fresh DB → `migrateTo(25)` → `PRAGMA user_version` reports 25, and the schema dump equals the Android fixture (modulo whitespace).
- [ ] All 7 commands persist their effect; reloading the page reconstructs an identical `HabitList` and per-habit `EntryList`.
- [ ] `npm --prefix uhabits-web test` is green (Stage 1's 83 + Stage 2's new tests).
- [ ] `npm --prefix uhabits-web run typecheck`, `lint`, `format:check`, `build` are all green.
- [ ] `npm --prefix uhabits-web run e2e` includes a reload-survives test that passes.
- [ ] `WEB_UI_PLAN.md` Stage 2 row flipped to ✅ with a one-line note pointing here.
- [ ] CI workflow (`.github/workflows/web.yml`) unchanged — Stage 2 doesn't require new CI infra.
