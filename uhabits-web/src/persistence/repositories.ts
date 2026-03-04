import { db, EntryRecord, HabitRecord } from "./db";
import {
  DEFAULT_PREFERENCES,
  Entry,
  Habit,
  PreferencesState,
  RuntimeState
} from "../domain/models";
import { recomputeHabit } from "../domain/habitLogic";

function toHabitRecord(habit: Habit): HabitRecord {
  return {
    id: habit.id,
    uuid: habit.uuid,
    name: habit.name,
    question: habit.question,
    description: habit.description,
    type: habit.type,
    frequencyNumerator: habit.frequency.numerator,
    frequencyDenominator: habit.frequency.denominator,
    color: habit.color,
    isArchived: habit.isArchived,
    position: habit.position,
    targetType: habit.targetType,
    targetValue: habit.targetValue,
    unit: habit.unit,
    createdAt: habit.createdAt,
    updatedAt: habit.updatedAt,
    deletedAt: habit.deletedAt,
    dirty: habit.dirty
  };
}

function toEntryRecords(habit: Habit): EntryRecord[] {
  return habit.originalEntries.map((entry) => ({
    habitId: habit.id,
    timestamp: entry.timestamp,
    value: entry.value,
    notes: entry.notes,
    updatedAt: habit.updatedAt
  }));
}

function fromRecord(record: HabitRecord, entries: Entry[]): Habit {
  return recomputeHabit({
    id: record.id,
    uuid: record.uuid,
    name: record.name,
    question: record.question,
    description: record.description,
    type: record.type,
    frequency: {
      numerator: record.frequencyNumerator,
      denominator: record.frequencyDenominator
    },
    color: record.color,
    isArchived: record.isArchived,
    position: record.position,
    reminder: null,
    targetType: record.targetType,
    targetValue: record.targetValue,
    unit: record.unit,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
    dirty: record.dirty,
    originalEntries: entries,
    computedEntries: [],
    scores: [],
    streaks: []
  });
}

export async function loadRuntimeState(): Promise<RuntimeState> {
  const [habitRecords, entryRecords] = await Promise.all([
    db.habits.orderBy("position").toArray(),
    db.entries.toArray()
  ]);

  const grouped = new Map<number, Entry[]>();
  for (const entry of entryRecords) {
    const list = grouped.get(entry.habitId) ?? [];
    list.push({
      timestamp: entry.timestamp,
      value: entry.value,
      notes: entry.notes
    });
    grouped.set(entry.habitId, list);
  }

  const habits = habitRecords.map((record) => {
    const entries = (grouped.get(record.id) ?? []).sort((a, b) => b.timestamp - a.timestamp);
    return fromRecord(record, entries);
  });

  const maxId = habits.reduce((max, habit) => Math.max(max, habit.id), 0);

  return {
    habits,
    nextHabitId: maxId + 1
  };
}

export async function saveRuntimeState(state: RuntimeState): Promise<void> {
  const habitRecords = state.habits.map(toHabitRecord);
  const entryRecords = state.habits.flatMap((habit) => toEntryRecords(habit));

  await db.transaction("rw", db.habits, db.entries, async () => {
    await db.habits.clear();
    await db.entries.clear();
    if (habitRecords.length > 0) {
      await db.habits.bulkPut(habitRecords);
    }
    if (entryRecords.length > 0) {
      await db.entries.bulkPut(entryRecords);
    }
  });
}

export async function loadPreferences(): Promise<PreferencesState> {
  const rows = await db.preferences.toArray();
  if (rows.length === 0) {
    return DEFAULT_PREFERENCES;
  }

  const prefs = { ...DEFAULT_PREFERENCES };
  for (const row of rows) {
    if (row.key in prefs) {
      (prefs as Record<string, unknown>)[row.key] = row.value;
    }
  }
  return prefs;
}

export async function savePreferences(preferences: PreferencesState): Promise<void> {
  const entries = Object.entries(preferences).map(([key, value]) => ({ key, value }));
  await db.preferences.bulkPut(entries);
}
