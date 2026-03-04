import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import { recomputeHabit } from "../domain/habitLogic";
import { getTodayWithOffset, plusDays } from "../domain/date";
import { buildHabitFromDraft, RuntimeState } from "../domain/models";
import { db } from "../persistence/db";
import { loadPreferences, loadRuntimeState, saveRuntimeState } from "../persistence/repositories";
import { HabitsProvider } from "../state/HabitsContext";

async function resetStorage(): Promise<void> {
  await db.delete();
  await db.open();
  window.localStorage.clear();
}

async function seedSingleHabit(): Promise<void> {
  const habit = recomputeHabit(
    buildHabitFromDraft(1, 0, {
      name: "Hydrate",
      question: "Drink water",
      description: "",
      type: "YES_NO",
      frequency: { numerator: 1, denominator: 1 },
      color: 11,
      targetType: "AT_LEAST",
      targetValue: 1,
      unit: ""
    })
  );

  const state: RuntimeState = {
    habits: [habit],
    nextHabitId: 2
  };

  await saveRuntimeState(state);
}

function renderApp(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <HabitsProvider>
        <App />
      </HabitsProvider>
    </MemoryRouter>
  );
}

describe("smoke UI flows", () => {
  beforeEach(async () => {
    await resetStorage();
  });

  it("creates a habit from form", async () => {
    renderApp("/habit/new");

    fireEvent.change(await screen.findByLabelText("Name"), {
      target: { value: "Hydrate" }
    });
    fireEvent.change(screen.getByLabelText("Prompt"), {
      target: { value: "Drink water" }
    });

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(screen.getByText("Hydrate")).toBeInTheDocument();
    });
  });

  it("toggles today value on list", async () => {
    await seedSingleHabit();
    renderApp("/");

    const today = getTodayWithOffset();
    const cell = await screen.findByTestId(`list-cell-1-${today}`);
    fireEvent.click(cell);

    await waitFor(async () => {
      const loaded = await loadRuntimeState();
      expect(loaded.habits[0].originalEntries.length).toBe(1);
    });
  });

  it("archives a habit from details", async () => {
    await seedSingleHabit();
    renderApp("/habit/1");

    await screen.findByRole("button", { name: "Archive" });
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));

    await waitFor(async () => {
      const loaded = await loadRuntimeState();
      expect(loaded.habits[0].isArchived).toBe(true);
    });
  });

  it("toggles a specific historical day from history grid", async () => {
    await seedSingleHabit();
    renderApp("/habit/1");

    const targetTimestamp = plusDays(getTodayWithOffset(), -3);
    const cell = await screen.findByTestId(`history-cell-${targetTimestamp}`);
    fireEvent.click(cell);

    await waitFor(async () => {
      const loaded = await loadRuntimeState();
      const entry = loaded.habits[0].originalEntries.find((e) => e.timestamp === targetTimestamp);
      expect(entry?.value).toBe(2);
    });
  });

  it("renders grouped settings and persists updates", async () => {
    renderApp("/settings");

    expect(await screen.findByRole("heading", { name: "Display" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Behavior" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Privacy" })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Show archived"));
    fireEvent.click(screen.getByLabelText("Store anonymous error diagnostics locally"));
    fireEvent.change(screen.getByLabelText("Theme"), {
      target: { value: "dark" }
    });
    fireEvent.change(screen.getByLabelText("First weekday"), {
      target: { value: "2" }
    });

    await waitFor(async () => {
      const prefs = await loadPreferences();
      expect(prefs.showArchived).toBe(true);
      expect(prefs.telemetryEnabled).toBe(true);
      expect(prefs.theme).toBe("dark");
      expect(prefs.firstWeekday).toBe(2);
    });
  });
});
