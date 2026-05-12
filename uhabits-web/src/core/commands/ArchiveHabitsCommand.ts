// Ported from uhabits-core/.../commands/ArchiveHabitsCommand.kt
// Stage 1 dormant.

import { Habit } from "../habit";
import { HabitList } from "../habitList";
import { Command } from "./Command";

export class ArchiveHabitsCommand implements Command {
  constructor(
    private readonly habitList: HabitList,
    private readonly selected: Habit[],
  ) {}

  run(): void {
    for (const h of this.selected) h.isArchived = true;
    this.habitList.update(this.selected);
  }
}
