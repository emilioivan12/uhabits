import { beforeEach, describe, expect, it } from "vitest";
import { buildHabitFromDraft, RuntimeState } from "../domain/models";
import { recomputeHabit } from "../domain/habitLogic";
import { db } from "./db";
import { loadRuntimeState, saveRuntimeState } from "./repositories";

describe("persistence repositories", () => {
  beforeEach(async () => {
    await db.delete();
    db.open();
  });

  it("saves and loads runtime state", async () => {
    const habit = recomputeHabit(
      buildHabitFromDraft(1, 0, {
        name: "Hydrate",
        question: "Drink water",
        description: "",
        type: "YES_NO",
        frequency: { numerator: 1, denominator: 1 },
        color: 11,
        targetType: "AT_LEAST",
        targetValue: 1,
        unit: ""
      })
    );

    const state: RuntimeState = {
      habits: [habit],
      nextHabitId: 2
    };

    await saveRuntimeState(state);
    const loaded = await loadRuntimeState();

    expect(loaded.habits).toHaveLength(1);
    expect(loaded.habits[0].name).toBe("Hydrate");
    expect(loaded.nextHabitId).toBe(2);
  });
});
