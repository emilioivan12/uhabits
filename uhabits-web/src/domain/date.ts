export const DAY_LENGTH = 86_400_000;

export function getStartOfDay(timestamp: number): number {
  return Math.floor(timestamp / DAY_LENGTH) * DAY_LENGTH;
}

export function getStartOfDayWithOffset(
  timestamp: number,
  hourOffset = 0,
  minuteOffset = 0
): number {
  const offset = hourOffset * 3_600_000 + minuteOffset * 60_000;
  return getStartOfDay(timestamp - offset);
}

export function getTodayWithOffset(hourOffset = 0, minuteOffset = 0): number {
  return getStartOfDayWithOffset(Date.now(), hourOffset, minuteOffset);
}

export function plusDays(timestamp: number, days: number): number {
  return timestamp + days * DAY_LENGTH;
}

export function daysUntil(from: number, to: number): number {
  return Math.floor((to - from) / DAY_LENGTH);
}

export function weekdayFromTimestamp(timestamp: number): number {
  return new Date(timestamp).getUTCDay();
}
