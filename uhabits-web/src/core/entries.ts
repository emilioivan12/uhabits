// Ported from uhabits-core/.../models/EntryList.kt

import { Entry, SKIP, UNKNOWN, YES_AUTO, YES_MANUAL } from "./entry";
import type { Frequency } from "./models";
import { Calendar, TruncateField, Timestamp } from "./timestamp";

export class Interval {
  constructor(
    readonly begin: Timestamp,
    readonly center: Timestamp,
    readonly end: Timestamp,
  ) {}

  get length(): number {
    return this.begin.daysUntil(this.end) + 1;
  }

  equals(other: Interval): boolean {
    return (
      this.begin.equals(other.begin) &&
      this.center.equals(other.center) &&
      this.end.equals(other.end)
    );
  }
}

export class EntryList {
  protected entries: Map<number, Entry> = new Map();

  get(timestamp: Timestamp): Entry {
    return (
      this.entries.get(timestamp.unixTime) ?? new Entry(timestamp, UNKNOWN)
    );
  }

  /**
   * Returns one entry per day in `[from, to]`, newest first.
   * Returns empty if `from` is newer than `to`.
   */
  getByInterval(from: Timestamp, to: Timestamp): Entry[] {
    const result: Entry[] = [];
    if (from.isNewerThan(to)) return result;
    let current = to;
    while (!current.isOlderThan(from)) {
      result.push(this.get(current));
      current = current.minus(1);
    }
    return result;
  }

  add(entry: Entry): void {
    this.entries.set(entry.timestamp.unixTime, entry);
  }

  /**
   * All known entries sorted by timestamp, newest first.
   */
  getKnown(): Entry[] {
    return [...this.entries.values()].sort(
      (a, b) => b.timestamp.unixTime - a.timestamp.unixTime,
    );
  }

  clear(): void {
    this.entries.clear();
  }

  /**
   * For boolean habits, fills in YES_AUTO entries based on the habit frequency.
   * For numerical habits, copies entries verbatim.
   */
  recomputeFrom(
    originalEntries: EntryList,
    frequency: Frequency,
    isNumerical: boolean,
  ): void {
    this.clear();
    const original = originalEntries.getKnown();
    if (isNumerical) {
      original.forEach((e) => this.add(e));
      return;
    }
    const intervals = buildIntervals(frequency, original);
    snapIntervalsTogether(intervals);
    const computed = buildEntriesFromInterval(original, intervals);
    computed
      .filter((e) => e.value !== UNKNOWN || e.notes.length > 0)
      .forEach((e) => this.add(e));
  }

  /**
   * Buckets entries by month-of-year × weekday. Mirrors EntryList.computeWeekdayFrequency.
   * The returned map is keyed by `Timestamp.unixTime` (start-of-month).
   */
  computeWeekdayFrequency(isNumerical: boolean): Map<number, number[]> {
    const out = new Map<number, number[]>();
    for (const entry of this.getKnown()) {
      const ts = entry.timestamp;
      const weekday = ts.weekday;
      const d = ts.toDate();
      const truncated = Timestamp.fromYMD(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        1,
      );
      let bucket = out.get(truncated.unixTime);
      if (!bucket) {
        bucket = [0, 0, 0, 0, 0, 0, 0];
        out.set(truncated.unixTime, bucket);
      }
      if (isNumerical) {
        bucket[weekday] += entry.value;
      } else if (entry.value === YES_MANUAL) {
        bucket[weekday] += 1;
      }
    }
    return out;
  }
}

/**
 * Mirrors EntryList.Companion.buildEntriesFromInterval.
 *
 * Walks the supplied intervals and, for any day inside an interval, marks the
 * entry as YES_AUTO unless the original list already has a stronger value.
 */
export function buildEntriesFromInterval(
  original: Entry[],
  intervals: Interval[],
): Entry[] {
  const result: Entry[] = [];
  if (original.length === 0) return result;

  let from = original[0].timestamp;
  let to = original[0].timestamp;

  for (const e of original) {
    if (e.timestamp.isOlderThan(from)) from = e.timestamp;
    if (e.timestamp.isNewerThan(to)) to = e.timestamp;
  }
  for (const interval of intervals) {
    if (interval.begin.isOlderThan(from)) from = interval.begin;
    if (interval.end.isNewerThan(to)) to = interval.end;
  }

  let current = to;
  while (!current.isOlderThan(from)) {
    result.push(new Entry(current, UNKNOWN));
    current = current.minus(1);
  }

  intervals.forEach((interval) => {
    let cur = interval.end;
    while (!cur.isOlderThan(interval.begin)) {
      const offset = cur.daysUntil(to);
      result[offset] = new Entry(cur, YES_AUTO);
      cur = cur.minus(1);
    }
  });

  original.forEach((entry) => {
    const offset = entry.timestamp.daysUntil(to);
    const existing = result[offset].value;
    const value =
      existing === UNKNOWN || entry.value === SKIP || entry.value === YES_MANUAL
        ? entry.value
        : YES_AUTO;
    result[offset] = new Entry(entry.timestamp, value, entry.notes);
  });

  return result;
}

