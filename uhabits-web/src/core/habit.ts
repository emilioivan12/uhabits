// Ported from uhabits-core/.../models/Habit.kt

import { EntryList } from "./entries";
import { Entry, NO, UNKNOWN } from "./entry";
import {
  Frequency,
  HabitType,
  NumericalHabitType,
  PaletteColor,
  Reminder,
} from "./models";
import { ModelObservable } from "./observable";
import { ScoreList } from "./scoring";
import { StreakList } from "./streaks";
import { getTodayWithOffset } from "./timestamp";

export interface HabitFields {
  color?: PaletteColor;
  description?: string;
  frequency?: Frequency;
  id?: number | null;
  isArchived?: boolean;
  name?: string;
  position?: number;
  question?: string;
  reminder?: Reminder | null;
  targetType?: NumericalHabitType;
  targetValue?: number;
  type?: HabitType;
  unit?: string;
  uuid?: string | null;
}

function newUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID().replace(/-/g, "");
  }
  // Fallback for runtimes without crypto.randomUUID (Node < 18, some jsdom
  // versions). Produces a locally unique identifier — not RFC 4122 compliant
  // and must not be used in security-sensitive contexts.
  let out = "";
  for (let i = 0; i < 32; i++) {
    out += Math.floor(Math.random() * 16).toString(16);
  }
  return out;
}

export class Habit {
  color: PaletteColor;
  description: string;
  frequency: Frequency;
  id: number | null;
  isArchived: boolean;
  name: string;
  position: number;
  question: string;
  reminder: Reminder | null;
  targetType: NumericalHabitType;
  targetValue: number;
  type: HabitType;
  unit: string;
  uuid: string | null;

  readonly computedEntries: EntryList;
  readonly originalEntries: EntryList;
  readonly scores: ScoreList;
  readonly streaks: StreakList;
  readonly observable = new ModelObservable();

  constructor(
    fields: HabitFields & {
      computedEntries: EntryList;
      originalEntries: EntryList;
      scores: ScoreList;
      streaks: StreakList;
    },
  ) {
    this.color = fields.color ?? new PaletteColor(8);
    this.description = fields.description ?? "";
    this.frequency = fields.frequency ?? Frequency.DAILY;
    this.id = fields.id ?? null;
    this.isArchived = fields.isArchived ?? false;
    this.name = fields.name ?? "";
    this.position = fields.position ?? 0;
    this.question = fields.question ?? "";
    this.reminder = fields.reminder ?? null;
    this.targetType = fields.targetType ?? NumericalHabitType.AT_LEAST;
    this.targetValue = fields.targetValue ?? 0;
    this.type = fields.type ?? HabitType.YES_NO;
    this.unit = fields.unit ?? "";
    this.uuid = fields.uuid ?? newUuid();
    this.computedEntries = fields.computedEntries;
    this.originalEntries = fields.originalEntries;
    this.scores = fields.scores;
    this.streaks = fields.streaks;
  }

  get isNumerical(): boolean {
    return this.type === HabitType.NUMERICAL;
  }

  hasReminder(): boolean {
    return this.reminder !== null;
  }

  isCompletedToday(): boolean {
    const today = getTodayWithOffset();
    const value = this.computedEntries.get(today).value;
    if (this.isNumerical) {
      if (this.targetType === NumericalHabitType.AT_LEAST) {
        return value / 1000 >= this.targetValue;
      }
      // AT_MOST: isCompletedToday is not meaningful for this type.
      // Callers (e.g. ListHabitsBehavior) compare value/1000 <= targetValue directly.
      return false;
    }
    return value !== NO && value !== UNKNOWN;
  }

  isEnteredToday(): boolean {
    const today = getTodayWithOffset();
    return this.computedEntries.get(today).value !== UNKNOWN;
  }

  recompute(): void {
    this.computedEntries.recomputeFrom(
      this.originalEntries,
      this.frequency,
      this.isNumerical,
    );

    const today = getTodayWithOffset();
    // +30 projects scores 30 days into the future for UI trend display.
    const to = today.plus(30);
    const known = this.computedEntries.getKnown();
    let from = known.length > 0 ? known[known.length - 1].timestamp : today;
    if (from.isNewerThan(to)) from = to;

    this.scores.recompute({
      frequency: this.frequency,
      isNumerical: this.isNumerical,
      numericalHabitType: this.targetType,
      targetValue: this.targetValue,
      computedEntries: this.computedEntries,
      from,
      to,
    });

    this.streaks.recompute({
      computedEntries: this.computedEntries,
      from,
      to,
      isNumerical: this.isNumerical,
      targetValue: this.targetValue,
      targetType: this.targetType,
    });
  }

  /**
   * Copies all mutable fields from `other` except `id` and the per-instance
   * collections (computedEntries / originalEntries / scores / streaks).
   */
  copyFrom(other: Habit): void {
    this.color = other.color;
    this.description = other.description;
    this.frequency = other.frequency;
    this.isArchived = other.isArchived;
    this.name = other.name;
    this.position = other.position;
    this.question = other.question;
    this.reminder = other.reminder;
    this.targetType = other.targetType;
    this.targetValue = other.targetValue;
    this.type = other.type;
    this.unit = other.unit;
    this.uuid = other.uuid;
  }

  addEntry(entry: Entry): void {
    this.originalEntries.add(entry);
  }
}

export function newScoreList(): ScoreList {
  return new ScoreList();
}
export function newStreakList(): StreakList {
  return new StreakList();
}
export function newEntryList(): EntryList {
  return new EntryList();
}

export function buildHabit(fields: HabitFields = {}): Habit {
  return new Habit({
    ...fields,
    computedEntries: newEntryList(),
    originalEntries: newEntryList(),
    scores: newScoreList(),
    streaks: newStreakList(),
  });
}
