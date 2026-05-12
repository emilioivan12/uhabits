// Ported from uhabits-core/.../commands/EditHabitCommandTest.kt

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Frequency } from "../models";
import { ModelFactory } from "../modelFactory";
import { HabitList } from "../habitList";
import { HabitFixtures } from "../testing/fixtures";
import { getTodayWithOffset, setFixedLocalTime } from "../timestamp";
import { EditHabitCommand, HabitNotFoundError } from "./EditHabitCommand";

const FIXED_LOCAL_TIME = 1422172800000;

describe("EditHabitCommand", () => {
  let factory: ModelFactory;
  let habitList: HabitList;
  let fixtures: HabitFixtures;

  beforeEach(() => {
    setFixedLocalTime(FIXED_LOCAL_TIME);
    factory = new ModelFactory();
    habitList = factory.buildHabitList();
    fixtures = new HabitFixtures(factory, habitList);
  });
  afterEach(() => setFixedLocalTime(null));

  it("copies fields onto the existing habit while preserving its score", () => {
    const habit = fixtures.createShortHabit();
    habit.name = "original";
    habit.frequency = Frequency.DAILY;
    habit.recompute();
    habitList.add(habit);

    // modified is the command's data carrier — intentionally not added to habitList.
    const modified = fixtures.createEmptyHabit();
    modified.copyFrom(habit);
    modified.name = "modified";

    const today = getTodayWithOffset();
    const originalScore = habit.scores.get(today).value;
    expect(originalScore).toBeGreaterThan(0);

    expect(habit.name).toBe("original");
    new EditHabitCommand(habitList, habit.id!, modified).run();
    expect(habit.name).toBe("modified");
    expect(habit.scores.get(today).value).toBe(originalScore);
  });

  it("throws HabitNotFoundError when the habit id does not exist", () => {
    // No Kotlin counterpart — additional error-path coverage for the TS port.

    // modified is never consulted — the throw fires before copyFrom is called.
    const modified = fixtures.createEmptyHabit();

    // -1 is never assigned by HabitList (IDs start at 1), so this is
    // guaranteed to be absent regardless of other test state.
    const act = () => new EditHabitCommand(habitList, -1, modified).run();
    expect(act).toThrow(HabitNotFoundError);
    expect(act).toThrow("Habit not found");
  });
});
