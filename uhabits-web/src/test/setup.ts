import "@testing-library/jest-dom/vitest";
import { expect } from "vitest";

const DEFAULT_TOLERANCE = 1e-6;

expect.extend({
  /**
   * Mirrors Hamcrest's `closeTo(value, tolerance)` (used pervasively in the
   * Kotlin test suite) so ported tests can keep their original tolerances
   * without translating to vitest's `toBeCloseTo` precision-digits scheme,
   * which clamps tolerance to `5 * 10^-N`.
   */
  toBeWithin(
    received: number,
    expected: number,
    tolerance: number = DEFAULT_TOLERANCE,
  ) {
    if (!Number.isFinite(received)) {
      return {
        pass: false,
        message: () => `expected a finite number but received ${received}`,
      };
    }
    if (!Number.isFinite(expected)) {
      return {
        pass: false,
        message: () =>
          `expected a finite number as the target but received ${expected}`,
      };
    }
    if (tolerance < 0) {
      return {
        pass: false,
        message: () => `tolerance must be non-negative, got: ${tolerance}`,
      };
    }
    const diff = Math.abs(received - expected);
    const pass = diff <= tolerance;
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} NOT to be within ${tolerance} of ${expected} (diff ${diff})`
          : `expected ${received} to be within ${tolerance} of ${expected} (diff ${diff})`,
    };
  },
});

interface ToBeWithin {
  toBeWithin(expected: number, tolerance?: number): void;
}

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Assertion<T = any> extends ToBeWithin {
    // Phantom field keeps T in scope so TypeScript resolves the generic
    // correctly when there are no other T-bearing members in this augmentation.
    _phantom?: T;
  }
  interface AsymmetricMatchersContaining extends ToBeWithin {}
}
