// Coverage-pad tests for the small value objects (Entry / Frequency / PaletteColor /
// WeekdayList / Reminder / ModelObservable / HabitList / Habit). These mirror
// the implicit assertions made elsewhere in the Kotlin test suite.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Entry, NO, SKIP, UNKNOWN, YES_AUTO, YES_MANUAL } from "./entry";
import {
  Frequency,
  HabitType,
  NumericalHabitType,
  PaletteColor,
  Reminder,
  WeekdayList,
} from "./models";
import { ModelFactory } from "./modelFactory";
import { ModelObservable } from "./observable";
import { HabitFixtures } from "./testing/fixtures";
import { getTodayWithOffset, setFixedLocalTime } from "./timestamp";

const FIXED_LOCAL_TIME = 1422172800000;

describe("Entry", () => {
  it("formattedValue covers every constant and falls back to the raw number", () => {
    const t = getTodayWithOffset();
    expect(new Entry(t, YES_MANUAL).formattedValue).toBe("YES_MANUAL");
    expect(new Entry(t, YES_AUTO).formattedValue).toBe("YES_AUTO");
    expect(new Entry(t, NO).formattedValue).toBe("NO");
    expect(new Entry(t, SKIP).formattedValue).toBe("SKIP");
    expect(new Entry(t, UNKNOWN).formattedValue).toBe("UNKNOWN");
    expect(new Entry(t, 1234).formattedValue).toBe("1234");
  });

  it("equals compares by all three fields", () => {
    const t = getTodayWithOffset();
    expect(new Entry(t, YES_MANUAL).equals(new Entry(t, YES_MANUAL))).toBe(
      true,
    );
    expect(new Entry(t, YES_MANUAL).equals(new Entry(t, NO))).toBe(false);
    expect(
      new Entry(t, YES_MANUAL, "a").equals(new Entry(t, YES_MANUAL, "b")),
    ).toBe(false);
  });

  it("nextToggleValue cycles through the configured states", () => {
    expect(Entry.nextToggleValue(YES_AUTO, true, false)).toBe(YES_MANUAL);
    expect(Entry.nextToggleValue(YES_MANUAL, true, false)).toBe(SKIP);
    expect(Entry.nextToggleValue(YES_MANUAL, false, false)).toBe(NO);
    expect(Entry.nextToggleValue(SKIP, true, false)).toBe(NO);
    expect(Entry.nextToggleValue(NO, false, true)).toBe(UNKNOWN);
    expect(Entry.nextToggleValue(NO, false, false)).toBe(YES_MANUAL);
    expect(Entry.nextToggleValue(UNKNOWN, false, false)).toBe(YES_MANUAL);
    expect(Entry.nextToggleValue(99, false, false)).toBe(YES_MANUAL);
  });
});

describe("Frequency", () => {
  it("collapses any equal numerator/denominator pair to 1/1", () => {
    expect(new Frequency(7, 7)).toEqual(new Frequency(1, 1));
    expect(new Frequency(3, 3).toDouble()).toBe(1);
  });

  it("toDouble matches numerator / denominator", () => {
    expect(new Frequency(3, 7).toDouble()).toBeCloseTo(3 / 7, 12);
  });

  it("equals compares both fields", () => {
    expect(new Frequency(2, 7).equals(new Frequency(2, 7))).toBe(true);
    expect(new Frequency(2, 7).equals(new Frequency(3, 7))).toBe(false);
  });

  it("throws RangeError for non-positive denominator or numerator", () => {
    expect(() => new Frequency(1, 0)).toThrow(RangeError);
    expect(() => new Frequency(1, -1)).toThrow(RangeError);
    expect(() => new Frequency(0, 7)).toThrow(RangeError);
    expect(() => new Frequency(-1, 7)).toThrow(RangeError);
  });
});

