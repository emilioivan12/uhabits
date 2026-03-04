import { Command } from "./commands";
import { RuntimeState } from "./models";

export type CommandListener = (command: Command) => void;

export class CommandRunner {
  private queue = Promise.resolve();
  private listeners: CommandListener[] = [];

  addListener(listener: CommandListener): void {
    this.listeners.push(listener);
  }

  removeListener(listener: CommandListener): void {
    this.listeners = this.listeners.filter((entry) => entry !== listener);
  }

  async run(
    command: Command,
    getState: () => RuntimeState,
    applyState: (next: RuntimeState) => void
  ): Promise<RuntimeState> {
    this.queue = this.queue.then(async () => {
      const next = await command.run(getState());
      applyState(next);
      for (const listener of this.listeners) {
        listener(command);
      }
    });

    await this.queue;
    return getState();
  }
}
