import { describe, expect, it } from "vitest";
import { CommandRunner } from "./commandRunner";
import { Command } from "./commands";
import { RuntimeState } from "./models";

describe("CommandRunner", () => {
  it("runs commands sequentially", async () => {
    const runner = new CommandRunner();
    let state: RuntimeState = { habits: [], nextHabitId: 1 };

    const commandA: Command = {
      type: "A",
      async run(input) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { ...input, nextHabitId: input.nextHabitId + 1 };
      }
    };

    const commandB: Command = {
      type: "B",
      run(input) {
        return { ...input, nextHabitId: input.nextHabitId + 1 };
      }
    };

    await Promise.all([
      runner.run(commandA, () => state, (next) => {
        state = next;
      }),
      runner.run(commandB, () => state, (next) => {
        state = next;
      })
    ]);

    expect(state.nextHabitId).toBe(3);
  });
});