describe("PaletteColor", () => {
  it("maps every palette index to a hex string", () => {
    for (let i = 0; i < 20; i++) {
      expect(new PaletteColor(i).toCsvColor()).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("compareTo follows palette index ordering", () => {
    expect(new PaletteColor(2).compareTo(new PaletteColor(5))).toBeLessThan(0);
    expect(new PaletteColor(5).compareTo(new PaletteColor(2))).toBeGreaterThan(
      0,
    );
    expect(new PaletteColor(3).compareTo(new PaletteColor(3))).toBe(0);
  });

  it("throws RangeError for out-of-range palette index", () => {
    expect(() => new PaletteColor(-1).toCsvColor()).toThrow(RangeError);
    expect(() => new PaletteColor(20).toCsvColor()).toThrow(RangeError);
  });
});

describe("WeekdayList", () => {
  it("packed-int constructor round-trips through toInteger", () => {
    for (const packed of [0, 1, 7, 64, 127]) {
      expect(new WeekdayList(packed).toInteger()).toBe(packed);
    }
  });

  it("array constructor pads to length 7", () => {
    const list = new WeekdayList([true, false, true]);
    expect(list.toArray()).toHaveLength(7);
    expect(list.toArray().slice(0, 3)).toEqual([true, false, true]);
  });

  it("isEmpty reflects the underlying array", () => {
    expect(new WeekdayList(0).isEmpty).toBe(true);
    expect(WeekdayList.EVERY_DAY.isEmpty).toBe(false);
  });

  it("equals compares array contents", () => {
    expect(new WeekdayList(127).equals(WeekdayList.EVERY_DAY)).toBe(true);
    expect(new WeekdayList(7).equals(new WeekdayList(8))).toBe(false);
  });
});

describe("Reminder", () => {
  it("stores hour/minute/days verbatim", () => {
    const r = new Reminder(8, 30, WeekdayList.EVERY_DAY);
    expect(r.hour).toBe(8);
    expect(r.minute).toBe(30);
    expect(r.days).toBe(WeekdayList.EVERY_DAY);
  });

  it("throws RangeError for out-of-range hour or minute", () => {
    expect(() => new Reminder(-1, 0, WeekdayList.EVERY_DAY)).toThrow(
      RangeError,
    );
    expect(() => new Reminder(24, 0, WeekdayList.EVERY_DAY)).toThrow(
      RangeError,
    );
    expect(() => new Reminder(0, -1, WeekdayList.EVERY_DAY)).toThrow(
      RangeError,
    );
    expect(() => new Reminder(0, 60, WeekdayList.EVERY_DAY)).toThrow(
      RangeError,
    );
  });
});

describe("ModelObservable", () => {
  it("notifies all listeners and supports removal", () => {
    const obs = new ModelObservable();
    const a = vi.fn();
    const b = vi.fn();
    obs.addListener(a);
    obs.addListener(b);
    obs.notifyListeners();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);

    obs.removeListener(a);
    obs.notifyListeners();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);

    // Removing an unknown listener is a no-op.
    obs.removeListener(() => {});
  });
});

describe("HabitList", () => {
  beforeEach(() => setFixedLocalTime(FIXED_LOCAL_TIME));
  afterEach(() => setFixedLocalTime(null));

  it("assigns ids, looks up by id/uuid/position, and supports iteration + remove", () => {
    const factory = new ModelFactory();
    const list = factory.buildHabitList();
    const fixtures = new HabitFixtures(factory, list);

    const a = fixtures.createEmptyHabit({ name: "a" });
    const b = fixtures.createEmptyHabit({ name: "b" });
    list.add(a);
    list.add(b);

    expect(list.size()).toBe(2);
    expect(list.getById(a.id!)).toBe(a);
    expect(list.getById(99999)).toBe(null);
    expect(list.getByUuid(a.uuid)).toBe(a);
    expect(list.getByUuid(null)).toBe(null);
    expect(list.indexOf(b)).toBe(1);
    expect(list.getByPosition(0)).toBe(a);
    expect(() => list.getByPosition(5)).toThrow(RangeError);

    expect([...list]).toEqual([a, b]);

    list.remove(a);
    expect(list.size()).toBe(1);
    list.remove(a); // already removed: no-op
    expect(list.size()).toBe(1);

    list.removeAll();
    expect(list.isEmpty).toBe(true);
  });

  it("preserves caller-assigned ids and rejects duplicates", () => {
    const factory = new ModelFactory();
    const list = factory.buildHabitList();
    const a = factory.buildHabit();
    a.id = 42;
    list.add(a);
    expect(a.id).toBe(42);

    const dup = factory.buildHabit();
    dup.id = 42;
    expect(() => list.add(dup)).toThrow(/already in the list/);
  });
});

describe("Habit", () => {
  beforeEach(() => setFixedLocalTime(FIXED_LOCAL_TIME));
  afterEach(() => setFixedLocalTime(null));

  it("hasReminder + isCompletedToday + isEnteredToday for boolean and numerical", () => {
    const factory = new ModelFactory();
    const fixtures = new HabitFixtures(factory, factory.buildHabitList());

    const boolHabit = fixtures.createShortHabit();
    expect(boolHabit.hasReminder()).toBe(false);
    boolHabit.reminder = new Reminder(8, 30, WeekdayList.EVERY_DAY);
    expect(boolHabit.hasReminder()).toBe(true);
    expect(boolHabit.isEnteredToday()).toBe(true);
    expect(boolHabit.isCompletedToday()).toBe(true);

    const numHabit = fixtures.createNumericalHabit();
    expect(numHabit.isNumerical).toBe(true);
    expect(numHabit.type).toBe(HabitType.NUMERICAL);
    expect(numHabit.targetType).toBe(NumericalHabitType.AT_LEAST);
    // value=100 / 1000 < target=2.0 → not completed
    expect(numHabit.isCompletedToday()).toBe(false);
    numHabit.targetType = NumericalHabitType.AT_MOST;
    expect(numHabit.isCompletedToday()).toBe(false);
  });
});
