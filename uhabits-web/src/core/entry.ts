// Ported from uhabits-core/.../models/Entry.kt

export const SKIP = 3;
export const YES_MANUAL = 2;
export const YES_AUTO = 1;
export const NO = 0;
export const UNKNOWN = -1;

export class Entry {
  constructor(
    readonly timestamp: import("./timestamp").Timestamp,
    readonly value: number,
    readonly notes: string = "",
  ) {}

  get formattedValue(): string {
    switch (this.value) {
      case YES_MANUAL:
        return "YES_MANUAL";
      case YES_AUTO:
        return "YES_AUTO";
      case NO:
        return "NO";
      case SKIP:
        return "SKIP";
      case UNKNOWN:
        return "UNKNOWN";
      default:
        return String(this.value);
    }
  }

  equals(other: Entry): boolean {
    return (
      this.timestamp.equals(other.timestamp) &&
      this.value === other.value &&
      this.notes === other.notes
    );
  }

  static nextToggleValue(
    value: number,
    isSkipEnabled: boolean,
    areQuestionMarksEnabled: boolean,
  ): number {
    switch (value) {
      case YES_AUTO:
        return YES_MANUAL;
      case YES_MANUAL:
        return isSkipEnabled ? SKIP : NO;
      case SKIP:
        return NO;
      case NO:
        return areQuestionMarksEnabled ? UNKNOWN : YES_MANUAL;
      case UNKNOWN:
        return YES_MANUAL;
      default:
        return YES_MANUAL;
    }
  }
}
