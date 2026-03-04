import { getTodayWithOffset } from "./date";
import {
  Habit,
  HabitMatcher,
  HabitOrder,
  isHabitCompletedToday,
  isHabitEnteredToday
} from "./models";
import { getTodayScore } from "./habitLogic";

function scoreOf(habit: Habit, today: number): number {
  return getTodayScore(habit, today);
}

function compareByOrder(order: HabitOrder, habit1: Habit, habit2: Habit, today: number): number {
  switch (order) {
    case "BY_POSITION":
      return habit1.position - habit2.position;
    case "BY_NAME_ASC":
      return habit1.name.localeCompare(habit2.name);
    case "BY_NAME_DESC":
      return habit2.name.localeCompare(habit1.name);
    case "BY_COLOR_ASC":
      return habit1.color - habit2.color;
    case "BY_COLOR_DESC":
      return habit2.color - habit1.color;
    case "BY_SCORE_DESC":
      return scoreOf(habit1, today) - scoreOf(habit2, today);
    case "BY_SCORE_ASC":
      return scoreOf(habit2, today) - scoreOf(habit1, today);
    case "BY_STATUS_DESC": {
      const completed1 = isHabitCompletedToday(habit1, today);
      const completed2 = isHabitCompletedToday(habit2, today);
      if (completed1 !== completed2) {
        return completed1 ? -1 : 1;
      }
      if ((habit1.type === "NUMERICAL") !== (habit2.type === "NUMERICAL")) {
        return habit1.type === "NUMERICAL" ? -1 : 1;
      }
      const value1 = habit1.computedEntries.find((entry) => entry.timestamp === today)?.value ?? -1;
      const value2 = habit2.computedEntries.find((entry) => entry.timestamp === today)?.value ?? -1;
      return value2 - value1;
    }
    case "BY_STATUS_ASC":
      return -compareByOrder("BY_STATUS_DESC", habit1, habit2, today);
  }
}

export function sortHabits(
  habits: Habit[],
  primary: HabitOrder,
  secondary: HabitOrder
): Habit[] {
  const today = getTodayWithOffset();
  return [...habits].sort((a, b) => {
    const first = compareByOrder(primary, a, b, today);
    if (first !== 0) {
      return first;
    }
    return compareByOrder(secondary, a, b, today);
  });
}

export function matchHabit(habit: Habit, matcher: HabitMatcher): boolean {
  const today = getTodayWithOffset();
  const isArchivedAllowed = matcher.isArchivedAllowed ?? false;
  const isReminderRequired = matcher.isReminderRequired ?? false;
  const isCompletedAllowed = matcher.isCompletedAllowed ?? true;
  const isEnteredAllowed = matcher.isEnteredAllowed ?? true;

  if (!isArchivedAllowed && habit.isArchived) {
    return false;
  }
  if (isReminderRequired && !habit.reminder) {
    return false;
  }
  if (!isCompletedAllowed && isHabitCompletedToday(habit, today)) {
    return false;
  }
  if (!isEnteredAllowed && isHabitEnteredToday(habit, today)) {
    return false;
  }
  return true;
}

export function filterHabits(habits: Habit[], matcher: HabitMatcher): Habit[] {
  return habits.filter((habit) => matchHabit(habit, matcher));
}
