// Smoke tests for the commands that ship in Stage 1 but aren't yet wired into
// the UI (Archive, Unarchive, Delete, ChangeHabitColor) plus CommandRunner.
// Mirrors what the Kotlin command tests assert without re-deriving each one.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PaletteColor } from "../models";
import { ModelFactory } from "../modelFactory";
import { HabitFixtures } from "../testing/fixtures";
import { setFixedLocalTime } from "../timestamp";
import { ArchiveHabitsCommand } from "./ArchiveHabitsCommand";
import { ChangeHabitColorCommand } from "./ChangeHabitColorCommand";
import { CommandRunner } from "./CommandRunner";
import { CreateHabitCommand } from "./CreateHabitCommand";
import { DeleteHabitsCommand } from "./DeleteHabitsCommand";
import { UnarchiveHabitsCommand } from "./UnarchiveHabitsCommand";

const FIXED_LOCAL_TIME = 1422172800000;

describe("dormant commands", () => {
  beforeEach(() => setFixedLocalTime(FIXED_LOCAL_TIME));
  afterEach(() => setFixedLocalTime(null));

  function setup() {
    const factory = new ModelFactory();
    const habitList = factory.buildHabitList();
    const fixtures = new HabitFixtures(factory, habitList);
    const habit = fixtures.createEmptyHabit();
    habitList.add(habit);
    return { factory, habitList, habit };
  }

  it("ArchiveHabitsCommand sets isArchived on each selected habit", () => {
    const { habitList, habit } = setup();
    expect(habit.isArchived).toBe(false);
    new ArchiveHabitsCommand(habitList, [habit]).run();
    expect(habit.isArchived).toBe(true);
  });

  it("UnarchiveHabitsCommand clears isArchived", () => {
    const { habitList, habit } = setup();
    habit.isArchived = true;
    new UnarchiveHabitsCommand(habitList, [habit]).run();
    expect(habit.isArchived).toBe(false);
  });

  it("DeleteHabitsCommand removes habits from the list", () => {
    const { habitList, habit } = setup();
    expect(habitList.size()).toBe(1);
    new DeleteHabitsCommand(habitList, [habit]).run();
    expect(habitList.size()).toBe(0);
  });

  it("ChangeHabitColorCommand reassigns color on each selected habit", () => {
    const { habitList, habit } = setup();
    new ChangeHabitColorCommand(habitList, [habit], new PaletteColor(7)).run();
    expect(habit.color.paletteIndex).toBe(7);
  });
});

describe("CommandRunner", () => {
  beforeEach(() => setFixedLocalTime(FIXED_LOCAL_TIME));
  afterEach(() => setFixedLocalTime(null));

  it("runs the command synchronously and notifies listeners afterwards", () => {
    const factory = new ModelFactory();
    const habitList = factory.buildHabitList();
    const fixtures = new HabitFixtures(factory, habitList);
    const model = fixtures.createEmptyHabit();
    model.name = "Run command via runner";

    const runner = new CommandRunner();
    const listener = vi.fn();
    runner.addListener(listener);

    const cmd = new CreateHabitCommand(factory, habitList, model);
    runner.run(cmd);

    expect(habitList.size()).toBe(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(cmd);

    runner.removeListener(listener);
    runner.run(new CreateHabitCommand(factory, habitList, model));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
