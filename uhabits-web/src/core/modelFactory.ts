// Ported subset of uhabits-core/.../models/ModelFactory.kt and memory/MemoryModelFactory.kt.

import { Habit, HabitFields, buildHabit } from "./habit";
import { HabitList } from "./habitList";

export class ModelFactory {
  buildHabit(fields: HabitFields = {}): Habit {
    return buildHabit(fields);
  }

  buildHabitList(): HabitList {
    return new HabitList();
  }
}
