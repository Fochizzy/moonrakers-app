import { describe, expect, it } from "vitest";

import {
  isProfileComplete,
  normalizeDashboardProfile,
} from "./profileReadiness";

describe("profileReadiness", () => {
  it("treats player_name as the dashboard readiness gate", () => {
    expect(
      isProfileComplete(
        normalizeDashboardProfile({
          id: "user-1",
          player_name: "Nova",
        }),
      ),
    ).toBe(true);

    expect(
      isProfileComplete(
        normalizeDashboardProfile({
          id: "user-1",
          player_name: "   ",
        }),
      ),
    ).toBe(false);
  });
});
