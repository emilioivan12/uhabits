import { describe, expect, it } from "vitest";
import { computeScore } from "./score";

describe("score formula", () => {
  it("increases when checkmark value is high", () => {
    const initial = computeScore(1, 0, 1);
    const next = computeScore(1, initial, 1);
    expect(next).toBeGreaterThan(initial);
  });

  it("decays when checkmark value is low", () => {
    const dropped = computeScore(1, 0.8, 0);
    expect(dropped).toBeLessThan(0.8);
  });
});
