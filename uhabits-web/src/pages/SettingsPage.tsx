import { PageShell } from "../components/PageShell";
import { useHabits } from "../state/HabitsContext";

export function SettingsPage() {
  const { preferences, setPreferences } = useHabits();

  const completedLegend = preferences.areQuestionMarksEnabled
    ? "Show habits that have any recorded value, including skipped entries."
    : "Show habits completed for the current day.";

  return (
    <PageShell title="Settings">
      <div className="settings-page">
        <section className="settings-intro" aria-label="Settings overview">
          <p>Adjust how habits are displayed, tracked, and shared in this app.</p>
        </section>

        <div className="settings-grid" data-testid="settings-grid">
          <section className="settings-card" aria-labelledby="settings-display-title">
            <header className="settings-card-header">
              <h2 id="settings-display-title">Display</h2>
              <p>Control the appearance and calendar behavior.</p>
            </header>

            <div className="setting-item">
              <div className="setting-content">
                <label htmlFor="theme-select" className="setting-title">
                  Theme
                </label>
                <p id="theme-select-help" className="setting-legend">
                  Follow your system preference or set a fixed theme.
                </p>
              </div>
              <div className="setting-control">
                <select
                  id="theme-select"
                  aria-describedby="theme-select-help"
                  value={preferences.theme}
                  onChange={(event) => {
                    void setPreferences({
                      theme: event.target.value as "system" | "light" | "dark"
                    });
                  }}
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-content">
                <label htmlFor="first-weekday-select" className="setting-title">
                  First weekday
                </label>
                <p id="first-weekday-help" className="setting-legend">
                  Sets the first day shown in calendar-based views.
                </p>
              </div>
              <div className="setting-control">
                <select
                  id="first-weekday-select"
                  aria-describedby="first-weekday-help"
                  value={preferences.firstWeekday}
                  onChange={(event) => {
                    void setPreferences({ firstWeekday: Number(event.target.value) });
                  }}
                >
                  <option value={1}>Sunday</option>
                  <option value={2}>Monday</option>
                  <option value={3}>Tuesday</option>
                  <option value={4}>Wednesday</option>
                  <option value={5}>Thursday</option>
                  <option value={6}>Friday</option>
                  <option value={7}>Saturday</option>
                </select>
              </div>
            </div>
          </section>

          <section className="settings-card" aria-labelledby="settings-behavior-title">
            <header className="settings-card-header">
              <h2 id="settings-behavior-title">Behavior</h2>
              <p>Choose what appears in your list and how entries rotate.</p>
            </header>

            <label className="setting-item setting-toggle" htmlFor="show-archived-toggle">
              <div className="setting-content">
                <span className="setting-title">Show archived</span>
                <p className="setting-legend">Include archived habits in the list screen.</p>
              </div>
              <span className="setting-control">
                <input
                  id="show-archived-toggle"
                  type="checkbox"
                  aria-label="Show archived"
                  checked={preferences.showArchived}
                  onChange={(event) => {
                    void setPreferences({ showArchived: event.target.checked });
                  }}
                />
                <span aria-hidden="true" className="switch-track" />
              </span>
            </label>

            <label className="setting-item setting-toggle" htmlFor="show-completed-toggle">
              <div className="setting-content">
                <span className="setting-title">Show completed / entered</span>
                <p className="setting-legend">{completedLegend}</p>
              </div>
              <span className="setting-control">
                <input
                  id="show-completed-toggle"
                  type="checkbox"
                  aria-label="Show completed / entered"
                  checked={preferences.showCompleted}
                  onChange={(event) => {
                    void setPreferences({ showCompleted: event.target.checked });
                  }}
                />
                <span aria-hidden="true" className="switch-track" />
              </span>
            </label>

            <label className="setting-item setting-toggle" htmlFor="skip-state-toggle">
              <div className="setting-content">
                <span className="setting-title">Enable skip state</span>
                <p className="setting-legend">Allow habits to cycle through a skipped state.</p>
              </div>
              <span className="setting-control">
                <input
                  id="skip-state-toggle"
                  type="checkbox"
                  aria-label="Enable skip state"
                  checked={preferences.isSkipEnabled}
                  onChange={(event) => {
                    void setPreferences({ isSkipEnabled: event.target.checked });
                  }}
                />
                <span aria-hidden="true" className="switch-track" />
              </span>
            </label>

            <label className="setting-item setting-toggle" htmlFor="question-marks-toggle">
              <div className="setting-content">
                <span className="setting-title">Enable question marks</span>
                <p className="setting-legend">Treat unknown entries as a distinct visible state.</p>
              </div>
              <span className="setting-control">
                <input
                  id="question-marks-toggle"
                  type="checkbox"
                  aria-label="Enable question marks"
                  checked={preferences.areQuestionMarksEnabled}
                  onChange={(event) => {
                    void setPreferences({ areQuestionMarksEnabled: event.target.checked });
                  }}
                />
                <span aria-hidden="true" className="switch-track" />
              </span>
            </label>
          </section>

          <section className="settings-card" aria-labelledby="settings-privacy-title">
            <header className="settings-card-header">
              <h2 id="settings-privacy-title">Privacy</h2>
              <p>Manage anonymous local diagnostics.</p>
            </header>

            <label className="setting-item setting-toggle" htmlFor="telemetry-toggle">
              <div className="setting-content">
                <span className="setting-title">Store anonymous error diagnostics locally</span>
                <p className="setting-legend">
                  Keep crash diagnostics on this device only.
                </p>
              </div>
              <span className="setting-control">
                <input
                  id="telemetry-toggle"
                  type="checkbox"
                  aria-label="Store anonymous error diagnostics locally"
                  checked={preferences.telemetryEnabled}
                  onChange={(event) => {
                    void setPreferences({ telemetryEnabled: event.target.checked });
                  }}
                />
                <span aria-hidden="true" className="switch-track" />
              </span>
            </label>
          </section>
        </div>

        <p className="settings-attribution">
          Based on{" "}
          <a href="https://github.com/iSoron/uhabits" target="_blank" rel="noreferrer">
            iSoron/uhabits
          </a>
          .
        </p>
      </div>
    </PageShell>
  );
}
