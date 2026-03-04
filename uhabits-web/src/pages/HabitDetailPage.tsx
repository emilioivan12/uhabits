import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { HistoryGrid } from "../components/HistoryGrid";
import { NumericEntryDialog } from "../components/NumericEntryDialog";
import { PageShell } from "../components/PageShell";
import { Sparkline } from "../components/Sparkline";
import { getBestStreak, getCurrentStreak, getTodayScore } from "../domain/habitLogic";
import { getTodayWithOffset } from "../domain/date";
import { ENTRY_UNKNOWN, PALETTE_COLORS } from "../domain/models";
import { useHabits } from "../state/HabitsContext";

const HABIT_TYPE_LABEL: Record<"YES_NO" | "NUMERICAL", string> = {
  YES_NO: "Yes/No",
  NUMERICAL: "Numerical"
};

const NUMERICAL_TARGET_LABEL: Record<"AT_LEAST" | "AT_MOST", string> = {
  AT_LEAST: "At least",
  AT_MOST: "At most"
};

export function HabitDetailPage() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const habitId = Number(params.id);
  const {
    state,
    preferences,
    archiveHabit,
    deleteHabit,
    setHabitColor,
    toggleHabitAtTimestamp,
    saveNumericAtTimestamp,
    setHabitEntry
  } = useHabits();
  const [numericEditor, setNumericEditor] = useState<{
    timestamp: number;
    currentValue: number;
    currentNotes: string;
    dateLabel: string;
  } | null>(null);

  const habit = state.habits.find((entry) => entry.id === habitId);

  const stats = useMemo(() => {
    if (!habit) {
      return null;
    }
    const today = getTodayWithOffset();
    return {
      score: Math.round(getTodayScore(habit, today) * 100),
      currentStreak: getCurrentStreak(habit, today),
      bestStreak: getBestStreak(habit),
      values: [...habit.scores]
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-30)
        .map((score) => score.value)
    };
  }, [habit]);

  if (!habit || !stats) {
    return (
      <PageShell title="Habit not found">
        <p>The habit you are looking for does not exist.</p>
        <Link className="button" to="/">
          Back to list
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={habit.name}
      actions={
        <>
          <button className="button" onClick={() => navigate(`/habit/${habit.id}/edit`)}>
            Edit
          </button>
          <button
            className="button"
            onClick={() => {
              void archiveHabit(habit.id, !habit.isArchived);
            }}
          >
            {habit.isArchived ? "Unarchive" : "Archive"}
          </button>
          <button
            className="button danger"
            onClick={() => {
              const ok = window.confirm("Delete this habit?");
              if (!ok) {
                return;
              }
              void deleteHabit(habit.id).then(() => navigate("/"));
            }}
          >
            Delete
          </button>
        </>
      }
    >
      <section className="detail-grid">
        <article className="detail-card">
          <h2>Overview</h2>
          <p>{habit.question || "No habit prompt"}</p>
          <dl>
            <div>
              <dt>Type</dt>
              <dd>{HABIT_TYPE_LABEL[habit.type]}</dd>
            </div>
            <div>
              <dt>Frequency</dt>
              <dd>
                {habit.frequency.numerator}/{habit.frequency.denominator}
              </dd>
            </div>
            <div>
              <dt>Target</dt>
              <dd>
                {habit.type === "NUMERICAL"
                  ? `${NUMERICAL_TARGET_LABEL[habit.targetType]} ${habit.targetValue} ${habit.unit}`.trim()
                  : "Complete"}
              </dd>
            </div>
          </dl>
        </article>

        <article className="detail-card">
          <h2>Stats</h2>
          <div className="stats-row">
            <span>
              <strong>{stats.score}%</strong>
              <small>Score</small>
            </span>
            <span>
              <strong>{stats.currentStreak}</strong>
              <small>Current streak</small>
            </span>
            <span>
              <strong>{stats.bestStreak}</strong>
              <small>Best streak</small>
            </span>
          </div>
          <Sparkline values={stats.values} />
        </article>

        <article className="detail-card">
          <h2>History</h2>
          <HistoryGrid
            habit={habit}
            firstWeekday={preferences.firstWeekday}
            onToggle={(timestamp) => {
              void toggleHabitAtTimestamp(habit, timestamp);
            }}
            onNumeric={(timestamp, currentValue, currentNotes) => {
              const onDate = new Date(timestamp).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC"
              });
              setNumericEditor({ timestamp, currentValue, currentNotes, dateLabel: onDate });
            }}
          />
          <NumericEntryDialog
            isOpen={numericEditor !== null}
            habitName={habit.name}
            unit={habit.unit}
            dateLabel={numericEditor?.dateLabel ?? ""}
            initialValue={numericEditor?.currentValue ?? 0}
            onCancel={() => setNumericEditor(null)}
            onSave={(value) => {
              if (!numericEditor) {
                return;
              }
              void saveNumericAtTimestamp(
                habit.id,
                numericEditor.timestamp,
                value,
                numericEditor.currentNotes
              );
              setNumericEditor(null);
            }}
            onClear={() => {
              if (!numericEditor) {
                return;
              }
              void setHabitEntry(
                habit.id,
                numericEditor.timestamp,
                ENTRY_UNKNOWN,
                numericEditor.currentNotes
              );
              setNumericEditor(null);
            }}
          />
        </article>

        <article className="detail-card">
          <h2>Color</h2>
          <div className="palette-grid">
            {PALETTE_COLORS.map((color, index) => (
              <button
                key={color}
                className={`swatch ${habit.color === index ? "active" : ""}`}
                style={{ backgroundColor: color }}
                onClick={() => {
                  void setHabitColor(habit.id, index);
                }}
              />
            ))}
          </div>
        </article>

        <article className="detail-card">
          <h2>Recent entries</h2>
          <ul className="entries-list">
            {habit.originalEntries.slice(0, 20).map((entry) => (
              <li key={entry.timestamp}>
                <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                <span>{entry.value}</span>
                <span>{entry.notes || "-"}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </PageShell>
  );
}
