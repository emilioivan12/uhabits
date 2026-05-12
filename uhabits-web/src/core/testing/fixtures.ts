// Ported from uhabits-core/.../test/HabitFixtures.kt — boolean variants only.
// Numerical fixtures used by NumericalScoreListTest are constructed inline.

import { Habit } from "../habit";
import { HabitList } from "../habitList";
import { ModelFactory } from "../modelFactory";
import { Entry, NO, YES_MANUAL } from "../entry";
import {
  Frequency,
  HabitType,
  NumericalHabitType,
  PaletteColor,
} from "../models";
import { getToday } from "../timestamp";

const NON_DAILY_HABIT_CHECKS = [
  true,
  false,
  false,
  true,
  true,
  true,
  false,
  false,
  true,
  true,
];

const NON_DAILY_HABIT_NOTES = [
  "",
  "Sick",
  "Forgot to do it, really",
  "",
  "",
  "",
  '"Vacation"',
  "",
  "",
  "",
];

export class HabitFixtures {
  constructor(
    private readonly modelFactory: ModelFactory,
    readonly habitList: HabitList,
  ) {}

  createEmptyHabit({
    name = "Meditate",
    color = new PaletteColor(3),
    position = 0,
  }: { name?: string; color?: PaletteColor; position?: number } = {}): Habit {
    const habit = this.modelFactory.buildHabit();
    habit.name = name;
    habit.question = "Did you meditate this morning?";
    habit.color = color;
    habit.position = position;
    habit.frequency = Frequency.DAILY;
    return habit;
  }

  createEmptyNumericalHabit(targetType: NumericalHabitType): Habit {
    const habit = this.modelFactory.buildHabit();
    habit.type = HabitType.NUMERICAL;
    habit.name = "Run";
    habit.question = "How many miles did you run today?";
    habit.unit = "miles";
    habit.targetType = targetType;
    habit.targetValue = 2.0;
    habit.color = new PaletteColor(1);
    return habit;
  }

  createNumericalHabit(): Habit {
    const habit = this.modelFactory.buildHabit();
    habit.type = HabitType.NUMERICAL;
    habit.name = "Run";
    habit.question = "How many miles did you run today?";
    habit.unit = "miles";
    habit.targetType = NumericalHabitType.AT_LEAST;
    habit.targetValue = 2.0;
    habit.color = new PaletteColor(1);
    const today = getToday();
    const times = [0, 1, 3, 5, 7, 8, 9, 10];
    const values = [100, 200, 300, 400, 500, 600, 700, 800];
    for (let i = 0; i < times.length; i++) {
      habit.originalEntries.add(new Entry(today.minus(times[i]), values[i]));
    }
    habit.recompute();
    return habit;
  }

  createLongHabit(): Habit {
    const habit = this.createEmptyHabit();
    habit.frequency = new Frequency(3, 7);
    habit.color = new PaletteColor(4);
    const today = getToday();
    const marks = [
      0, 1, 3, 5, 7, 8, 9, 10, 12, 14, 15, 17, 19, 20, 26, 27, 28, 50, 51, 52,
      53, 54, 58, 60, 63, 65, 70, 71, 72, 73, 74, 75, 80, 81, 83, 89, 90, 91,
      95, 102, 103, 108, 109, 120,
    ];
    for (const m of marks) {
      habit.originalEntries.add(new Entry(today.minus(m), YES_MANUAL));
    }
    habit.recompute();
    return habit;
  }

  createShortHabit(): Habit {
    const habit = this.modelFactory.buildHabit();
    habit.name = "Wake up early";
    habit.question = "Did you wake up before 6am?";
    habit.frequency = new Frequency(2, 3);
    let timestamp = getToday();
    for (let i = 0; i < NON_DAILY_HABIT_CHECKS.length; i++) {
      const value = NON_DAILY_HABIT_CHECKS[i] ? YES_MANUAL : NO;
      habit.originalEntries.add(
        new Entry(timestamp, value, NON_DAILY_HABIT_NOTES[i]),
      );
      timestamp = timestamp.minus(1);
    }
    habit.recompute();
    return habit;
  }
}
