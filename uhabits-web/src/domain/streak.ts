import { Entry, ENTRY_UNKNOWN, NumericalHabitType, Streak } from "./models";
import { DAY_LENGTH } from "./date";
import { getByInterval } from "./entryList";

export function recomputeStreaks(params: {
  computedEntries: Entry[];
  from: number;
  to: number;
  isNumerical: boolean;
  targetValue: number;
  targetType: NumericalHabitType;
}): Streak[] {
  const { computedEntries, from, to, isNumerical, targetValue, targetType } = params;
  const list: Streak[] = [];

  const timestamps = getByInterval(computedEntries, from, to)
    .filter((entry) => {
      const value = entry.value;
      if (isNumerical) {
        if (targetType === "AT_LEAST") {
          return value / 1000 >= targetValue;
        }
        return value !== ENTRY_UNKNOWN && value / 1000 <= targetValue;
      }
      return value > 0;
    })
    .map((entry) => entry.timestamp);

  if (timestamps.length === 0) {
    return list;
  }

  let begin = timestamps[0];
  let end = timestamps[0];

  for (let i = 1; i < timestamps.length; i += 1) {
    const current = timestamps[i];
    if (current === begin - DAY_LENGTH) {
      begin = current;
    } else {
      list.push({
        start: begin,
        end,
        length: Math.floor((end - begin) / DAY_LENGTH) + 1
      });
      begin = current;
      end = current;
    }
  }

  list.push({
    start: begin,
    end,
    length: Math.floor((end - begin) / DAY_LENGTH) + 1
  });

  return list;
}

export function getBestStreaks(streaks: Streak[], limit: number): Streak[] {
  const longerSorted = [...streaks].sort((a, b) => {
    if (b.length !== a.length) {
      return b.length - a.length;
    }
    return b.end - a.end;
  });

  return longerSorted
    .slice(0, Math.min(longerSorted.length, limit))
    .sort((a, b) => b.end - a.end);
}
