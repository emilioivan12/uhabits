import Dexie, { Table } from "dexie";

export interface HabitRecord {
  id: number;
  uuid: string;
  name: string;
  question: string;
  description: string;
  type: "YES_NO" | "NUMERICAL";
  frequencyNumerator: number;
  frequencyDenominator: number;
  color: number;
  isArchived: boolean;
  position: number;
  targetType: "AT_LEAST" | "AT_MOST";
  targetValue: number;
  unit: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  dirty: boolean;
}

export interface EntryRecord {
  habitId: number;
  timestamp: number;
  value: number;
  notes: string;
  updatedAt: number;
}

export interface PreferenceRecord {
  key: string;
  value: unknown;
}

export interface MetaRecord {
  key: string;
  value: unknown;
}

export class LoopWebDB extends Dexie {
  habits!: Table<HabitRecord, number>;
  entries!: Table<EntryRecord, [number, number]>;
  preferences!: Table<PreferenceRecord, string>;
  meta!: Table<MetaRecord, string>;

  constructor() {
    super("loop_habits_web");

    this.version(1).stores({
      habits: "id, uuid, position, isArchived, updatedAt, deletedAt, dirty",
      entries: "&[habitId+timestamp], habitId, timestamp, updatedAt",
      preferences: "&key",
      meta: "&key"
    });
  }
}

export const db = new LoopWebDB();
