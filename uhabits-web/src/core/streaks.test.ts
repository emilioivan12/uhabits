// Ported from uhabits-core/.../models/StreakListTest.kt

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Entry, NO, YES_MANUAL } from "./entry";
import { Frequency } from "./models";
import { ModelFactory } from "./modelFactory";
import { HabitFixtures } from "./testing/fixtures";
import { getToday, setFixedLocalTime } from "./timestamp";

const FIXED_LOCAL_TIME = 1422172800000;

describe("StreakList", () => {
  beforeEach(() => setFixedLocalTime(FIXED_LOCAL_TIME));
  afterEach(() => setFixedLocalTime(null));

  it("getBest returns top-N streaks ordered by end date (newest first)", () => {
    const factory = new ModelFactory();
    const fixtures = new HabitFixtures(factory, factory.buildHabitList());
    const habit = fixtures.createLongHabit();
    habit.frequency = Frequency.DAILY;
    habit.recompute();
    const streaks = habit.streaks;

    const best4 = streaks.getBest(4);
    expect(best4).toHaveLength(4);
    expect(best4[0].length).toBe(4);
    expect(best4[1].length).toBe(3);
    expect(best4[2].length).toBe(5);
    expect(best4[3].length).toBe(6);

    const best2 = streaks.getBest(2);
    expect(best2).toHaveLength(2);
    expect(best2[0].length).toBe(5);
    expect(best2[1].length).toBe(6);
  });

  it("getBest with sparse data returns just the actual streaks", () => {
    const factory = new ModelFactory();
    const fixtures = new HabitFixtures(factory, factory.buildHabitList());
    const habit = fixtures.createLongHabit();
    habit.frequency = Frequency.DAILY;
    habit.originalEntries.clear();
    const today = getToday();
    habit.originalEntries.add(new Entry(today, YES_MANUAL));
    habit.originalEntries.add(new Entry(today.minus(5), NO));
    habit.recompute();

    const best = habit.streaks.getBest(5);
    expect(best).toHaveLength(1);
    expect(best[0].length).toBe(1);
  });

  it("getBest picks newest among equal-length streaks", () => {
    // Three streaks of length 1: today, 10 days ago, 20 days ago.
    // Best 2 should be today and 10-days-ago (newest).
    const factory = new ModelFactory();
    const fixtures = new HabitFixtures(factory, factory.buildHabitList());
    const habit = fixtures.createEmptyHabit();
    habit.frequency = Frequency.DAILY;
    const today = getToday();
    [0, 10, 20].forEach((offset) => {
      habit.originalEntries.add(new Entry(today.minus(offset), YES_MANUAL));
    });
    habit.recompute();

    const best2 = habit.streaks.getBest(2);
    expect(best2).toHaveLength(2);
    expect(best2[0].end.unixTime).toBe(today.unixTime);
    expect(best2[1].end.unixTime).toBe(today.minus(10).unixTime);
  });
});
