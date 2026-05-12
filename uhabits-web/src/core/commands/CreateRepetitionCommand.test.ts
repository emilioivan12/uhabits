// Ported from uhabits-core/.../commands/CreateRepetitionCommandTest.kt

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { YES_MANUAL } from "../entry";
import { ModelFactory } from "../modelFactory";
import { HabitFixtures } from "../testing/fixtures";
import { getToday, setFixedLocalTime } from "../timestamp";
import { CreateRepetitionCommand } from "./CreateRepetitionCommand";

const FIXED_LOCAL_TIME = 1422172800000;

describe("CreateRepetitionCommand", () => {
  beforeEach(() => setFixedLocalTime(FIXED_LOCAL_TIME));
  afterEach(() => setFixedLocalTime(null));

  it("overwrites today's entry with the supplied value", () => {
    const factory = new ModelFactory();
    const habitList = factory.buildHabitList();
    const fixtures = new HabitFixtures(factory, habitList);

    const habit = fixtures.createShortHabit();
    habitList.add(habit);
    const today = getToday();

    expect(habit.originalEntries.get(today).value).toBe(YES_MANUAL);
    new CreateRepetitionCommand(habitList, habit, today, 100, "").run();
    expect(habit.originalEntries.get(today).value).toBe(100);
  });
});
