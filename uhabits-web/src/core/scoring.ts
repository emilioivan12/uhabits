// Ported from uhabits-core/.../models/{Score,ScoreList}.kt

import { SKIP, YES_MANUAL } from "./entry";
import type { EntryList } from "./entries";
import type { Frequency } from "./models";
import { NumericalHabitType } from "./models";
import { Timestamp } from "./timestamp";

export class Score {
  constructor(
    readonly timestamp: Timestamp,
    readonly value: number,
  ) {}

  /**
   * Exponential moving average of the daily completion fraction.
   * Source: Score.compute in Score.kt — must be byte-equivalent.
   * @param frequency - ratio numerator/denominator, e.g. 3/7 ≈ 0.429 for 3×/week. Range (0, 1].
   */
  static compute(
    frequency: number,
    previousScore: number,
    checkmarkValue: number,
  ): number {
    // 13.0 is a tuning constant controlling convergence rate (≈days to reach 99% at daily frequency).
    const multiplier = Math.pow(0.5, Math.sqrt(frequency) / 13.0);
    let score = previousScore * multiplier;
    score += checkmarkValue * (1 - multiplier);
    return score;
  }
}

export class ScoreList {
  private readonly map = new Map<number, Score>();

  get(timestamp: Timestamp): Score {
    return this.map.get(timestamp.unixTime) ?? new Score(timestamp, 0);
  }

  /**
   * Returns scores for each day in `[fromTimestamp, toTimestamp]`, newest first.
   */
  getByInterval(fromTimestamp: Timestamp, toTimestamp: Timestamp): Score[] {
    const result: Score[] = [];
    if (fromTimestamp.isNewerThan(toTimestamp)) return result;
    let current = toTimestamp;
    while (!current.isOlderThan(fromTimestamp)) {
      result.push(this.get(current));
      current = current.minus(1);
    }
    return result;
  }

  recompute(args: {
    frequency: Frequency;
    isNumerical: boolean;
    numericalHabitType: NumericalHabitType;
    targetValue: number;
    computedEntries: EntryList;
    from: Timestamp;
    to: Timestamp;
  }): void {
    const {
      frequency,
      isNumerical,
      numericalHabitType,
      targetValue,
      computedEntries,
      from,
      to,
    } = args;

    this.map.clear();
    let rollingSum = 0;
    let numerator = frequency.numerator; // local copy — does not mutate frequency
    let denominator = frequency.denominator; // local copy
    const freq = frequency.toDouble();
    const values = computedEntries.getByInterval(from, to).map((e) => e.value);
    const isAtMost = numericalHabitType === NumericalHabitType.AT_MOST;

    // Smooth out irregular weekly schedules for non-daily boolean habits.
    if (!isNumerical && freq < 1.0) {
      numerator *= 2;
      denominator *= 2;
    }

    let previousValue = isNumerical && isAtMost ? 1.0 : 0.0;
    for (let i = 0; i < values.length; i++) {
      // i counts oldest→newest; offset indexes the newest-first values array in reverse.
      const offset = values.length - i - 1;
      if (isNumerical) {
        // Deliberate improvement over Kotlin's ScoreList.recompute: Kotlin lets
        // SKIP (value=3) accumulate into rollingSum, producing a ~0.003 phantom
        // contribution per SKIP day. We exclude SKIP from the rolling window to
        // keep the sum clean. Both the add and subtract paths are guarded
        // symmetrically to prevent drift.
        if (values[offset] !== SKIP) {
          rollingSum += Math.max(0, values[offset]);
        }
        if (
          offset + denominator < values.length &&
          values[offset + denominator] !== SKIP
        ) {
          rollingSum -= Math.max(0, values[offset + denominator]);
        }

        // Entry values are stored in thousandths of the user-visible unit.
        const normalizedRollingSum = rollingSum / 1000;
        if (values[offset] !== SKIP) {
          let pct: number;
          if (!isAtMost) {
            pct =
              targetValue > 0
                ? Math.min(1.0, normalizedRollingSum / targetValue)
                : 1.0;
          } else if (targetValue > 0) {
            pct = clamp(
              1 - (normalizedRollingSum - targetValue) / targetValue,
              0.0,
              1.0,
            );
          } else {
            pct = normalizedRollingSum > 0 ? 0.0 : 1.0;
          }
          previousValue = Score.compute(freq, previousValue, pct);
        }
      } else {
        if (values[offset] === YES_MANUAL) rollingSum += 1.0;
        if (offset + denominator < values.length) {
          if (values[offset + denominator] === YES_MANUAL) rollingSum -= 1.0;
        }
        if (values[offset] !== SKIP) {
          const pct = Math.min(1.0, rollingSum / numerator);
          previousValue = Score.compute(freq, previousValue, pct);
        }
      }
      const ts = from.plus(i);
      this.map.set(ts.unixTime, new Score(ts, previousValue));
    }
  }
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}
