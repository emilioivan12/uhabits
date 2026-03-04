import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { getTodayWithOffset } from "../domain/date";
import {
  changeHabitColorCommand,
  Command,
  createHabitCommand,
  createRepetitionCommand,
  deleteHabitCommand,
  editHabitCommand,
  toggleArchiveCommand
} from "../domain/commands";
import { CommandRunner } from "../domain/commandRunner";
import {
  DEFAULT_PREFERENCES,
  ENTRY_UNKNOWN,
  Habit,
  HabitDraft,
  PreferencesState,
  RuntimeState,
  nextToggleValue
} from "../domain/models";
import {
  loadPreferences,
  loadRuntimeState,
  savePreferences,
  saveRuntimeState
} from "../persistence/repositories";
import { telemetry } from "../services/telemetry";

type HabitsContextValue = {
  loading: boolean;
  state: RuntimeState;
  preferences: PreferencesState;
  refresh: () => Promise<void>;
  createHabit: (draft: HabitDraft) => Promise<void>;
  editHabit: (habitId: number, draft: HabitDraft) => Promise<void>;
  deleteHabit: (habitId: number) => Promise<void>;
  archiveHabit: (habitId: number, archived: boolean) => Promise<void>;
  setHabitColor: (habitId: number, color: number) => Promise<void>;
  setHabitEntry: (
    habitId: number,
    timestamp: number,
    value: number,
    notes?: string
  ) => Promise<void>;
  toggleHabitAtTimestamp: (habit: Habit, timestamp: number) => Promise<void>;
  saveNumericAtTimestamp: (
    habitId: number,
    timestamp: number,
    value: number,
    notes?: string
  ) => Promise<void>;
  toggleHabitToday: (habit: Habit) => Promise<void>;
  saveNumericToday: (habitId: number, value: number, notes?: string) => Promise<void>;
  setPreferences: (patch: Partial<PreferencesState>) => Promise<void>;
};

const HabitsContext = createContext<HabitsContextValue | undefined>(undefined);

const EMPTY_STATE: RuntimeState = {
  habits: [],
  nextHabitId: 1
};

const defaultDraft: HabitDraft = {
  name: "",
  question: "",
  description: "",
  type: "YES_NO",
  frequency: { numerator: 1, denominator: 1 },
  color: 11,
  targetType: "AT_LEAST",
  targetValue: 1,
  unit: ""
};

export function buildDefaultDraft(): HabitDraft {
  return { ...defaultDraft, frequency: { ...defaultDraft.frequency } };
}

export function HabitsProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<RuntimeState>(EMPTY_STATE);
  const stateRef = useRef<RuntimeState>(EMPTY_STATE);
  const [preferences, setPreferencesState] = useState<PreferencesState>(DEFAULT_PREFERENCES);
  const runnerRef = useRef(new CommandRunner());

  useEffect(() => {
    telemetry.installGlobalErrorHandlers();
  }, []);

  useEffect(() => {
    telemetry.setEnabled(preferences.telemetryEnabled);
  }, [preferences.telemetryEnabled]);

  const applyState = useCallback((next: RuntimeState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const runCommand = useCallback(
    async (command: Command) => {
      const next = await runnerRef.current.run(command, () => stateRef.current, applyState);
      await saveRuntimeState(next);
      telemetry.track("command_executed", {
        type: command.type,
        habitsCount: next.habits.length
      });
    },
    [applyState]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [runtimeState, prefState] = await Promise.all([loadRuntimeState(), loadPreferences()]);
      applyState(runtimeState);
      setPreferencesState(prefState);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      telemetry.track("refresh_failed", { message });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [applyState]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    document.body.dataset.theme = preferences.theme;
  }, [preferences.theme]);

  const setPreferences = useCallback(async (patch: Partial<PreferencesState>) => {
    setPreferencesState((prev) => {
      const next = { ...prev, ...patch };
      void savePreferences(next);
      telemetry.track("preferences_changed", patch as Record<string, unknown>);
      return next;
    });
  }, []);

  const value = useMemo<HabitsContextValue>(
    () => ({
      loading,
      state,
      preferences,
      refresh,
      createHabit: async (draft) => {
        await runCommand(createHabitCommand(draft));
      },
      editHabit: async (habitId, draft) => {
        await runCommand(editHabitCommand(habitId, draft));
      },
      deleteHabit: async (habitId) => {
        await runCommand(deleteHabitCommand(habitId));
      },
      archiveHabit: async (habitId, archived) => {
        await runCommand(toggleArchiveCommand(habitId, archived));
      },
      setHabitColor: async (habitId, color) => {
        await runCommand(changeHabitColorCommand(habitId, color));
      },
      setHabitEntry: async (habitId, timestamp, value, notes = "") => {
        await runCommand(createRepetitionCommand(habitId, timestamp, value, notes));
      },
      toggleHabitAtTimestamp: async (habit, timestamp) => {
        if (habit.type !== "YES_NO") {
          return;
        }
        const current = habit.computedEntries.find((entry) => entry.timestamp === timestamp) ?? {
          value: ENTRY_UNKNOWN,
          notes: ""
        };
        const nextValue = nextToggleValue(
          current.value,
          preferences.isSkipEnabled,
          preferences.areQuestionMarksEnabled
        );
        await runCommand(createRepetitionCommand(habit.id, timestamp, nextValue, current.notes));
      },
      saveNumericAtTimestamp: async (habitId, timestamp, value, notes = "") => {
        await runCommand(createRepetitionCommand(habitId, timestamp, Math.round(value * 1000), notes));
      },
      toggleHabitToday: async (habit) => {
        if (habit.type !== "YES_NO") {
          return;
        }
        const timestamp = getTodayWithOffset();
        const current = habit.computedEntries.find((entry) => entry.timestamp === timestamp) ?? {
          value: ENTRY_UNKNOWN,
          notes: ""
        };
        const nextValue = nextToggleValue(
          current.value,
          preferences.isSkipEnabled,
          preferences.areQuestionMarksEnabled
        );
        await runCommand(createRepetitionCommand(habit.id, timestamp, nextValue, current.notes));
      },
      saveNumericToday: async (habitId, value, notes = "") => {
        await runCommand(
          createRepetitionCommand(habitId, getTodayWithOffset(), Math.round(value * 1000), notes)
        );
      },
      setPreferences
    }),
    [loading, preferences, refresh, runCommand, setPreferences, state]
  );

  return <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>;
}

export function useHabits(): HabitsContextValue {
  const context = useContext(HabitsContext);
  if (!context) {
    throw new Error("useHabits must be used inside HabitsProvider");
  }
  return context;
}
