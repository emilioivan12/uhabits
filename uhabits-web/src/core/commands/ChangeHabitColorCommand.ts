// Ported from uhabits-core/.../commands/ChangeHabitColorCommand.kt
// Stage 1 dormant.

import { Habit } from "../habit";
import { HabitList } from "../habitList";
import { PaletteColor } from "../models";
import { Command } from "./Command";

export class ChangeHabitColorCommand implements Command {
  constructor(
    private readonly habitList: HabitList,
    private readonly selected: Habit[],
    private readonly newColor: PaletteColor,
  ) {}

  run(): void {
    for (const h of this.selected) h.color = this.newColor;
    this.habitList.update(this.selected);
  }
}
