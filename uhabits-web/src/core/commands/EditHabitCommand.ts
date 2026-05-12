// Ported from uhabits-core/.../commands/EditHabitCommand.kt

import { Habit } from "../habit";
import { HabitList } from "../habitList";
import { Command } from "./Command";

export class HabitNotFoundError extends Error {
  constructor() {
    super("Habit not found");
    this.name = "HabitNotFoundError";
  }
}

export class EditHabitCommand implements Command {
  constructor(
    private readonly habitList: HabitList,
    private readonly habitId: number,
    private readonly modified: Habit,
  ) {}

  run(): void {
    const habit = this.habitList.getById(this.habitId);
    if (!habit) throw new HabitNotFoundError();
    habit.copyFrom(this.modified);
    this.habitList.update(habit);
    habit.recompute();
    habit.observable.notifyListeners();
    this.habitList.resort();
  }
}
