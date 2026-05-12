// Ported from uhabits-core/.../commands/CreateHabitCommand.kt

import { Habit } from "../habit";
import { HabitList } from "../habitList";
import { ModelFactory } from "../modelFactory";
import { Command } from "./Command";

export class CreateHabitCommand implements Command {
  constructor(
    private readonly modelFactory: ModelFactory,
    private readonly habitList: HabitList,
    private readonly model: Habit,
  ) {}

  run(): void {
    const habit = this.modelFactory.buildHabit();
    habit.copyFrom(this.model);
    this.habitList.add(habit);
    habit.recompute();
  }
}
