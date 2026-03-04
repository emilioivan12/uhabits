import { FormEvent, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import {
  HabitDraft,
  HabitType,
  PALETTE_COLORS,
  NumericalHabitType
} from "../domain/models";
import { buildDefaultDraft, useHabits } from "../state/HabitsContext";

function toDraft(habit: HabitDraft): HabitDraft {
  return {
    ...habit,
    frequency: { ...habit.frequency }
  };
}

export function HabitFormPage() {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const id = params.id ? Number(params.id) : null;
  const isEdit = Number.isFinite(id);

  const { state, createHabit, editHabit } = useHabits();
  const habit = useMemo(() => state.habits.find((entry) => entry.id === id), [id, state.habits]);

  const [draft, setDraft] = useState<HabitDraft>(() => {
    if (!habit) {
      return buildDefaultDraft();
    }
    return toDraft({
      name: habit.name,
      question: habit.question,
      description: habit.description,
      type: habit.type,
      frequency: habit.frequency,
      color: habit.color,
      targetType: habit.targetType,
      targetValue: habit.targetValue,
      unit: habit.unit
    });
  });

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.name.trim()) {
      return;
    }
    if (isEdit && habit) {
      await editHabit(habit.id, draft);
      navigate(`/habit/${habit.id}`);
      return;
    }
    await createHabit(draft);
    navigate("/");
  };

  return (
    <PageShell title={isEdit ? "Edit habit" : "Create habit"}>
      <form className="habit-form" onSubmit={onSubmit}>
        <label>
          Name
          <input
            required
            value={draft.name}
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
          />
        </label>

        <label>
          Prompt
          <input
            value={draft.question}
            onChange={(event) => setDraft((prev) => ({ ...prev, question: event.target.value }))}
          />
        </label>

        <label>
          Notes
          <textarea
            rows={3}
            value={draft.description}
            onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
          />
        </label>

        <label>
          Type
          <select
            value={draft.type}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, type: event.target.value as HabitType }))
            }
          >
            <option value="YES_NO">YES/NO</option>
            <option value="NUMERICAL">NUMERICAL</option>
          </select>
        </label>

        <div className="row2">
          <label>
            Frequency numerator
            <input
              type="number"
              min={1}
              value={draft.frequency.numerator}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  frequency: {
                    ...prev.frequency,
                    numerator: Math.max(1, Number(event.target.value) || 1)
                  }
                }))
              }
            />
          </label>
          <label>
            Frequency denominator
            <input
              type="number"
              min={1}
              value={draft.frequency.denominator}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  frequency: {
                    ...prev.frequency,
                    denominator: Math.max(1, Number(event.target.value) || 1)
                  }
                }))
              }
            />
          </label>
        </div>

        {draft.type === "NUMERICAL" ? (
          <>
            <div className="row2">
              <label>
                Target type
                <select
                  value={draft.targetType}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      targetType: event.target.value as NumericalHabitType
                    }))
                  }
                >
                  <option value="AT_LEAST">At least</option>
                  <option value="AT_MOST">At most</option>
                </select>
              </label>
              <label>
                Target value
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={draft.targetValue}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      targetValue: Math.max(0, Number(event.target.value) || 0)
                    }))
                  }
                />
              </label>
            </div>

            <label>
              Unit
              <input
                value={draft.unit}
                onChange={(event) => setDraft((prev) => ({ ...prev, unit: event.target.value }))}
              />
            </label>
          </>
        ) : null}

        <fieldset>
          <legend>Color</legend>
          <div className="palette-grid">
            {PALETTE_COLORS.map((color, index) => (
              <button
                key={color}
                type="button"
                className={`swatch ${draft.color === index ? "active" : ""}`}
                style={{ backgroundColor: color }}
                onClick={() => setDraft((prev) => ({ ...prev, color: index }))}
              />
            ))}
          </div>
        </fieldset>

        <div className="form-actions">
          <button type="submit" className="button primary">
            {isEdit ? "Save" : "Create"}
          </button>
          <button type="button" className="button" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </PageShell>
  );
}
