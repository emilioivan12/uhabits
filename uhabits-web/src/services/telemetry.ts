export interface TelemetryEvent {
  type: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

const QUEUE_KEY = "loop_web_telemetry_queue";

class TelemetryService {
  private enabled = false;
  private attached = false;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  installGlobalErrorHandlers(): void {
    if (this.attached || typeof window === "undefined") {
      return;
    }

    this.attached = true;
    window.addEventListener("error", (event) => {
      this.track("window_error", {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : JSON.stringify(reason);
      this.track("unhandled_rejection", { message });
    });
  }

  track(type: string, payload: Record<string, unknown> = {}): void {
    if (!this.enabled || typeof window === "undefined") {
      return;
    }

    const event: TelemetryEvent = {
      type,
      timestamp: Date.now(),
      payload
    };

    const queue = this.readQueue();
    queue.push(event);

    // Keep bounded local queue.
    const bounded = queue.slice(-200);
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(bounded));

    // Placeholder hook for future cloud forwarding.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info("[telemetry]", event.type, event.payload);
    }
  }

  readQueue(): TelemetryEvent[] {
    if (typeof window === "undefined") {
      return [];
    }

    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as TelemetryEvent[];
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed;
    } catch {
      return [];
    }
  }

  clear(): void {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.removeItem(QUEUE_KEY);
  }
}

export const telemetry = new TelemetryService();
