import { describe, expect, it } from "vitest";
import { DAY_LENGTH } from "./date";
import { recomputeEntries } from "./entryList";
import { ENTRY_NO, ENTRY_YES_AUTO, ENTRY_YES_MANUAL } from "./models";

describe("entry recomputation", () => {
  it("builds yes_auto intervals for non-daily boolean habits", () => {
    const today = 1_728_000_000_000;
    const entries = [
      { timestamp: today, value: ENTRY_YES_MANUAL, notes: "" },
      { timestamp: today - DAY_LENGTH * 3, value: ENTRY_YES_MANUAL, notes: "" }
    ];

    const computed = recomputeEntries(entries, { numerator: 2, denominator: 7 }, false);
    const auto = computed.filter((entry) => entry.value === ENTRY_YES_AUTO);
    expect(auto.length).toBeGreaterThan(0);
  });

  it("keeps numerical entries untouched", () => {
    const entries = [{ timestamp: 1_000, value: 3000, notes: "n" }];
    const computed = recomputeEntries(entries, { numerator: 1, denominator: 1 }, true);
    expect(computed[0].value).toBe(3000);
  });

  it("preserves explicit NO values", () => {
    const today = 1_728_000_000_000;
    const entries = [{ timestamp: today, value: ENTRY_NO, notes: "" }];
    const computed = recomputeEntries(entries, { numerator: 1, denominator: 1 }, false);
    expect(computed[0].value).toBe(ENTRY_NO);
  });
});
