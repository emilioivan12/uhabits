import { getTodayWithOffset } from "./date";
import { recomputeHabit, setHabitEntry } from "./habitLogic";
import {
  Habit,
  HabitDraft,
  RuntimeState,
  buildHabitFromDraft
} from "./models";

export interface Command {
  type: string;
  run(state: RuntimeState): RuntimeState | Promise<RuntimeState>;
}

function updateHabitInState(
  state: RuntimeState,
  habitId: number,
  updater: (habit: Habit) => Habit
): RuntimeState {
  const habits = state.habits.map((habit) => (habit.id === habitId ? updater(habit) : habit));
  return { ...state, habits };
}

export function createHabitCommand(draft: HabitDraft): Command {
  return {
    type: "CreateHabitCommand",
    run(state) {
      const habit = recomputeHabit(buildHabitFromDraft(state.nextHabitId, state.habits.length, draft));
      return {
        habits: [...state.habits, habit],
        nextHabitId: state.nextHabitId + 1
      };
    }
  };
}

export function editHabitCommand(habitId: number, draft: HabitDraft): Command {
  return {
    type: "EditHabitCommand",
    run(state) {
      return updateHabitInState(state, habitId, (habit) =>
        recomputeHabit({
          ...habit,
          name: draft.name,
          question: draft.question,
          description: draft.description,
          type: draft.type,
          frequency: draft.frequency,
          color: draft.color,
          targetType: draft.targetType,
          targetValue: draft.targetValue,
          unit: draft.unit,
          updatedAt: Date.now(),
          dirty: true
        })
      );
    }
  };
}

export function createRepetitionCommand(
  habitId: number,
  timestamp: number,
  value: number,
  notes: string
): Command {
  return {
    type: "CreateRepetitionCommand",
    run(state) {
      return updateHabitInState(state, habitId, (habit) => setHabitEntry(habit, timestamp, value, notes));
    }
  };
}

export function toggleArchiveCommand(habitId: number, archived: boolean): Command {
  return {
    type: archived ? "ArchiveHabitsCommand" : "UnarchiveHabitsCommand",
    run(state) {
      return updateHabitInState(state, habitId, (habit) => ({
        ...habit,
        isArchived: archived,
        updatedAt: Date.now(),
        dirty: true
      }));
    }
  };
}

export function deleteHabitCommand(habitId: number): Command {
  return {
    type: "DeleteHabitsCommand",
    run(state) {
      const habits = state.habits
        .filter((habit) => habit.id !== habitId)
        .map((habit, index) => ({ ...habit, position: index }));
      return {
        ...state,
        habits
      };
    }
  };
}

export function changeHabitColorCommand(habitId: number, color: number): Command {
  return {
    type: "ChangeHabitColorCommand",
    run(state) {
      return updateHabitInState(state, habitId, (habit) => ({
        ...habit,
        color,
        updatedAt: Date.now(),
        dirty: true
      }));
    }
  };
}

export function setNumericalValueTodayCommand(
  habitId: number,
  newValue: number,
  notes = ""
): Command {
  return createRepetitionCommand(habitId, getTodayWithOffset(), Math.round(newValue * 1000), notes);
}
