// Ported from uhabits-core/.../commands/UnarchiveHabitsCommand.kt
// Stage 1 dormant.

import { Habit } from "../habit";
import { HabitList } from "../habitList";
import { Command } from "./Command";

export class UnarchiveHabitsCommand implements Command {
  constructor(
    private readonly habitList: HabitList,
    private readonly selected: Habit[],
  ) {}

  run(): void {
    for (const h of this.selected) h.isArchived = false;
    this.habitList.update(this.selected);
  }
}
