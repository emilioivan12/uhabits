// Ported from uhabits-core/.../models/{Streak,StreakList}.kt

import { UNKNOWN } from "./entry";
import type { EntryList } from "./entries";
import { NumericalHabitType } from "./models";
import { Timestamp } from "./timestamp";

export class Streak {
  constructor(
    readonly start: Timestamp,
    readonly end: Timestamp,
  ) {}

  get length(): number {
    return this.start.daysUntil(this.end) + 1;
  }

  // Returns positive if this streak is longer (or same length but newer).
  // Callers must invert: use (a, b) => b.compareLonger(a) to sort descending.
  compareLonger(other: Streak): number {
    if (this.length !== other.length) {
      return Math.sign(this.length - other.length);
    }
    return this.compareNewer(other);
  }

  compareNewer(other: Streak): number {
    return this.end.compareTo(other.end);
  }
}

export class StreakList {
  private list: Streak[] = [];

  /**
   * Returns the `limit` longest streaks, sorted by end date (newest first).
   */
  getBest(limit: number): Streak[] {
    // Sort descending (longest first, ties: newest first) — matches Kotlin's
    // sortedByDescending { it.length }. Ascending + slice-from-end is
    // equivalent for distinct lengths but misorders tied-length streaks.
    // Unlike Kotlin's sortWith (which mutates this.list), we sort a copy to
    // avoid leaving the internal list in a different order after each call.
    // This is safe as long as recompute() is the only writer of this.list —
    // an incremental add() method would require re-evaluating this approach.
    const sortedByLength = [...this.list].sort((a, b) => b.compareLonger(a));
    const top = sortedByLength.slice(0, limit);
    return top.sort((a, b) => b.compareNewer(a));
  }

  recompute(args: {
    computedEntries: EntryList;
    from: Timestamp;
    to: Timestamp;
    isNumerical: boolean;
    targetValue: number;
    targetType: NumericalHabitType;
  }): void {
    const { computedEntries, from, to, isNumerical, targetValue, targetType } =
      args;
    this.list = [];

    // getByInterval returns timestamps newest-first; consecutive-day detection
    // below relies on this ordering (each step checks begin.minus(1)).
    const timestamps = computedEntries
      .getByInterval(from, to)
      .filter((e) => {
        const v = e.value;
        if (isNumerical) {
          if (targetType === NumericalHabitType.AT_LEAST) {
            // UNKNOWN (-1) is not excluded here; -1/1000 ≈ 0 passes for positive
            // targets. Matches Kotlin's StreakList.recompute exactly.
            return v / 1000 >= targetValue;
          }
          return v !== UNKNOWN && v / 1000 <= targetValue;
        }
        return v > 0;
      })
      .map((e) => e.timestamp);

    if (timestamps.length === 0) return;

    let begin = timestamps[0];
    let end = timestamps[0];
    for (let i = 1; i < timestamps.length; i++) {
      const current = timestamps[i];
      if (current.equals(begin.minus(1))) {
        begin = current;
      } else {
        this.list.push(new Streak(begin, end));
        begin = current;
        end = current;
      }
    }
    this.list.push(new Streak(begin, end));
  }
}
