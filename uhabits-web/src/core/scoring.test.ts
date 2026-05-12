// Ported from uhabits-core/.../models/{ScoreTest,ScoreListTest}.kt
// Expected values must stay byte-equivalent to the JVM tests; the
// `toBeWithin` matcher (declared in src/test/setup.ts) defaults to 1e-6
// to mirror Hamcrest's `closeTo`.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Score } from "./scoring";
import { Entry, NO, SKIP, UNKNOWN, YES_MANUAL } from "./entry";
import { Frequency, NumericalHabitType } from "./models";
import { Habit } from "./habit";
import { ModelFactory } from "./modelFactory";
import { HabitFixtures } from "./testing/fixtures";
import { Timestamp, getToday, setFixedLocalTime } from "./timestamp";

const FIXED_LOCAL_TIME = 1422172800000;

function setupFixtures() {
  const factory = new ModelFactory();
  const habitList = factory.buildHabitList();
  const fixtures = new HabitFixtures(factory, habitList);
  return { factory, habitList, fixtures };
}

function checkScoreValues(
  habit: Habit,
  today: Timestamp,
  expected: number[],
): void {
  let current = today;
  for (const e of expected) {
    expect(habit.scores.get(current).value).toBeWithin(e);
    current = current.minus(1);
  }
}

describe("Score.compute", () => {
  it("daily habit, check=1", () => {
    const freq = 1.0;
    expect(Score.compute(freq, 0.0, 1)).toBeWithin(0.051922);
    expect(Score.compute(freq, 0.5, 1)).toBeWithin(0.525961);
    expect(Score.compute(freq, 0.75, 1)).toBeWithin(0.762981);
  });

  it("daily habit, check=0", () => {
    const freq = 1.0;
    expect(Score.compute(freq, 0.0, 0)).toBeWithin(0.0);
    expect(Score.compute(freq, 0.5, 0)).toBeWithin(0.474039);
    expect(Score.compute(freq, 0.75, 0)).toBeWithin(0.711058);
  });

  it("non-daily habit, check=1", () => {
    const freq = 1 / 3;
    expect(Score.compute(freq, 0.0, 1)).toBeWithin(0.030314);
    expect(Score.compute(freq, 0.5, 1)).toBeWithin(0.515157);
    expect(Score.compute(freq, 0.75, 1)).toBeWithin(0.757578);
  });

  it("non-daily habit, check=0", () => {
    const freq = 1 / 3;
    expect(Score.compute(freq, 0.0, 0)).toBeWithin(0.0);
    expect(Score.compute(freq, 0.5, 0)).toBeWithin(0.484842);
    expect(Score.compute(freq, 0.75, 0)).toBeWithin(0.727263);
  });
});

