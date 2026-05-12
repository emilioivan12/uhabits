# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Loop Habit Tracker — open-source Android habit tracker. Two Gradle modules:

- `uhabits-core/` — Kotlin Multiplatform library (JVM target only is built today). Pure logic: models, commands, scoring, persistence, scheduling. No Android dependencies. This is where business logic belongs.
- `uhabits-android/` — Android application (`org.isoron.uhabits`). Activities, views, widgets, notifications, intents, Dagger DI wiring. Depends on `uhabits-core`.

`build.sh`'s `clean` references `uhabits-server` and `uhabits-web` modules, but those are not in `settings.gradle.kts` and are not part of the current build. Only `:uhabits-android` and `:uhabits-core` are wired up.

Branches follow git-flow: develop on `dev`, release from `master`. PRs target `dev`.

## Build & Test Commands

JDK 17 toolchain is required (configured via `jvmToolchain(17)`). `ANDROID_HOME` must be set.

```bash
# Build debug APK
./gradlew :uhabits-android:assembleDebug

# Build everything + run JVM unit tests (what CI does)
./build.sh build

# Core JVM unit tests only (fast, no emulator)
./gradlew :uhabits-core:test
./gradlew test                                  # all unit tests, both modules

# Run a single test class or method
./gradlew :uhabits-core:test --tests "org.isoron.uhabits.core.models.HabitTest"
./gradlew :uhabits-core:test --tests "org.isoron.uhabits.core.models.HabitTest.shouldRecompute"

# Lint (Android lint + ktlint)
./gradlew lintDebug
./gradlew ktlintCheck                           # required by CI
./gradlew ktlintFormat                          # auto-fix style
./gradlew ktlintApplyToIdea                     # configure IDE to match
./gradlew addKtlintFormatGitPreCommitHook       # optional pre-commit hook
```

### Instrumented (Android) tests

Instrumented tests **require a Nexus 4 emulator (4.7" 768x1280 xhdpi), en-US locale, animations off, clean install**. They will not pass on physical devices or differently-configured AVDs. Use `build.sh`, which provisions a matching AVD and a `fresh-install` snapshot:

```bash
./build.sh android-setup 34                     # one-time per API level
./build.sh android-tests 34                     # medium + large tests
./build.sh android-tests-parallel 30 33 34      # multiple APIs in parallel
```

View tests compare custom-view rendering to prerendered images under `uhabits-android/src/androidTest/assets/`. On failure, actual + expected images are pulled to `uhabits-android/build/outputs/test-screenshots/`. To accept new renderings as the new baseline:

```bash
./build.sh android-accept-images
```

## Architecture

### Core library layout (`uhabits-core/src/jvmMain/java/org/isoron/uhabits/core/`)

- `models/` — Domain types: `Habit`, `HabitList`, `Entry`/`EntryList`, `Score`/`ScoreList`, `Streak`/`StreakList`, `Frequency`, `Reminder`, `Timestamp`, `PaletteColor`. Two backing implementations: `models/memory/` (in-memory, used in tests) and `models/sqlite/` (production). `ModelFactory` selects the implementation.
- `commands/` — All mutations to habits go through `Command` objects executed by `CommandRunner` so they are undoable and observable. Adding a new mutation = new `Command` subclass, not direct repository access.
- `database/` — Lightweight JDBC abstraction (`Database`, `Cursor`, `Repository`) with SQL migrations in `src/jvmMain/resources/migrations/NN.sql`. Schema version bumps require a new numbered migration file.
- `ui/screens/`, `ui/views/`, `ui/widgets/` — Platform-agnostic presenters/view-models and chart drawing. Android wires real Views/Activities to these. Keep UI logic here when reasonable so it stays testable on the JVM.
- `tasks/` — Background work abstraction (`Task`, `TaskRunner`).
- `preferences/`, `reminders/`, `utils/`, `io/` — supporting services.
- `commonMain/` — A small platform-agnostic layer under `org.isoron.platform` (gui/io/time/utils). Most logic still lives in `jvmMain`; only put code in `commonMain` if it genuinely needs to be multiplatform.

### Android module layout (`uhabits-android/src/main/java/org/isoron/uhabits/`)

- `HabitsApplication.kt` is the entry point. It opens the SQLite DB, builds the Dagger graph (`DaggerHabitsApplicationComponent`), recomputes habit scores, and starts `WidgetUpdater`, `ReminderScheduler`, and `NotificationTray` listeners. The Dagger component is exposed as a `lateinit var component` singleton.
- `inject/` — Dagger 2 (KSP) modules. App-scoped graph in `HabitsApplicationComponent`; per-activity scope in `HabitsActivityComponent`. New services should be provided through these modules, not constructed ad-hoc.
- `activities/` — UI grouped by screen: `habits/list`, `habits/show`, `habits/edit`, `about`, `intro`, `settings`, plus shared pieces in `common/`.
- `widgets/`, `notifications/`, `receivers/`, `intents/`, `automation/` — Android system surfaces (home-screen widgets, notification tray, broadcast receivers, Tasker integration).
- `database/` — Android-specific adapters bridging the core `Database` interface to Android's SQLite.

### Key conventions

- **All habit mutations go through `CommandRunner`.** Direct writes bypass undo/redo and observers and will break the UI.
- **New code should be Kotlin.** Java is legacy; PRs converting Java → Kotlin are welcome but should be separate from feature/fix PRs (see GUIDELINES.md — refactoring stays in its own PR).
- **Style is enforced by ktlint** with default settings. CI runs `ktlintCheck`; format with `ktlintFormat` before pushing.
- **Schema changes require a numbered migration** under `uhabits-core/src/jvmMain/resources/migrations/` — do not edit existing ones.
- **View test screenshots are part of the source.** If a UI change is intentional, run `build.sh android-accept-images` and commit the updated PNGs under `uhabits-android/src/androidTest/assets/views/`.
