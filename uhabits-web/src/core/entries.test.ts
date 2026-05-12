// Ported from uhabits-core/.../models/EntryListTest.kt

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  EntryList,
  Interval,
  buildEntriesFromInterval,
  buildIntervals,
  countSkippedDays,
  groupedSum,
  snapIntervalsTogether,
} from "./entries";
import { Entry, NO, SKIP, UNKNOWN, YES_AUTO, YES_MANUAL } from "./entry";
import { Frequency } from "./models";
import {
  Calendar,
  Timestamp,
  TruncateField,
  getToday,
  setFixedLocalTime,
} from "./timestamp";

const FIXED_LOCAL_TIME = 1422172800000;

describe("EntryList", () => {
  function day(offset: number): Timestamp {
    return getToday().minus(offset);
  }

  beforeEach(() => setFixedLocalTime(FIXED_LOCAL_TIME));
  afterEach(() => setFixedLocalTime(null));

  it("returns UNKNOWN for missing entries and supports add/replace/getKnown/getByInterval", () => {
    const entries = new EntryList();
    const today = getToday();

    expect(entries.get(today.minus(0))).toEqual(
      new Entry(today.minus(0), UNKNOWN),
    );
    expect(entries.get(today.minus(2))).toEqual(
      new Entry(today.minus(2), UNKNOWN),
    );
    expect(entries.get(today.minus(5))).toEqual(
      new Entry(today.minus(5), UNKNOWN),
    );

    entries.add(new Entry(today.minus(0), 10));
    entries.add(new Entry(today.minus(0), 15));
    entries.add(new Entry(today.minus(5), 20));
    entries.add(new Entry(today.minus(8), 30));

    expect(entries.get(today.minus(0))).toEqual(new Entry(today.minus(0), 15));
    expect(entries.get(today.minus(5))).toEqual(new Entry(today.minus(5), 20));
    expect(entries.get(today.minus(8))).toEqual(new Entry(today.minus(8), 30));

    const known = entries.getKnown();
    expect(known).toHaveLength(3);
    expect(known[0]).toEqual(new Entry(today.minus(0), 15));
    expect(known[1]).toEqual(new Entry(today.minus(5), 20));
    expect(known[2]).toEqual(new Entry(today.minus(8), 30));

    const actual = entries.getByInterval(today.minus(5), today);
    expect(actual).toHaveLength(6);
    expect(actual[0]).toEqual(new Entry(today.minus(0), 15));
    expect(actual[1]).toEqual(new Entry(today.minus(1), UNKNOWN));
    expect(actual[2]).toEqual(new Entry(today.minus(2), UNKNOWN));
    expect(actual[3]).toEqual(new Entry(today.minus(3), UNKNOWN));
    expect(actual[4]).toEqual(new Entry(today.minus(4), UNKNOWN));
    expect(actual[5]).toEqual(new Entry(today.minus(5), 20));
  });

  it("recomputeFrom (boolean) auto-fills YES_AUTO entries based on frequency", () => {
    const today = getToday();

    const original = new EntryList();
    original.add(new Entry(today.minus(4), YES_MANUAL));
    original.add(new Entry(today.minus(9), YES_MANUAL));
    original.add(new Entry(today.minus(10), YES_MANUAL));

    const computed = new EntryList();
    computed.recomputeFrom(original, new Frequency(1, 3), false);

    expect(computed.getKnown()).toEqual([
      new Entry(today.minus(2), YES_AUTO),
      new Entry(today.minus(3), YES_AUTO),
      new Entry(today.minus(4), YES_MANUAL),
      new Entry(today.minus(7), YES_AUTO),
      new Entry(today.minus(8), YES_AUTO),
      new Entry(today.minus(9), YES_MANUAL),
      new Entry(today.minus(10), YES_MANUAL),
      new Entry(today.minus(11), YES_AUTO),
      new Entry(today.minus(12), YES_AUTO),
    ]);

    // A second recompute against an empty list must clear everything.
    computed.recomputeFrom(new EntryList(), new Frequency(1, 3), false);
    expect(computed.getKnown()).toEqual([]);
  });

  it("recomputeFrom (numerical) copies entries verbatim", () => {
    const today = getToday();
    const original = new EntryList();
    original.add(new Entry(today.minus(4), 100));
    original.add(new Entry(today.minus(9), 200));
    original.add(new Entry(today.minus(10), 300));

    const computed = new EntryList();
    computed.recomputeFrom(original, Frequency.DAILY, true);

    expect(computed.getKnown()).toEqual([
      new Entry(today.minus(4), 100),
      new Entry(today.minus(9), 200),
      new Entry(today.minus(10), 300),
    ]);
  });

  it("groupedSum (numerical) buckets by month / quarter / year", () => {
    const offsets = [
      0, 5, 9, 15, 17, 21, 23, 27, 28, 35, 41, 45, 47, 53, 56, 62, 70, 73, 78,
      83, 86, 94, 101, 106, 113, 114, 120, 126, 130, 133, 141, 143, 148, 151,
      157, 164, 166, 171, 173, 176, 179, 183, 191, 259, 264, 268, 270, 275, 282,
      284, 289, 295, 302, 306, 310, 315, 323, 325, 328, 335, 343, 349, 351, 353,
      357, 359, 360, 367, 372, 376, 380, 385, 393, 400, 404, 412, 415, 418, 422,
      425, 433, 437, 444, 449, 455, 460, 462, 465, 470, 471, 479, 481, 485, 489,
      494, 495, 500, 501, 503, 507,
    ];
    const values = [
      230, 306, 148, 281, 134, 285, 104, 158, 325, 236, 303, 210, 118, 124, 301,
      201, 156, 376, 347, 367, 396, 134, 160, 381, 155, 354, 231, 134, 164, 354,
      236, 398, 199, 221, 208, 397, 253, 276, 214, 341, 299, 221, 353, 250, 341,
      168, 374, 205, 182, 217, 297, 321, 104, 237, 294, 110, 136, 229, 102, 271,
      250, 294, 158, 319, 379, 126, 282, 155, 288, 159, 215, 247, 207, 226, 244,
      158, 371, 219, 272, 228, 350, 153, 356, 279, 394, 202, 213, 214, 112, 248,
      139, 245, 165, 256, 370, 187, 208, 231, 341, 312,
    ];

    const reference = Timestamp.fromYMD(2014, Calendar.JUNE, 1);
    const entries = new EntryList();
    offsets.forEach((off, i) => {
      entries.add(new Entry(reference.minus(off), values[i]));
    });

    const byMonth = groupedSum(entries.getKnown(), TruncateField.MONTH, true);
    expect(byMonth).toHaveLength(17);
    expect(byMonth[0]).toEqual(
      new Entry(Timestamp.fromYMD(2014, Calendar.JUNE, 1), 230),
    );
    expect(byMonth[6]).toEqual(
      new Entry(Timestamp.fromYMD(2013, Calendar.DECEMBER, 1), 1988),
    );
    expect(byMonth[12]).toEqual(
      new Entry(Timestamp.fromYMD(2013, Calendar.MAY, 1), 1271),
    );

    const byQuarter = groupedSum(
      entries.getKnown(),
      TruncateField.QUARTER,
      true,
    );
    expect(byQuarter).toHaveLength(6);
    expect(byQuarter[0]).toEqual(
      new Entry(Timestamp.fromYMD(2014, Calendar.APRIL, 1), 3263),
    );
    expect(byQuarter[3]).toEqual(
      new Entry(Timestamp.fromYMD(2013, Calendar.JULY, 1), 3838),
    );
    expect(byQuarter[5]).toEqual(
      new Entry(Timestamp.fromYMD(2013, Calendar.JANUARY, 1), 4975),
    );

    const byYear = groupedSum(entries.getKnown(), TruncateField.YEAR, true);
    expect(byYear).toHaveLength(2);
    expect(byYear[0]).toEqual(
      new Entry(Timestamp.fromYMD(2014, Calendar.JANUARY, 1), 8227),
    );
    expect(byYear[1]).toEqual(
      new Entry(Timestamp.fromYMD(2013, Calendar.JANUARY, 1), 16172),
    );
  });

  it("groupedSum (boolean) maps YES_MANUAL → 1000 then sums", () => {
    const offsets = [
      0, 5, 9, 15, 17, 21, 23, 27, 28, 35, 41, 45, 47, 53, 56, 62, 70, 73, 78,
      83, 86, 94, 101, 106, 113, 114, 120, 126, 130, 133, 141, 143, 148, 151,
      157, 164, 166, 171, 173, 176, 179, 183, 191, 259, 264, 268, 270, 275, 282,
      284, 289, 295, 302, 306, 310, 315, 323, 325, 328, 335, 343, 349, 351, 353,
      357, 359, 360, 367, 372, 376, 380, 385, 393, 400, 404, 412, 415, 418, 422,
      425, 433, 437, 444, 449, 455, 460, 462, 465, 470, 471, 479, 481, 485, 489,
      494, 495, 500, 501, 503, 507,
    ];
    const reference = Timestamp.fromYMD(2014, Calendar.JUNE, 1);
    const entries = new EntryList();
    offsets.forEach((off) => {
      entries.add(new Entry(reference.minus(off), YES_MANUAL));
    });

    const byMonth = groupedSum(entries.getKnown(), TruncateField.MONTH, false);
    expect(byMonth).toHaveLength(17);
    expect(byMonth[0]).toEqual(
      new Entry(Timestamp.fromYMD(2014, Calendar.JUNE, 1), 1_000),
    );
    expect(byMonth[6]).toEqual(
      new Entry(Timestamp.fromYMD(2013, Calendar.DECEMBER, 1), 7_000),
    );
    expect(byMonth[12]).toEqual(
      new Entry(Timestamp.fromYMD(2013, Calendar.MAY, 1), 6_000),
    );

    const byQuarter = groupedSum(
      entries.getKnown(),
      TruncateField.QUARTER,
      false,
    );
    expect(byQuarter).toHaveLength(6);
    expect(byQuarter[0]).toEqual(
      new Entry(Timestamp.fromYMD(2014, Calendar.APRIL, 1), 15_000),
    );
    expect(byQuarter[3]).toEqual(
      new Entry(Timestamp.fromYMD(2013, Calendar.JULY, 1), 17_000),
    );
    expect(byQuarter[5]).toEqual(
      new Entry(Timestamp.fromYMD(2013, Calendar.JANUARY, 1), 20_000),
    );

    const byYear = groupedSum(entries.getKnown(), TruncateField.YEAR, false);
    expect(byYear).toHaveLength(2);
    expect(byYear[0]).toEqual(
      new Entry(Timestamp.fromYMD(2014, Calendar.JANUARY, 1), 34_000),
    );
    expect(byYear[1]).toEqual(
      new Entry(Timestamp.fromYMD(2013, Calendar.JANUARY, 1), 66_000),
    );
  });

  it("groupedSum (numerical) maps SKIP entries to 0", () => {
    // SKIP is non-obvious: it contributes 0 to its bucket rather than being
    // excluded. Using absolute dates makes the same-month assumption explicit.
    const ref = Timestamp.fromYMD(2024, Calendar.MARCH, 15);
    const entries = [
      new Entry(ref, 500),
      new Entry(ref.minus(1), SKIP),
      new Entry(ref.minus(2), 300),
    ];
    const result = groupedSum(entries, TruncateField.MONTH, true);
    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toEqual(
      Timestamp.fromYMD(2024, Calendar.MARCH, 1),
    );
    expect(result[0].value).toBe(800); // 500 + 0 (SKIP→0) + 300
  });

  it("groupedSum (numerical) SKIP-only bucket produces a zero entry, not empty", () => {
    const ref = Timestamp.fromYMD(2024, Calendar.MARCH, 15);
    const result = groupedSum(
      [new Entry(ref, SKIP)],
      TruncateField.MONTH,
      true,
    );
    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toEqual(
      Timestamp.fromYMD(2024, Calendar.MARCH, 1),
    );
    expect(result[0].value).toBe(0);
  });

  it("groupedSum (boolean) SKIP entries contribute 0 to the bucket", () => {
    const ref = Timestamp.fromYMD(2024, Calendar.MARCH, 15);
    const entries = [
      new Entry(ref, YES_MANUAL),
      new Entry(ref.minus(1), SKIP),
      new Entry(ref.minus(2), YES_MANUAL),
    ];
    const result = groupedSum(entries, TruncateField.MONTH, false);
    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toEqual(
      Timestamp.fromYMD(2024, Calendar.MARCH, 1),
    );
    expect(result[0].value).toBe(2000); // 1000 + 0 (SKIP→0) + 1000
  });

  it("countSkippedDays counts SKIP entries per bucket and ignores non-SKIP", () => {
    const ref = Timestamp.fromYMD(2024, Calendar.MARCH, 15);
    const entries = [
      new Entry(ref, SKIP),
      new Entry(ref.minus(1), YES_MANUAL),
      new Entry(ref.minus(2), SKIP),
      new Entry(ref.minus(3), NO),
    ];
    const result = countSkippedDays(entries, TruncateField.MONTH);
    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toEqual(
      Timestamp.fromYMD(2024, Calendar.MARCH, 1),
    );
    expect(result[0].value).toBe(2);
  });

  it("buildEntriesFromInterval marks intervals YES_AUTO and preserves originals", () => {
    const entries = [
      new Entry(day(1), YES_MANUAL),
      new Entry(day(2), NO, "Test"),
      new Entry(day(4), NO),
      new Entry(day(5), YES_MANUAL),
      new Entry(day(10), YES_MANUAL),
      new Entry(day(11), NO),
    ];
    const intervals = [
      new Interval(day(2), day(2), day(1)),
      new Interval(day(6), day(5), day(4)),
      new Interval(day(10), day(8), day(8)),
    ];
    const expected = [
      new Entry(day(1), YES_MANUAL),
      new Entry(day(2), YES_AUTO, "Test"),
      new Entry(day(3), UNKNOWN),
      new Entry(day(4), YES_AUTO),
      new Entry(day(5), YES_MANUAL),
      new Entry(day(6), YES_AUTO),
      new Entry(day(7), UNKNOWN),
      new Entry(day(8), YES_AUTO),
      new Entry(day(9), YES_AUTO),
      new Entry(day(10), YES_MANUAL),
      new Entry(day(11), NO),
    ];
    expect(buildEntriesFromInterval(entries, intervals)).toEqual(expected);
  });

  it("snapIntervalsTogether — case 1", () => {
    const original = [
      new Interval(day(8), day(8), day(2)),
      new Interval(day(12), day(12), day(6)),
      new Interval(day(20), day(20), day(14)),
      new Interval(day(27), day(27), day(21)),
    ];
    const expected = [
      new Interval(day(8), day(8), day(2)),
      new Interval(day(15), day(12), day(9)),
      new Interval(day(22), day(20), day(16)),
      new Interval(day(29), day(27), day(23)),
    ];
    snapIntervalsTogether(original);
    expect(original).toEqual(expected);
  });

  it("snapIntervalsTogether — case 2", () => {
    const original = [
      new Interval(day(6), day(4), day(0)),
      new Interval(day(11), day(8), day(5)),
    ];
    const expected = [
      new Interval(day(6), day(4), day(0)),
      new Interval(day(13), day(8), day(7)),
    ];
    snapIntervalsTogether(original);
    expect(original).toEqual(expected);
  });

  it("buildIntervals — weekly", () => {
    const entries = [
      new Entry(day(8), YES_MANUAL),
      new Entry(day(18), YES_MANUAL),
      new Entry(day(23), YES_MANUAL),
    ];
    expect(buildIntervals(Frequency.WEEKLY, entries)).toEqual([
      new Interval(day(8), day(8), day(2)),
      new Interval(day(18), day(18), day(12)),
      new Interval(day(23), day(23), day(17)),
    ]);
  });

  it("buildIntervals — daily", () => {
    const entries = [
      new Entry(day(8), YES_MANUAL),
      new Entry(day(18), YES_MANUAL),
      new Entry(day(23), YES_MANUAL),
    ];
    expect(buildIntervals(Frequency.DAILY, entries)).toEqual([
      new Interval(day(8), day(8), day(8)),
      new Interval(day(18), day(18), day(18)),
      new Interval(day(23), day(23), day(23)),
    ]);
  });

  it("buildIntervals — two times per week with denser data", () => {
    const entries = [
      new Entry(day(8), YES_MANUAL),
      new Entry(day(15), YES_MANUAL),
      new Entry(day(18), YES_MANUAL),
      new Entry(day(22), YES_MANUAL),
      new Entry(day(23), YES_MANUAL),
    ];
    expect(buildIntervals(Frequency.TWO_TIMES_PER_WEEK, entries)).toEqual([
      new Interval(day(18), day(15), day(12)),
      new Interval(day(22), day(18), day(16)),
      new Interval(day(23), day(22), day(17)),
    ]);
  });

  it("buildIntervals — SKIP entries are filtered out", () => {
    const entries = [
      new Entry(day(10), YES_MANUAL),
      new Entry(day(20), SKIP),
      new Entry(day(30), YES_MANUAL),
    ];
    expect(buildIntervals(new Frequency(1, 3), entries)).toEqual([
      new Interval(day(10), day(10), day(8)),
      new Interval(day(30), day(30), day(28)),
    ]);
  });

  it("computeWeekdayFrequency tallies counts per month × weekday", () => {
    // Deterministic LCG (Knuth/Numerical Recipes) for reproducible per-month
    // counts. Does not match the JVM Random sequence; expected values were
    // derived from this JS implementation.
    const entries = new EntryList();
    let state = 123 >>> 0;
    const nextBool = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return (state & 1) === 1;
    };

    const weekdayCount = Array.from({ length: 12 }, () => [
      0, 0, 0, 0, 0, 0, 0,
    ]);
    const monthCount = new Array<number>(12).fill(0);

    let current = Timestamp.fromYMD(2015, Calendar.JANUARY, 1);
    for (let i = 0; i <= 364; i++) {
      const include = nextBool();
      const d = current.toDate();
      const month = d.getUTCMonth();
      const week = current.weekday;

      if (include && month !== Calendar.MARCH) {
        entries.add(new Entry(current, YES_MANUAL));
        weekdayCount[month][week]++;
        monthCount[month]++;
      }
      current = current.plus(1);
    }

    const freq = entries.computeWeekdayFrequency(false);

    for (let month = 0; month < 12; month++) {
      const ts = Timestamp.fromYMD(2015, month, 1);
      const actual = freq.get(ts.unixTime);
      if (monthCount[month] === 0) {
        expect(actual).toBeUndefined();
      } else {
        expect(actual).toEqual(weekdayCount[month]);
      }
    }
  });
});
