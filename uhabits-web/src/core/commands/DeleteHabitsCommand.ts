// Ported from uhabits-core/.../commands/DeleteHabitsCommand.kt
// Stage 1 dormant: shipped but not yet wired into the UI.

import { Habit } from "../habit";
import { HabitList } from "../habitList";
import { Command } from "./Command";

export class DeleteHabitsCommand implements Command {
  constructor(
    private readonly habitList: HabitList,
    private readonly selected: Habit[],
  ) {}

  run(): void {
    for (const h of this.selected) this.habitList.remove(h);
  }
}