describe("ScoreList — YesNo habit", () => {
  let habit: Habit;
  let today: Timestamp;
  let fixtures: HabitFixtures;

  beforeEach(() => {
    setFixedLocalTime(FIXED_LOCAL_TIME);
    ({ fixtures } = setupFixtures());
    habit = fixtures.createEmptyHabit();
    today = getToday();
  });
  afterEach(() => setFixedLocalTime(null));

  function check(offsetOrFromOrValues: number | number[], to?: number): void {
    if (Array.isArray(offsetOrFromOrValues)) {
      for (let i = 0; i < offsetOrFromOrValues.length; i++) {
        if (offsetOrFromOrValues[i] === YES_MANUAL) {
          habit.originalEntries.add(new Entry(today.minus(i), YES_MANUAL));
        }
      }
      habit.recompute();
    } else if (to === undefined) {
      habit.originalEntries.add(
        new Entry(today.minus(offsetOrFromOrValues), YES_MANUAL),
      );
    } else {
      for (let i = offsetOrFromOrValues; i < to; i++) {
        habit.originalEntries.add(new Entry(today.minus(i), YES_MANUAL));
      }
      habit.recompute();
    }
  }

  function addSkip(day: number): void {
    habit.originalEntries.add(new Entry(today.minus(day), SKIP));
  }

  it("test_getValue", () => {
    check(0, 20);
    checkScoreValues(
      habit,
      today,
      [
        0.655747, 0.636894, 0.617008, 0.596033, 0.57391, 0.550574, 0.525961,
        0.5, 0.472617, 0.443734, 0.41327, 0.381137, 0.347244, 0.311495,
        0.273788, 0.234017, 0.192067, 0.14782, 0.101149, 0.051922, 0.0, 0.0,
        0.0,
      ],
    );
  });

  it("test_getValueWithSkip", () => {
    check(0, 20);
    addSkip(5);
    addSkip(10);
    addSkip(11);
    habit.recompute();
    checkScoreValues(
      habit,
      today,
      [
        0.596033, 0.57391, 0.550574, 0.525961, 0.5, 0.472617, 0.472617,
        0.443734, 0.41327, 0.381137, 0.347244, 0.347244, 0.347244, 0.311495,
        0.273788, 0.234017, 0.192067, 0.14782, 0.101149, 0.051922, 0.0, 0.0,
        0.0,
      ],
    );
  });

  it("test_getValueWithSkip2", () => {
    check(5);
    addSkip(4);
    habit.recompute();
    checkScoreValues(
      habit,
      today,
      [0.041949, 0.044247, 0.04667, 0.049226, 0.051922, 0.051922, 0.0],
    );
  });

  it("test_imperfectNonDaily", () => {
    habit.frequency = new Frequency(3, 7);
    const values: number[] = [];
    for (let k = 0; k < 100; k++) {
      values.push(YES_MANUAL, YES_MANUAL, NO, NO, NO, NO, NO);
    }
    check(values);
    expect(habit.scores.get(today).value).toBeWithin(2 / 3);

    habit.frequency = new Frequency(4, 7);
    habit.recompute();
    expect(habit.scores.get(today).value).toBeWithin(0.5);
  });

  it("test_irregularNonDaily — irregular schedule converges to 100%", () => {
    habit.frequency = new Frequency(1, 7);
    const values: number[] = [];
    for (let k = 0; k < 100; k++) {
      values.push(YES_MANUAL, NO, NO, NO, NO, NO, NO);
      values.push(NO, NO, NO, NO, NO, NO, YES_MANUAL);
    }
    check(values);
    expect(habit.scores.get(today).value).toBeWithin(1.0, 1e-3);
  });

  it("shouldAchieveHighScoreInReasonableTime", () => {
    habit = fixtures.createEmptyHabit();
    habit.frequency = Frequency.DAILY;
    for (let i = 0; i <= 89; i++) check(i);
    habit.recompute();
    expect(habit.scores.get(today).value).toBeGreaterThan(0.99);

    habit = fixtures.createEmptyHabit();
    habit.frequency = Frequency.WEEKLY;
    for (let i = 0; i <= 38; i++) check(7 * i);
    habit.recompute();
    expect(habit.scores.get(today).value).toBeGreaterThan(0.99);

    habit.frequency = new Frequency(1, 30);
    for (let i = 0; i <= 17; i++) check(30 * i);
    habit.recompute();
    expect(habit.scores.get(today).value).toBeGreaterThan(0.99);
  });

  it("test_recompute", () => {
    expect(habit.scores.get(today).value).toBeWithin(0.0);
    check(0, 2);
    expect(habit.scores.get(today).value).toBeWithin(0.101149);
    habit.frequency = new Frequency(1, 2);
    habit.recompute();
    expect(habit.scores.get(today).value).toBeWithin(0.054816);
  });

  it("test_addThenRemove", () => {
    const h = fixtures.createEmptyHabit();
    h.recompute();
    expect(h.scores.get(today).value).toBeWithin(0.0);
    h.originalEntries.add(new Entry(today, YES_MANUAL));
    h.recompute();
    expect(h.scores.get(today).value).toBeWithin(0.051922);
    h.originalEntries.add(new Entry(today, UNKNOWN));
    h.recompute();
    expect(h.scores.get(today).value).toBeWithin(0.0);
  });
});

describe("ScoreList — Numerical AT_LEAST habit", () => {
  let habit: Habit;
  let today: Timestamp;
  let fixtures: HabitFixtures;

  beforeEach(() => {
    setFixedLocalTime(FIXED_LOCAL_TIME);
    ({ fixtures } = setupFixtures());
    habit = fixtures.createEmptyNumericalHabit(NumericalHabitType.AT_LEAST);
    today = getToday();
  });
  afterEach(() => setFixedLocalTime(null));

  function addEntries(from: number, to: number, value: number): void {
    for (let i = from; i < to; i++) {
      habit.originalEntries.add(new Entry(today.minus(i), value));
    }
    habit.recompute();
  }

  function addEntry(day: number, value: number): void {
    habit.originalEntries.add(new Entry(today.minus(day), value));
  }

  it("test_withZeroTarget", () => {
    habit = fixtures.createNumericalHabit();
    habit.targetValue = 0.0;
    habit.recompute();
    expect(Number.isFinite(habit.scores.get(today).value)).toBe(true);
  });

  it("test_getValue", () => {
    addEntries(0, 20, 2000);
    checkScoreValues(
      habit,
      today,
      [
        0.655747, 0.636894, 0.617008, 0.596033, 0.57391, 0.550574, 0.525961,
        0.5, 0.472617, 0.443734, 0.41327, 0.381137, 0.347244, 0.311495,
        0.273788, 0.234017, 0.192067, 0.14782, 0.101149, 0.051922, 0.0, 0.0,
        0.0,
      ],
    );
  });

  it("test_recompute", () => {
    expect(habit.scores.get(today).value).toBeWithin(0.0);
    addEntries(0, 2, 2000);
    expect(habit.scores.get(today).value).toBeWithin(0.101149);
    habit.frequency = new Frequency(1, 2);
    habit.recompute();
    expect(habit.scores.get(today).value).toBeWithin(0.072631);
  });

  it("shouldAchieveComparableScoreToProgress", () => {
    addEntries(0, 500, 1000);
    expect(habit.scores.get(today).value).toBeWithin(0.5);
    addEntries(0, 500, 500);
    expect(habit.scores.get(today).value).toBeWithin(0.25);
  });

  it("overeachievingIsntRelevant", () => {
    addEntry(0, 10_000_000);
    habit.recompute();
    expect(habit.scores.get(today).value).toBeWithin(0.051922);
  });
});

