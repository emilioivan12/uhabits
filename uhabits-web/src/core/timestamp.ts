// Ported from uhabits-core/src/jvmMain/java/org/isoron/uhabits/core/models/Timestamp.kt
// and DateUtils.kt. Day index semantics: a Timestamp is a UTC midnight epoch in
// milliseconds, truncated down to a whole day (DAY_LENGTH = 86_400_000 ms).
// Equality is by unixTime; vitest's `toEqual` compares own enumerable fields.

export const DAY_LENGTH = 86_400_000;
const MILLIS_2000_01_01 = 946_684_800_000;

export class Timestamp {
  readonly unixTime: number;

  constructor(unixTime: number) {
    if (unixTime < 0) {
      throw new Error(`Invalid unix time: ${unixTime}`);
    }
    this.unixTime = Math.floor(unixTime / DAY_LENGTH) * DAY_LENGTH;
  }

  static readonly ZERO = new Timestamp(0);

  static fromYMD(year: number, monthZeroBased: number, day: number): Timestamp {
    return new Timestamp(Date.UTC(year, monthZeroBased, day));
  }

  static fromLocalDate(daysSince2000: number): Timestamp {
    return new Timestamp(MILLIS_2000_01_01 + daysSince2000 * DAY_LENGTH);
  }

  static oldest(a: Timestamp, b: Timestamp): Timestamp {
    return a.unixTime < b.unixTime ? a : b;
  }

  plus(days: number): Timestamp {
    return new Timestamp(this.unixTime + DAY_LENGTH * days);
  }

  minus(days: number): Timestamp {
    return this.plus(-days);
  }

  daysUntil(other: Timestamp): number {
    return Math.trunc((other.unixTime - this.unixTime) / DAY_LENGTH);
  }

  compareTo(other: Timestamp): number {
    return Math.sign(this.unixTime - other.unixTime);
  }

  isNewerThan(other: Timestamp): boolean {
    return this.compareTo(other) > 0;
  }

  isOlderThan(other: Timestamp): boolean {
    return this.compareTo(other) < 0;
  }

  equals(other: Timestamp): boolean {
    return this.unixTime === other.unixTime;
  }

  /**
   * Mirrors Kotlin Timestamp.weekday: Saturday=0, Sunday=1, …, Friday=6.
   * JS getUTCDay() is Sunday=0..Saturday=6, so we shift by +1 mod 7.
   */
  get weekday(): number {
    return (this.toDate().getUTCDay() + 1) % 7;
  }

  toDate(): Date {
    return new Date(this.unixTime);
  }

  toString(): string {
    const d = this.toDate();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
      d.getUTCDate(),
    )}`;
  }

  truncate(
    field: TruncateField,
    firstWeekday: number = Calendar.SATURDAY,
  ): Timestamp {
    return truncateTimestamp(field, this, firstWeekday);
  }
}

export enum TruncateField {
  DAY = "DAY",
  MONTH = "MONTH",
  WEEK_NUMBER = "WEEK_NUMBER",
  YEAR = "YEAR",
  QUARTER = "QUARTER",
}

/**
 * Mirrors java.util.Calendar weekday constants (Sunday=1..Saturday=7) so that
 * tests written against the JVM API translate without renumbering.
 */
export const Calendar = {
  JANUARY: 0,
  FEBRUARY: 1,
  MARCH: 2,
  APRIL: 3,
  MAY: 4,
  JUNE: 5,
  JULY: 6,
  AUGUST: 7,
  SEPTEMBER: 8,
  OCTOBER: 9,
  NOVEMBER: 10,
  DECEMBER: 11,
  SUNDAY: 1,
  MONDAY: 2,
  TUESDAY: 3,
  WEDNESDAY: 4,
  THURSDAY: 5,
  FRIDAY: 6,
  SATURDAY: 7,
} as const;

function dayOfWeekJavaStyle(d: Date): number {
  // JS getUTCDay: Sun=0..Sat=6 → Java Calendar.DAY_OF_WEEK: Sun=1..Sat=7.
  return d.getUTCDay() + 1;
}

function truncateTimestamp(
  field: TruncateField,
  ts: Timestamp,
  firstWeekday: number,
): Timestamp {
  const d = ts.toDate();
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  switch (field) {
    case TruncateField.DAY:
      return ts;
    case TruncateField.MONTH:
      return Timestamp.fromYMD(y, m, 1);
    case TruncateField.WEEK_NUMBER: {
      const weekDay = dayOfWeekJavaStyle(d);
      let delta = weekDay - firstWeekday;
      if (delta < 0) delta += 7;
      return new Timestamp(ts.unixTime - delta * DAY_LENGTH);
    }
    case TruncateField.QUARTER: {
      const quarter = Math.floor(m / 3);
      return Timestamp.fromYMD(y, quarter * 3, 1);
    }
    case TruncateField.YEAR:
      return Timestamp.fromYMD(y, Calendar.JANUARY, 1);
  }
}

let fixedLocalTime: number | null = null;
let startDayHourOffset = 0;
let startDayMinuteOffset = 0;

export function setFixedLocalTime(time: number | null): void {
  fixedLocalTime = time;
}

export function setStartDayOffset(hour: number, minute: number): void {
  startDayHourOffset = hour;
  startDayMinuteOffset = minute;
}

function getLocalTime(): number {
  return fixedLocalTime ?? Date.now();
}

function getStartOfDay(timestamp: number): number {
  return Math.floor(timestamp / DAY_LENGTH) * DAY_LENGTH;
}

function getStartOfDayWithOffset(timestamp: number): number {
  const offset =
    startDayHourOffset * 60 * 60 * 1000 + startDayMinuteOffset * 60 * 1000;
  return getStartOfDay(timestamp - offset);
}

export function getToday(): Timestamp {
  return new Timestamp(getStartOfDay(getLocalTime()));
}

export function getTodayWithOffset(): Timestamp {
  return new Timestamp(getStartOfDayWithOffset(getLocalTime()));
}
