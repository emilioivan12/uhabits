import { useMemo } from "react";
import { getTodayWithOffset, plusDays, weekdayFromTimestamp } from "../domain/date";
import {
  ENTRY_SKIP,
  ENTRY_UNKNOWN,
  ENTRY_YES_AUTO,
  ENTRY_YES_MANUAL,
  Habit
} from "../domain/models";

interface HistoryGridProps {
  habit: Habit;
  firstWeekday: number;
  onToggle: (timestamp: number) => void;
  onNumeric: (timestamp: number, currentValue: number, currentNotes: string) => void;
  weeks?: number;
}

interface HistoryCell {
  timestamp: number;
  day: number;
  className: string;
  hasNotes: boolean;
  isFuture: boolean;
  currentValue: number;
  notes: string;
}

interface HistoryColumn {
  weekStart: number;
  label: string;
  cells: HistoryCell[];
}

function normalizeFirstWeekday(firstWeekday: number): number {
  return ((firstWeekday - 1) % 7 + 7) % 7;
}

function weekdayLabels(firstWeekday: number): string[] {
  const formatter = new Intl.DateTimeFormat(undefined, { weekday: "short", timeZone: "UTC" });
  const baseSunday = Date.UTC(2024, 0, 7);
  return Array.from({ length: 7 }, (_, row) => {
    const weekday = (firstWeekday + row) % 7;
    return formatter.format(new Date(baseSunday + weekday * 86_400_000));
  });
}

function monthLabel(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", timeZone: "UTC" }).format(
    new Date(timestamp)
  );
}

function fullDateLabel(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(timestamp));
}

function resolveCellClass(habit: Habit, value: number): string {
  if (habit.type === "NUMERICAL") {
    if (value === ENTRY_UNKNOWN) {
      return "state-off";
    }
    if (value === ENTRY_SKIP) {
      return "state-hatched";
    }
    const amount = value / 1000;
    const success =
      habit.targetType === "AT_MOST" ? amount <= habit.targetValue : amount >= habit.targetValue;
    return success ? "state-on" : "state-grey";
  }

  switch (value) {
    case ENTRY_YES_MANUAL:
      return "state-on";
    case ENTRY_YES_AUTO:
      return "state-dimmed";
    case ENTRY_SKIP:
      return "state-hatched";
    default:
      return "state-off";
  }
}

export function HistoryGrid({
  habit,
  firstWeekday,
  onToggle,
  onNumeric,
  weeks = 16
}: HistoryGridProps) {
  const today = getTodayWithOffset();
  const normalizedFirstWeekday = normalizeFirstWeekday(firstWeekday);
  const labels = useMemo(() => weekdayLabels(normalizedFirstWeekday), [normalizedFirstWeekday]);

  const columns = useMemo<HistoryColumn[]>(() => {
    const todayWeekday = weekdayFromTimestamp(today);
    const firstWeekdayOffset = (todayWeekday - normalizedFirstWeekday + 7) % 7;
    const gridStart = plusDays(today, -((weeks - 1) * 7 + firstWeekdayOffset));
    const entryMap = new Map(habit.computedEntries.map((entry) => [entry.timestamp, entry]));

    let lastPrintedMonth = "";
    return Array.from({ length: weeks }, (_, index) => {
      const weekStart = plusDays(gridStart, index * 7);
      const currentMonth = monthLabel(weekStart);
      const label = currentMonth !== lastPrintedMonth ? currentMonth : "";
      lastPrintedMonth = currentMonth;

      const cells = Array.from({ length: 7 }, (_, row): HistoryCell => {
        const timestamp = plusDays(weekStart, row);
        const entry = entryMap.get(timestamp);
        const value = entry?.value ?? ENTRY_UNKNOWN;
        const notes = entry?.notes ?? "";
        return {
          timestamp,
          day: new Date(timestamp).getUTCDate(),
          className: resolveCellClass(habit, value),
          hasNotes: notes.trim().length > 0,
          isFuture: timestamp > today,
          currentValue: value,
          notes
        };
      });

      return { weekStart, label, cells };
    });
  }, [habit, normalizedFirstWeekday, today, weeks]);

  const helpText =
    habit.type === "NUMERICAL"
      ? "Tap any day to set value for that date."
      : "Tap any day to toggle checkmark for that date.";

  return (
    <div className="history-grid-layout">
      <div className="history-weekdays" aria-hidden>
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="history-grid-scroll">
        <div className="history-month-row" aria-hidden>
          {columns.map((column) => (
            <span key={`month-${column.weekStart}`}>{column.label}</span>
          ))}
        </div>

        <div className="history-columns">
          {columns.map((column) => (
            <div key={column.weekStart} className="history-column">
              {column.cells.map((cell) => (
                <button
                  key={cell.timestamp}
                  type="button"
                  data-testid={`history-cell-${cell.timestamp}`}
                  className={`history-cell ${cell.className}`}
                  disabled={cell.isFuture}
                  aria-label={`${fullDateLabel(cell.timestamp)} (${cell.className.replace("state-", "")})`}
                  title={fullDateLabel(cell.timestamp)}
                  onClick={() => {
                    if (habit.type === "NUMERICAL") {
                      onNumeric(cell.timestamp, cell.currentValue / 1000, cell.notes);
                    } else {
                      onToggle(cell.timestamp);
                    }
                  }}
                >
                  <span className="history-day">{cell.day}</span>
                  {cell.hasNotes ? <span className="history-note-dot" /> : null}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="history-grid-help">{helpText}</p>
    </div>
  );
}
