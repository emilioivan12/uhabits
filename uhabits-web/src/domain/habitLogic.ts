import { getTodayWithOffset, plusDays } from "./date";
import { recomputeEntries } from "./entryList";
import { Entry, ENTRY_UNKNOWN, Habit, isHabitCompletedToday, isHabitEnteredToday } from "./models";
import { recomputeScores } from "./score";
import { recomputeStreaks } from "./streak";

export function cloneHabit(habit: Habit): Habit {
  return {
    ...habit,
    frequency: { ...habit.frequency },
    reminder: habit.reminder
      ? {
          ...habit.reminder,
          days: [...habit.reminder.days]
        }
      : null,
    originalEntries: habit.originalEntries.map((entry) => ({ ...entry })),
    computedEntries: habit.computedEntries.map((entry) => ({ ...entry })),
    scores: habit.scores.map((score) => ({ ...score })),
    streaks: habit.streaks.map((streak) => ({ ...streak }))
  };
}

export function setHabitEntry(
  habit: Habit,
  timestamp: number,
  value: number,
  notes: string
): Habit {
  const cloned = cloneHabit(habit);
  const filtered = cloned.originalEntries.filter((entry) => entry.timestamp !== timestamp);
  filtered.push({ timestamp, value, notes });
  cloned.originalEntries = filtered.sort((a, b) => b.timestamp - a.timestamp);
  cloned.updatedAt = Date.now();
  cloned.dirty = true;
  return recomputeHabit(cloned);
}

export function getEntryValue(entries: Entry[], timestamp: number): number {
  return entries.find((entry) => entry.timestamp === timestamp)?.value ?? ENTRY_UNKNOWN;
}

export function recomputeHabit(habit: Habit, today = getTodayWithOffset()): Habit {
  const cloned = cloneHabit(habit);

  cloned.computedEntries = recomputeEntries(
    cloned.originalEntries,
    cloned.frequency,
    cloned.type === "NUMERICAL"
  );

  const to = plusDays(today, 30);
  const entries = [...cloned.computedEntries].sort((a, b) => b.timestamp - a.timestamp);
  let from = entries.length > 0 ? entries[entries.length - 1].timestamp : today;
  if (from > to) {
    from = to;
  }

  cloned.scores = recomputeScores({
    frequency: cloned.frequency,
    isNumerical: cloned.type === "NUMERICAL",
    numericalHabitType: cloned.targetType,
    targetValue: cloned.targetValue,
    computedEntries: cloned.computedEntries,
    from,
    to
  });

  cloned.streaks = recomputeStreaks({
    computedEntries: cloned.computedEntries,
    from,
    to,
    isNumerical: cloned.type === "NUMERICAL",
    targetValue: cloned.targetValue,
    targetType: cloned.targetType
  });

  return cloned;
}

export function recomputeHabits(habits: Habit[]): Habit[] {
  return habits.map((habit) => recomputeHabit(habit));
}

export function getTodayScore(habit: Habit, today = getTodayWithOffset()): number {
  return habit.scores.find((score) => score.timestamp === today)?.value ?? 0;
}

export function getCurrentStreak(habit: Habit, today = getTodayWithOffset()): number {
  const active = habit.streaks.find((streak) => streak.end === today);
  return active?.length ?? 0;
}

export function getBestStreak(habit: Habit): number {
  return habit.streaks.reduce((acc, streak) => Math.max(acc, streak.length), 0);
}

export function getCompletionState(habit: Habit, today = getTodayWithOffset()): {
  completed: boolean;
  entered: boolean;
} {
  return {
    completed: isHabitCompletedToday(habit, today),
    entered: isHabitEnteredToday(habit, today)
  };
}
