// Ported from uhabits-core/src/jvmTest/.../models/TimestampTest.kt
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  Calendar,
  Timestamp,
  TruncateField,
  getToday,
  setFixedLocalTime,
} from "./timestamp";

const FIXED_LOCAL_TIME = 1422172800000; // 2015-01-25 08:00 UTC, mirrors BaseUnitTest

describe("Timestamp", () => {
  beforeEach(() => setFixedLocalTime(FIXED_LOCAL_TIME));
  afterEach(() => setFixedLocalTime(null));

  it("compares correctly", () => {
    const t1 = getToday();
    const t2 = t1.minus(1);
    const t3 = t1.plus(3);
    expect(t1.compareTo(t2)).toBeGreaterThan(0);
    expect(t1.compareTo(t1)).toBe(0);
    expect(t1.compareTo(t3)).toBeLessThan(0);
    expect(t1.isNewerThan(t2)).toBe(true);
    expect(t1.isNewerThan(t1)).toBe(false);
    expect(t2.isNewerThan(t1)).toBe(false);
    expect(t2.isOlderThan(t1)).toBe(true);
    expect(t1.isOlderThan(t2)).toBe(false);
  });

  it("computes daysUntil including negative values", () => {
    const t = getToday();
    expect(t.daysUntil(t)).toBe(0);
    expect(t.daysUntil(t.plus(1))).toBe(1);
    expect(t.daysUntil(t.plus(3))).toBe(3);
    expect(t.daysUntil(t.plus(300))).toBe(300);
    expect(t.daysUntil(t.minus(1))).toBe(-1);
    expect(t.daysUntil(t.minus(3))).toBe(-3);
    expect(t.daysUntil(t.minus(300))).toBe(-300);
  });

  it("truncates an inexact unix time down to start of day UTC", () => {
    const t = new Timestamp(1578054764000);
    expect(t.unixTime).toBe(1578009600000);
  });

  it("rejects negative unix time", () => {
    expect(() => new Timestamp(-1)).toThrow(/Invalid unix time/);
  });

  it("constructs from year/month/day in UTC", () => {
    const t = Timestamp.fromYMD(2014, Calendar.JUNE, 1);
    const d = t.toDate();
    expect(d.getUTCFullYear()).toBe(2014);
    expect(d.getUTCMonth()).toBe(Calendar.JUNE);
    expect(d.getUTCDate()).toBe(1);
  });

  it("returns Saturday=0 weekday matching JVM Timestamp.weekday", () => {
    // 2015-01-24 is a Saturday; FIXED_LOCAL_TIME is the next day (Sunday).
    expect(Timestamp.fromYMD(2015, Calendar.JANUARY, 24).weekday).toBe(0);
    expect(Timestamp.fromYMD(2015, Calendar.JANUARY, 25).weekday).toBe(1);
    expect(Timestamp.fromYMD(2015, Calendar.JANUARY, 30).weekday).toBe(6);
  });

  it("truncates to month / quarter / year with UTC arithmetic", () => {
    const ts = Timestamp.fromYMD(2014, Calendar.JUNE, 17);
    expect(
      ts
        .truncate(TruncateField.MONTH)
        .equals(Timestamp.fromYMD(2014, Calendar.JUNE, 1)),
    ).toBe(true);
    expect(
      ts
        .truncate(TruncateField.QUARTER)
        .equals(Timestamp.fromYMD(2014, Calendar.APRIL, 1)),
    ).toBe(true);
    expect(
      ts
        .truncate(TruncateField.YEAR)
        .equals(Timestamp.fromYMD(2014, Calendar.JANUARY, 1)),
    ).toBe(true);
  });

  it("Timestamp.oldest picks the older of two timestamps", () => {
    const a = Timestamp.fromYMD(2020, Calendar.MAY, 1);
    const b = Timestamp.fromYMD(2020, Calendar.JUNE, 1);
    expect(Timestamp.oldest(a, b)).toBe(a);
    expect(Timestamp.oldest(b, a)).toBe(a);
  });
});
