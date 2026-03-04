import {
  Entry,
  ENTRY_SKIP,
  ENTRY_UNKNOWN,
  ENTRY_YES_AUTO,
  ENTRY_YES_MANUAL,
  Frequency
} from "./models";
import { DAY_LENGTH, daysUntil, plusDays } from "./date";

interface Interval {
  begin: number;
  center: number;
  end: number;
}

function sortByTimestampDesc(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => b.timestamp - a.timestamp);
}

function mapEntries(entries: Entry[]): Map<number, Entry> {
  const map = new Map<number, Entry>();
  for (const entry of entries) {
    map.set(entry.timestamp, entry);
  }
  return map;
}

export function getEntry(entries: Entry[], timestamp: number): Entry {
  return entries.find((e) => e.timestamp === timestamp) ?? {
    timestamp,
    value: ENTRY_UNKNOWN,
    notes: ""
  };
}

export function getByInterval(entries: Entry[], from: number, to: number): Entry[] {
  const map = mapEntries(entries);
  const result: Entry[] = [];
  if (from > to) {
    return result;
  }

  let current = to;
  while (current >= from) {
    result.push(
      map.get(current) ?? {
        timestamp: current,
        value: ENTRY_UNKNOWN,
        notes: ""
      }
    );
    current -= DAY_LENGTH;
  }

  return result;
}

function buildIntervals(frequency: Frequency, entries: Entry[]): Interval[] {
  const filtered = entries.filter((entry) => entry.value === ENTRY_YES_MANUAL);
  const num = frequency.numerator;
  const den = frequency.denominator;
  const intervals: Interval[] = [];

  for (let i = num - 1; i < filtered.length; i += 1) {
    const begin = filtered[i].timestamp;
    const center = filtered[i - num + 1].timestamp;
    if (daysUntil(begin, center) < den) {
      intervals.push({
        begin,
        center,
        end: plusDays(begin, den - 1)
      });
    }
  }

  return intervals;
}

function snapIntervalsTogether(intervals: Interval[]): Interval[] {
  const cloned = [...intervals];

  for (let i = 1; i < cloned.length; i += 1) {
    const current = cloned[i];
    const next = cloned[i - 1];
    const gapNextToCurrent = daysUntil(next.begin, current.end);
    const gapCenterToEnd = daysUntil(current.center, current.end);

    if (gapNextToCurrent >= 0) {
      const shift = Math.min(gapCenterToEnd, gapNextToCurrent + 1);
      cloned[i] = {
        begin: plusDays(current.begin, -shift),
        center: current.center,
        end: plusDays(current.end, -shift)
      };
    }
  }

  return cloned;
}

function buildEntriesFromIntervals(original: Entry[], intervals: Interval[]): Entry[] {
  if (original.length === 0) {
    return [];
  }

  let from = original[0].timestamp;
  let to = original[0].timestamp;

  for (const entry of original) {
    if (entry.timestamp < from) {
      from = entry.timestamp;
    }
    if (entry.timestamp > to) {
      to = entry.timestamp;
    }
  }

  for (const interval of intervals) {
    if (interval.begin < from) {
      from = interval.begin;
    }
    if (interval.end > to) {
      to = interval.end;
    }
  }

  const result: Entry[] = [];
  let current = to;
  while (current >= from) {
    result.push({ timestamp: current, value: ENTRY_UNKNOWN, notes: "" });
    current -= DAY_LENGTH;
  }

  for (const interval of intervals) {
    current = interval.end;
    while (current >= interval.begin) {
      const offset = daysUntil(current, to);
      result[offset] = {
        timestamp: current,
        value: ENTRY_YES_AUTO,
        notes: ""
      };
      current -= DAY_LENGTH;
    }
  }

  for (const entry of original) {
    const offset = daysUntil(entry.timestamp, to);
    const existing = result[offset];
    const value =
      existing.value === ENTRY_UNKNOWN ||
      entry.value === ENTRY_SKIP ||
      entry.value === ENTRY_YES_MANUAL
        ? entry.value
        : ENTRY_YES_AUTO;

    result[offset] = {
      timestamp: entry.timestamp,
      value,
      notes: entry.notes
    };
  }

  return result;
}

export function recomputeEntries(
  originalEntries: Entry[],
  frequency: Frequency,
  isNumerical: boolean
): Entry[] {
  const original = sortByTimestampDesc(originalEntries);

  if (isNumerical) {
    return original;
  }

  const intervals = snapIntervalsTogether(buildIntervals(frequency, original));
  return buildEntriesFromIntervals(original, intervals).filter(
    (entry) => entry.value !== ENTRY_UNKNOWN || entry.notes.length > 0
  );
}
