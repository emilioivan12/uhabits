import { getTodayWithOffset } from "./date";

export const ENTRY_SKIP = 3;
export const ENTRY_YES_MANUAL = 2;
export const ENTRY_YES_AUTO = 1;
export const ENTRY_NO = 0;
export const ENTRY_UNKNOWN = -1;

export type HabitType = "YES_NO" | "NUMERICAL";
export type NumericalHabitType = "AT_LEAST" | "AT_MOST";
export type Theme = "system" | "light" | "dark";

export interface Frequency {
  numerator: number;
  denominator: number;
}

export interface Entry {
  timestamp: number;
  value: number;
  notes: string;
}

export interface Score {
  timestamp: number;
  value: number;
}

export interface Streak {
  start: number;
  end: number;
  length: number;
}

export interface Reminder {
  hour: number;
  minute: number;
  days: boolean[];
}

export interface Habit {
  id: number;
  uuid: string;
  name: string;
  question: string;
  description: string;
  type: HabitType;
  frequency: Frequency;
  color: number;
  isArchived: boolean;
  position: number;
  reminder: Reminder | null;
  targetType: NumericalHabitType;
  targetValue: number;
  unit: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  dirty: boolean;
  originalEntries: Entry[];
  computedEntries: Entry[];
  scores: Score[];
  streaks: Streak[];
}

export interface HabitDraft {
  name: string;
  question: string;
  description: string;
  type: HabitType;
  frequency: Frequency;
  color: number;
  targetType: NumericalHabitType;
  targetValue: number;
  unit: string;
}

export interface PreferencesState {
  showArchived: boolean;
  showCompleted: boolean;
  firstWeekday: number;
  isSkipEnabled: boolean;
  areQuestionMarksEnabled: boolean;
  telemetryEnabled: boolean;
  theme: Theme;
}

export interface HabitMatcher {
  isArchivedAllowed?: boolean;
  isReminderRequired?: boolean;
  isCompletedAllowed?: boolean;
  isEnteredAllowed?: boolean;
}

export type HabitOrder =
  | "BY_NAME_ASC"
  | "BY_NAME_DESC"
  | "BY_COLOR_ASC"
  | "BY_COLOR_DESC"
  | "BY_SCORE_ASC"
  | "BY_SCORE_DESC"
  | "BY_STATUS_ASC"
  | "BY_STATUS_DESC"
  | "BY_POSITION";

export interface RuntimeState {
  habits: Habit[];
  nextHabitId: number;
}

export const DEFAULT_PREFERENCES: PreferencesState = {
  showArchived: false,
  showCompleted: true,
  firstWeekday: 1,
  isSkipEnabled: false,
  areQuestionMarksEnabled: false,
  telemetryEnabled: false,
  theme: "system"
};

export const DAILY_FREQUENCY: Frequency = { numerator: 1, denominator: 1 };

export function normalizeFrequency(frequency: Frequency): Frequency {
  if (frequency.numerator === frequency.denominator) {
    return { numerator: 1, denominator: 1 };
  }
  return frequency;
}

export function nextToggleValue(
  value: number,
  isSkipEnabled: boolean,
  areQuestionMarksEnabled: boolean
): number {
  switch (value) {
    case ENTRY_YES_AUTO:
      return ENTRY_YES_MANUAL;
    case ENTRY_YES_MANUAL:
      return isSkipEnabled ? ENTRY_SKIP : ENTRY_NO;
    case ENTRY_SKIP:
      return ENTRY_NO;
    case ENTRY_NO:
      return areQuestionMarksEnabled ? ENTRY_UNKNOWN : ENTRY_YES_MANUAL;
    case ENTRY_UNKNOWN:
      return ENTRY_YES_MANUAL;
    default:
      return ENTRY_YES_MANUAL;
  }
}

export const PALETTE_COLORS = [
  "#D32F2F",
  "#E64A19",
  "#F57C00",
  "#FF8F00",
  "#F9A825",
  "#AFB42B",
  "#7CB342",
  "#388E3C",
  "#00897B",
  "#00ACC1",
  "#039BE5",
  "#1976D2",
  "#303F9F",
  "#5E35B1",
  "#8E24AA",
  "#D81B60",
  "#5D4037",
  "#303030",
  "#757575",
  "#AAAAAA"
];

function buildUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replaceAll("-", "");
  }
  return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
}

export function buildHabitFromDraft(id: number, position: number, draft: HabitDraft): Habit {
  const now = Date.now();
  return {
    id,
    uuid: buildUuid(),
    name: draft.name,
    question: draft.question,
    description: draft.description,
    type: draft.type,
    frequency: normalizeFrequency(draft.frequency),
    color: draft.color,
    isArchived: false,
    position,
    reminder: null,
    targetType: draft.targetType,
    targetValue: draft.targetValue,
    unit: draft.unit,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    dirty: true,
    originalEntries: [],
    computedEntries: [],
    scores: [],
    streaks: []
  };
}

export function isHabitCompletedToday(habit: Habit, today = getTodayWithOffset()): boolean {
  const entry = habit.computedEntries.find((e) => e.timestamp === today);
  const value = entry?.value ?? ENTRY_UNKNOWN;
  if (habit.type === "NUMERICAL") {
    switch (habit.targetType) {
      case "AT_LEAST":
        return value / 1000 >= habit.targetValue;
      case "AT_MOST":
        return false;
    }
  }
  return value !== ENTRY_NO && value !== ENTRY_UNKNOWN;
}

export function isHabitEnteredToday(habit: Habit, today = getTodayWithOffset()): boolean {
  const entry = habit.computedEntries.find((e) => e.timestamp === today);
  const value = entry?.value ?? ENTRY_UNKNOWN;
  return value !== ENTRY_UNKNOWN;
}
