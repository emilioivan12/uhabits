import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HabitCard } from "../components/HabitCard";
import { NumericEntryDialog } from "../components/NumericEntryDialog";
import { EmptyState, PageShell } from "../components/PageShell";
import { getTodayWithOffset, plusDays } from "../domain/date";
import { ENTRY_UNKNOWN, HabitOrder } from "../domain/models";
import { filterHabits, sortHabits } from "../domain/sort";
import { useHabits } from "../state/HabitsContext";

const orderOptions: HabitOrder[] = [
  "BY_POSITION",
  "BY_NAME_ASC",
  "BY_NAME_DESC",
  "BY_COLOR_ASC",
  "BY_COLOR_DESC",
  "BY_SCORE_DESC",
  "BY_SCORE_ASC",
  "BY_STATUS_DESC",
  "BY_STATUS_ASC"
];

export function ListPage() {
  const navigate = useNavigate();
  const {
    loading,
    state,
    preferences,
    toggleHabitAtTimestamp,
    saveNumericAtTimestamp,
    setHabitEntry
  } = useHabits();
  const [primaryOrder, setPrimaryOrder] = useState<HabitOrder>("BY_POSITION");
  const [secondaryOrder, setSecondaryOrder] = useState<HabitOrder>("BY_NAME_ASC");
  const [numericEditor, setNumericEditor] = useState<{
    habitId: number;
    habitName: string;
    timestamp: number;
    currentValue: number;
    currentNotes: string;
    unit: string;
    dateLabel: string;
  } | null>(null);
  const visibleDays = useMemo(() => {
    const today = getTodayWithOffset();
    return Array.from({ length: 5 }, (_, index) => plusDays(today, -index));
  }, []);

  const habits = useMemo(() => {
    const matcher = preferences.areQuestionMarksEnabled
      ? {
          isArchivedAllowed: preferences.showArchived,
          isEnteredAllowed: preferences.showCompleted
        }
      : {
          isArchivedAllowed: preferences.showArchived,
          isCompletedAllowed: preferences.showCompleted
        };

    return sortHabits(filterHabits(state.habits, matcher), primaryOrder, secondaryOrder);
  }, [preferences, primaryOrder, secondaryOrder, state.habits]);

  return (
    <PageShell
      title="Habits"
      actions={
        <>
          <button className="button icon" aria-label="New habit" onClick={() => navigate("/habit/new")}>
            +
          </button>
          <button
            className="button icon"
            aria-label="Change sort"
            onClick={() => {
              setPrimaryOrder((current) => {
                const index = orderOptions.indexOf(current);
                return orderOptions[(index + 1) % orderOptions.length];
              });
              setSecondaryOrder("BY_NAME_ASC");
            }}
          >
            ⇅
          </button>
          <button
            className="button icon"
            aria-label="Preferences"
            onClick={() => navigate("/settings")}
          >
            ⋮
          </button>
        </>
      }
    >
      <div className="list-screen">
        <section className="list-grid-header">
          <div />
          <div
            className="list-grid-header-days"
            style={{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(3.1rem, 1fr))` }}
          >
            {visibleDays.map((timestamp) => (
              <div key={timestamp}>
                <strong>
                  {new Date(timestamp)
                    .toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" })
                    .toUpperCase()}
                </strong>
                <span>{new Date(timestamp).getUTCDate()}</span>
              </div>
            ))}
          </div>
        </section>

        {loading ? <p>Loading habits...</p> : null}

        {!loading && habits.length === 0 ? <EmptyState /> : null}

        <div className="habit-list">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              days={visibleDays}
              areQuestionMarksEnabled={preferences.areQuestionMarksEnabled}
              onToggleAt={(timestamp) => {
                void toggleHabitAtTimestamp(habit, timestamp);
              }}
              onNumericAt={(timestamp, current, notes) => {
                const onDate = new Date(timestamp).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC"
                });
                setNumericEditor({
                  habitId: habit.id,
                  habitName: habit.name,
                  timestamp,
                  currentValue: current,
                  currentNotes: notes,
                  unit: habit.unit,
                  dateLabel: onDate
                });
              }}
            />
          ))}
        </div>
        <NumericEntryDialog
          isOpen={numericEditor !== null}
          habitName={numericEditor?.habitName ?? ""}
          unit={numericEditor?.unit ?? ""}
          dateLabel={numericEditor?.dateLabel ?? ""}
          initialValue={numericEditor?.currentValue ?? 0}
          onCancel={() => setNumericEditor(null)}
          onSave={(value) => {
            if (!numericEditor) {
              return;
            }
            void saveNumericAtTimestamp(
              numericEditor.habitId,
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
              numericEditor.habitId,
              numericEditor.timestamp,
              ENTRY_UNKNOWN,
              numericEditor.currentNotes
            );
            setNumericEditor(null);
          }}
        />
      </div>
    </PageShell>
  );
}
