// Ported from uhabits-core/.../models/ModelObservable.kt

export type ModelListener = () => void;

export class ModelObservable {
  private readonly listeners: ModelListener[] = [];

  addListener(l: ModelListener): void {
    this.listeners.push(l);
  }

  removeListener(l: ModelListener): void {
    const idx = this.listeners.indexOf(l);
    if (idx !== -1) this.listeners.splice(idx, 1);
  }

  notifyListeners(): void {
    for (const l of this.listeners) l();
  }
}
