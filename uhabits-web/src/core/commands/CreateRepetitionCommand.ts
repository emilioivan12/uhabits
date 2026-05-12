// Ported from uhabits-core/.../commands/CreateRepetitionCommand.kt

import { Habit } from "../habit";
import { HabitList } from "../habitList";
import { Entry } from "../entry";
import { Timestamp } from "../timestamp";
import { Command } from "./Command";

export class CreateRepetitionCommand implements Command {
  constructor(
    private readonly habitList: HabitList,
    private readonly habit: Habit,
    private readonly timestamp: Timestamp,
    private readonly value: number,
    private readonly notes: string = "",
  ) {}

  run(): void {
    this.habit.originalEntries.add(
      new Entry(this.timestamp, this.value, this.notes),
    );
    this.habit.recompute();
    this.habitList.resort();
  }
}