/**
 * Mirrors EntryList.Companion.snapIntervalsTogether — slides the older
 * intervals towards the past to eliminate gaps and maximize streaks.
 *
 * Mutates the array in place to match the JVM API.
 */
export function snapIntervalsTogether(intervals: Interval[]): void {
  for (let i = 1; i < intervals.length; i++) {
    // Array is newest-first: intervals[i-1] is the newer interval, intervals[i] the older.
    const curr = intervals[i];
    const next = intervals[i - 1];
    const gapNextToCurrent = next.begin.daysUntil(curr.end);
    const gapCenterToEnd = curr.center.daysUntil(curr.end);
    if (gapNextToCurrent >= 0) {
      const shift = Math.min(gapCenterToEnd, gapNextToCurrent + 1);
      intervals[i] = new Interval(
        curr.begin.minus(shift),
        curr.center,
        curr.end.minus(shift),
      );
    }
  }
}

export function buildIntervals(freq: Frequency, entries: Entry[]): Interval[] {
  const filtered = entries.filter((e) => e.value === YES_MANUAL);
  const num = freq.numerator;
  const den = freq.denominator;
  const intervals: Interval[] = [];
  for (let i = num - 1; i < filtered.length; i++) {
    const begin = filtered[i].timestamp;
    const center = filtered[i - num + 1].timestamp;
    let size = den;
    if (den === 30 || den === 31) {
      const beginDate = begin.toDate();
      const beginMonthLength = monthLength(
        beginDate.getUTCFullYear(),
        beginDate.getUTCMonth(),
      );
      if (beginDate.getUTCDate() === beginMonthLength) {
        const next = new Date(
          Date.UTC(beginDate.getUTCFullYear(), beginDate.getUTCMonth() + 1, 1),
        );
        size = monthLength(next.getUTCFullYear(), next.getUTCMonth());
      } else {
        size = beginMonthLength;
      }
    }
    if (begin.daysUntil(center) < size) {
      const end = begin.plus(size - 1);
      intervals.push(new Interval(begin, center, end));
    }
  }
  return intervals;
}

function monthLength(year: number, monthZeroBased: number): number {
  return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate();
}

/**
 * Mirrors `List<Entry>.groupedSum` — buckets entries by truncated timestamp
 * and sums the (clamped) values. Numerical entries clamp negatives to 0; SKIP entries contribute 0 to
 * their bucket (not excluded). Boolean entries map YES_MANUAL → 1000 and
 * everything else → 0.
 */
export function groupedSum(
  entries: Entry[],
  truncateField: TruncateField,
  isNumerical: boolean,
  firstWeekday: number = Calendar.SATURDAY,
): Entry[] {
  const mapped = entries.map((e) => {
    if (isNumerical) {
      if (e.value === SKIP) return new Entry(e.timestamp, 0);
      return new Entry(e.timestamp, Math.max(0, e.value));
    }
    return new Entry(e.timestamp, e.value === YES_MANUAL ? 1000 : 0);
  });

  const buckets = new Map<number, { ts: Timestamp; sum: number }>();
  for (const e of mapped) {
    const truncated = e.timestamp.truncate(truncateField, firstWeekday);
    const key = truncated.unixTime;
    const existing = buckets.get(key);
    if (existing) {
      existing.sum += e.value;
    } else {
      buckets.set(key, { ts: truncated, sum: e.value });
    }
  }

  return [...buckets.values()]
    .map((b) => new Entry(b.ts, b.sum))
    .sort((a, b) => b.timestamp.unixTime - a.timestamp.unixTime);
}

/**
 * Mirrors `List<Entry>.countSkippedDays` — counts SKIP days within each bucket.
 */
export function countSkippedDays(
  entries: Entry[],
  truncateField: TruncateField,
  firstWeekday: number = Calendar.SATURDAY,
): Entry[] {
  const buckets = new Map<number, { ts: Timestamp; sum: number }>();
  for (const e of entries) {
    const v = e.value === SKIP ? 1 : 0;
    const truncated = e.timestamp.truncate(truncateField, firstWeekday);
    const key = truncated.unixTime;
    const existing = buckets.get(key);
    if (existing) {
      existing.sum += v;
    } else {
      buckets.set(key, { ts: truncated, sum: v });
    }
  }
  return [...buckets.values()]
    .map((b) => new Entry(b.ts, b.sum))
    .sort((a, b) => b.timestamp.unixTime - a.timestamp.unixTime);
}
