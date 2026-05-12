// Ported subset of uhabits-core/.../models/HabitList.kt + memory/MemoryHabitList.kt.
// Stage 1 only ships an in-memory list with the operations the commands need.

import { Habit } from "./habit";
import { ModelObservable } from "./observable";

export class HabitList {
  readonly observable = new ModelObservable();
  private habits: Habit[] = [];
  private nextId = 1;

  get isEmpty(): boolean {
    return this.habits.length === 0;
  }

  size(): number {
    return this.habits.length;
  }

  add(habit: Habit): void {
    if (habit.id === null || habit.id === undefined) {
      habit.id = this.nextId++;
    } else if (this.habits.some((h) => h.id === habit.id)) {
      throw new Error(`Habit with id ${habit.id} already in the list`);
    } else {
      this.nextId = Math.max(this.nextId, habit.id + 1);
    }
    this.habits.push(habit);
    this.observable.notifyListeners();
  }

  getById(id: number): Habit | null {
    return this.habits.find((h) => h.id === id) ?? null;
  }

  /**
   * Returns null if `uuid` is null (habit has no UUID yet), or if no habit
   * with the given UUID exists in this list.
   */
  getByUuid(uuid: string | null): Habit | null {
    if (uuid === null) return null;
    return this.habits.find((h) => h.uuid === uuid) ?? null;
  }

  getByPosition(position: number): Habit {
    if (position < 0 || position >= this.habits.length) {
      throw new RangeError(`position out of bounds: ${position}`);
    }
    return this.habits[position];
  }

  indexOf(habit: Habit): number {
    return this.habits.indexOf(habit);
  }

  remove(habit: Habit): void {
    const idx = this.habits.indexOf(habit);
    if (idx !== -1) {
      this.habits.splice(idx, 1);
      this.observable.notifyListeners();
    }
  }

  removeAll(): void {
    if (this.habits.length === 0) return;
    this.habits = [];
    this.observable.notifyListeners();
  }

  update(_habits: Habit[] | Habit): void {
    // In-memory list: nothing to flush. SQLite implementation would persist here.
    this.observable.notifyListeners();
  }

  resort(): void {
    // In-memory Stage 1 list: positions are already in insertion order.
  }

  *[Symbol.iterator](): Iterator<Habit> {
    for (const h of [...this.habits]) yield h;
  }
}
