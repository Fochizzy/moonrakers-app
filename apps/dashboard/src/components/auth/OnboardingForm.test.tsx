import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OnboardingForm } from "./OnboardingForm";

describe("OnboardingForm", () => {
  it("requires player identity fields before submission", () => {
    render(
      <OnboardingForm
        initialProfile={null}
        action={async () => ({ ok: true })}
      />,
    );

    expect(screen.getByLabelText(/player name/i)).toBeRequired();
    expect(screen.getByLabelText(/favorite color/i)).toBeRequired();
  });
});