describe("ScoreList — Numerical AT_LEAST with skips", () => {
  let habit: Habit;
  let today: Timestamp;
  let fixtures: HabitFixtures;

  beforeEach(() => {
    setFixedLocalTime(FIXED_LOCAL_TIME);
    ({ fixtures } = setupFixtures());
    habit = fixtures.createEmptyNumericalHabit(NumericalHabitType.AT_LEAST);
    today = getToday();
  });
  afterEach(() => setFixedLocalTime(null));

  function addEntries(from: number, to: number, value: number): void {
    for (let i = from; i < to; i++) {
      habit.originalEntries.add(new Entry(today.minus(i), value));
    }
    habit.recompute();
  }

  it("test_getValue with embedded skips", () => {
    addEntries(0, 10, 2000);
    addEntries(10, 11, SKIP);
    addEntries(11, 15, 2000);
    addEntries(15, 16, SKIP);
    addEntries(16, 20, 2000);
    checkScoreValues(
      habit,
      today,
      [
        0.617008, 0.596033, 0.57391, 0.550574, 0.525961, 0.5, 0.472617,
        0.443734, 0.41327, 0.381137, 0.347244, 0.347244, 0.311495, 0.273788,
        0.234017, 0.192067, 0.192067, 0.14782, 0.101149, 0.051922, 0.0, 0.0,
        0.0,
      ],
    );
  });

  it("skipsShouldNotAffectScore", () => {
    addEntries(0, 500, 1000);
    const initial = habit.scores.get(today).value;
    addEntries(500, 1000, SKIP);
    expect(habit.scores.get(today).value).toBeWithin(initial);

    addEntries(0, 300, 1000);
    addEntries(300, 500, SKIP);
    addEntries(500, 700, 1000);
    expect(habit.scores.get(today).value).toBeWithin(initial);
  });
});

describe("ScoreList — Numerical AT_MOST habit", () => {
  let habit: Habit;
  let today: Timestamp;
  let fixtures: HabitFixtures;

  beforeEach(() => {
    setFixedLocalTime(FIXED_LOCAL_TIME);
    ({ fixtures } = setupFixtures());
    habit = fixtures.createEmptyNumericalHabit(NumericalHabitType.AT_MOST);
    today = getToday();
  });
  afterEach(() => setFixedLocalTime(null));

  function addEntries(from: number, to: number, value: number): void {
    for (let i = from; i < to; i++) {
      habit.originalEntries.add(new Entry(today.minus(i), value));
    }
    habit.recompute();
  }

  function addEntry(day: number, value: number): void {
    habit.originalEntries.add(new Entry(today.minus(day), value));
  }

  it("test_withZeroTarget", () => {
    habit = fixtures.createNumericalHabit();
    habit.targetType = NumericalHabitType.AT_MOST;
    habit.targetValue = 0.0;
    habit.recompute();
    expect(Number.isFinite(habit.scores.get(today).value)).toBe(true);
  });

  it("test_getValue", () => {
    addEntry(20, 1000);
    addEntries(0, 20, 5000);
    checkScoreValues(
      habit,
      today,
      [
        0.344253, 0.363106, 0.382992, 0.403967, 0.42609, 0.449426, 0.474039,
        0.5, 0.527383, 0.556266, 0.58673, 0.618863, 0.652756, 0.688505,
        0.726212, 0.765983, 0.807933, 0.85218, 0.898851, 0.948078, 1.0, 0.0,
        0.0,
      ],
    );
  });

  it("test_recompute", () => {
    habit.recompute();
    expect(habit.scores.get(today).value).toBeWithin(1.0);
    addEntries(0, 2, 5000);
    expect(habit.scores.get(today).value).toBeWithin(0.89885);
    habit.frequency = new Frequency(1, 2);
    habit.recompute();
    expect(habit.scores.get(today).value).toBeWithin(0.927369);
  });

  it("shouldAchieveComparableScoreToProgress", () => {
    addEntries(0, 500, 3000);
    expect(habit.scores.get(today).value).toBeWithin(0.5);
    addEntries(0, 500, 3500);
    expect(habit.scores.get(today).value).toBeWithin(0.25);
  });

  it("undereachievingIsntRelevant", () => {
    addEntry(1, 10_000_000);
    habit.recompute();
    expect(habit.scores.get(today).value).toBeWithin(0.950773);
  });

  it("overeachievingIsntRelevant", () => {
    addEntry(0, 5000);
    addEntry(1, 0);
    habit.recompute();
    expect(habit.scores.get(today).value).toBeWithin(0.948077);
    addEntry(1, 1000);
    habit.recompute();
    expect(habit.scores.get(today).value).toBeWithin(0.948077);
  });
});
