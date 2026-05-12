// Ported from uhabits-core/.../commands/CommandRunner.kt
// Single-threaded synchronous runner — fits the browser execution model.

import { Command } from "./Command";

export type CommandListener = (command: Command) => void;

export class CommandRunner {
  private readonly listeners: CommandListener[] = [];

  run(command: Command): void {
    command.run();
    for (const l of this.listeners) l(command);
  }

  addListener(l: CommandListener): void {
    this.listeners.push(l);
  }

  removeListener(l: CommandListener): void {
    const idx = this.listeners.indexOf(l);
    if (idx !== -1) this.listeners.splice(idx, 1);
  }
}
