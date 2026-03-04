import { Entry, ENTRY_SKIP, ENTRY_YES_MANUAL, Frequency, NumericalHabitType, Score } from "./models";
import { plusDays } from "./date";
import { getByInterval } from "./entryList";

export function computeScore(
  frequency: number,
  previousScore: number,
  checkmarkValue: number
): number {
  const multiplier = 0.5 ** (Math.sqrt(frequency) / 13.0);
  let score = previousScore * multiplier;
  score += checkmarkValue * (1 - multiplier);
  return score;
}

export function recomputeScores(params: {
  frequency: Frequency;
  isNumerical: boolean;
  numericalHabitType: NumericalHabitType;
  targetValue: number;
  computedEntries: Entry[];
  from: number;
  to: number;
}): Score[] {
  const {
    frequency,
    isNumerical,
    numericalHabitType,
    targetValue,
    computedEntries,
    from,
    to
  } = params;

  const result: Score[] = [];
  let rollingSum = 0;
  let numerator = frequency.numerator;
  let denominator = frequency.denominator;
  const freq = numerator / denominator;
  const values = getByInterval(computedEntries, from, to).map((entry) => entry.value);
  const isAtMost = numericalHabitType === "AT_MOST";

  if (!isNumerical && freq < 1.0) {
    numerator *= 2;
    denominator *= 2;
  }

  let previousValue = isNumerical && isAtMost ? 1.0 : 0.0;

  for (let i = 0; i < values.length; i += 1) {
    const offset = values.length - i - 1;

    if (isNumerical) {
      rollingSum += Math.max(0, values[offset]);
      if (offset + denominator < values.length) {
        rollingSum -= Math.max(0, values[offset + denominator]);
      }

      const normalizedRollingSum = rollingSum / 1000;
      if (values[offset] !== ENTRY_SKIP) {
        let percentageCompleted = 0;

        if (!isAtMost) {
          percentageCompleted = targetValue > 0 ? Math.min(1, normalizedRollingSum / targetValue) : 1;
        } else if (targetValue > 0) {
          percentageCompleted = Math.max(
            0,
            Math.min(1, 1 - (normalizedRollingSum - targetValue) / targetValue)
          );
        } else {
          percentageCompleted = normalizedRollingSum > 0 ? 0 : 1;
        }

        previousValue = computeScore(freq, previousValue, percentageCompleted);
      }
    } else {
      if (values[offset] === ENTRY_YES_MANUAL) {
        rollingSum += 1;
      }
      if (offset + denominator < values.length && values[offset + denominator] === ENTRY_YES_MANUAL) {
        rollingSum -= 1;
      }
      if (values[offset] !== ENTRY_SKIP) {
        const percentageCompleted = Math.min(1, rollingSum / numerator);
        previousValue = computeScore(freq, previousValue, percentageCompleted);
      }
    }

    result.push({
      timestamp: plusDays(from, i),
      value: previousValue
    });
  }

  return result.sort((a, b) => b.timestamp - a.timestamp);
}
