import { beforeEach, describe, expect, it } from "vitest";
import { telemetry } from "./telemetry";

describe("telemetry service", () => {
  beforeEach(() => {
    telemetry.clear();
    telemetry.setEnabled(false);
  });

  it("does not record events when disabled", () => {
    telemetry.track("test_event", { a: 1 });
    expect(telemetry.readQueue()).toHaveLength(0);
  });

  it("records events when enabled", () => {
    telemetry.setEnabled(true);
    telemetry.track("test_event", { a: 1 });
    expect(telemetry.readQueue()).toHaveLength(1);
    expect(telemetry.readQueue()[0].type).toBe("test_event");
  });
});
