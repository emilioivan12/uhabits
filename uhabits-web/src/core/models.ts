// Ported from uhabits-core/.../models/{Frequency,PaletteColor,WeekdayList,
// HabitType,NumericalHabitType,Reminder}.kt

export class Frequency {
  numerator: number;
  denominator: number;

  constructor(numerator: number, denominator: number) {
    if (denominator <= 0) {
      throw new RangeError(`denominator must be positive, got: ${denominator}`);
    }
    if (numerator <= 0) {
      throw new RangeError(`numerator must be positive, got: ${numerator}`);
    }
    if (numerator === denominator) {
      this.numerator = 1;
      this.denominator = 1;
    } else {
      this.numerator = numerator;
      this.denominator = denominator;
    }
  }

  toDouble(): number {
    return this.numerator / this.denominator;
  }

  // Intentionally does not reduce common factors (matching Kotlin source):
  // Frequency(2,4) and Frequency(1,2) are treated as different frequencies.
  equals(other: Frequency): boolean {
    return (
      this.numerator === other.numerator &&
      this.denominator === other.denominator
    );
  }

  static readonly DAILY = new Frequency(1, 1);
  static readonly THREE_TIMES_PER_WEEK = new Frequency(3, 7);
  static readonly TWO_TIMES_PER_WEEK = new Frequency(2, 7);
  static readonly WEEKLY = new Frequency(1, 7);
}

const PALETTE = [
  "#D32F2F",
  "#E64A19",
  "#F57C00",
  "#FF8F00",
  "#F9A825",
  "#AFB42B",
  "#7CB342",
  "#388E3C",
  "#00897B",
  "#00ACC1",
  "#039BE5",
  "#1976D2",
  "#303F9F",
  "#5E35B1",
  "#8E24AA",
  "#D81B60",
  "#5D4037",
  "#303030",
  "#757575",
  "#aaaaaa",
] as const;

export class PaletteColor {
  constructor(readonly paletteIndex: number) {}

  toCsvColor(): string {
    if (this.paletteIndex < 0 || this.paletteIndex >= PALETTE.length) {
      throw new RangeError(`paletteIndex out of range: ${this.paletteIndex}`);
    }
    return PALETTE[this.paletteIndex] as string;
  }

  compareTo(other: PaletteColor): number {
    return Math.sign(this.paletteIndex - other.paletteIndex);
  }
}

export class WeekdayList {
  private readonly days: boolean[];

  constructor(packedOrArray: number | boolean[]) {
    if (typeof packedOrArray === "number") {
      const days = new Array<boolean>(7).fill(false);
      let cur = 1;
      for (let i = 0; i < 7; i++) {
        if ((packedOrArray & cur) !== 0) days[i] = true;
        cur <<= 1;
      }
      this.days = days;
    } else {
      this.days = packedOrArray.slice(0, 7);
      while (this.days.length < 7) this.days.push(false);
    }
  }

  get isEmpty(): boolean {
    return this.days.every((d) => !d);
  }

  toArray(): boolean[] {
    return this.days.slice();
  }

  toInteger(): number {
    let packed = 0;
    let cur = 1;
    for (let i = 0; i < 7; i++) {
      if (this.days[i]) packed |= cur;
      cur <<= 1;
    }
    return packed;
  }

  equals(other: WeekdayList): boolean {
    return this.days.every((v, i) => v === other.days[i]);
  }

  static readonly EVERY_DAY = new WeekdayList(127);
}

export enum HabitType {
  YES_NO = 0,
  NUMERICAL = 1,
}

export enum NumericalHabitType {
  AT_LEAST = 0,
  AT_MOST = 1,
}

export class Reminder {
  constructor(
    readonly hour: number,
    readonly minute: number,
    readonly days: WeekdayList,
  ) {
    if (hour < 0 || hour > 23) {
      throw new RangeError(`hour must be 0–23, got: ${hour}`);
    }
    if (minute < 0 || minute > 59) {
      throw new RangeError(`minute must be 0–59, got: ${minute}`);
    }
  }
}
