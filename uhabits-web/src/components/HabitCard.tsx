import { Link } from "react-router-dom";
import { getCurrentStreak, getTodayScore } from "../domain/habitLogic";
import { getTodayWithOffset } from "../domain/date";
import {
  ENTRY_NO,
  ENTRY_SKIP,
  ENTRY_UNKNOWN,
  ENTRY_YES_AUTO,
  ENTRY_YES_MANUAL,
  Habit,
  PALETTE_COLORS
} from "../domain/models";

function formatNumeric(value: number): string {
  const amount = value / 1000;
  if (Number.isInteger(amount)) {
    return String(amount);
  }
  return amount.toFixed(1).replace(/\.0$/, "");
}

export function HabitCard({
  habit,
  days,
  areQuestionMarksEnabled,
  onToggleAt,
  onNumericAt
}: {
  habit: Habit;
  days: number[];
  areQuestionMarksEnabled: boolean;
  onToggleAt: (timestamp: number) => void;
  onNumericAt: (timestamp: number, currentValue: number, currentNotes: string) => void;
}) {
  const today = getTodayWithOffset();
  const score = Math.round(getTodayScore(habit, today) * 100);
  const streak = getCurrentStreak(habit, today);
  const entries = new Map(habit.computedEntries.map((entry) => [entry.timestamp, entry]));
  const color = PALETTE_COLORS[habit.color];

  return (
    <article className="habit-row">
      <div className="habit-main">
        <span
          className="habit-ring"
          style={{
            background: `conic-gradient(${color} ${score * 3.6}deg, var(--habit-ring-track) 0deg)`
          }}
          aria-hidden
        />
        <div>
          <h3>
            <Link to={`/habit/${habit.id}`} className="habit-name" style={{ color }}>
              {habit.name}
            </Link>
          </h3>
          <p className="habit-subtitle">Streak {streak}</p>
        </div>
      </div>
      <div
        className="habit-mini-grid"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(3.1rem, 1fr))` }}
      >
        {days.map((timestamp) => {
          const entry = entries.get(timestamp);
          const value = entry?.value ?? ENTRY_UNKNOWN;
          const notes = entry?.notes ?? "";
          const onDate = new Date(timestamp).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC"
          });
          return (
            <button
              key={timestamp}
              type="button"
              data-testid={`list-cell-${habit.id}-${timestamp}`}
              className="list-cell"
              aria-label={`${habit.name} ${onDate}`}
              title={onDate}
              onClick={() => {
                if (habit.type === "NUMERICAL") {
                  onNumericAt(timestamp, value / 1000, notes);
                } else {
                  onToggleAt(timestamp);
                }
              }}
            >
              {habit.type === "NUMERICAL" ? (
                value === ENTRY_UNKNOWN || value === ENTRY_SKIP ? (
                  <span className="list-cell-symbol miss">×</span>
                ) : (
                  <>
                    <span
                      className={`list-cell-number ${
                        (habit.targetType === "AT_MOST" && value / 1000 <= habit.targetValue) ||
                        (habit.targetType === "AT_LEAST" && value / 1000 >= habit.targetValue)
                          ? "hit"
                          : "miss"
                      }`}
                      style={{
                        color:
                          (habit.targetType === "AT_MOST" && value / 1000 <= habit.targetValue) ||
                          (habit.targetType === "AT_LEAST" && value / 1000 >= habit.targetValue)
                            ? color
                            : undefined
                      }}
                    >
                      {formatNumeric(value)}
                    </span>
                    <span className="list-cell-unit">{habit.unit || "u"}</span>
                  </>
                )
              ) : (
                <span
                  className={`list-cell-symbol ${
                    value === ENTRY_YES_MANUAL || value === ENTRY_YES_AUTO ? "hit" : "miss"
                  }`}
                  style={{
                    color: value === ENTRY_YES_MANUAL || value === ENTRY_YES_AUTO ? color : undefined
                  }}
                >
                  {value === ENTRY_YES_MANUAL || value === ENTRY_YES_AUTO
                    ? "✓"
                    : value === ENTRY_SKIP
                      ? "–"
                      : value === ENTRY_UNKNOWN && areQuestionMarksEnabled
                        ? "?"
                        : value === ENTRY_NO
                          ? "×"
                          : "×"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </article>
  );
}
