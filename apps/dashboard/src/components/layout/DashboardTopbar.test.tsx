import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DashboardTopbar } from "./DashboardTopbar";

const { pushMock, usePathnameMock, useSearchParamsMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  usePathnameMock: vi.fn(() => "/charts/relationship_graph"),
  useSearchParamsMock: vi.fn(
    () => new URLSearchParams({ focusPlayerId: "izzy", comparePlayerId: "corey" }),
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
  useRouter: () => ({ push: pushMock }),
  useSearchParams: useSearchParamsMock,
}));

describe("DashboardTopbar", () => {
  it("keeps a newly selected focus player visible while the chart route changes", async () => {
    const user = userEvent.setup();
    pushMock.mockReset();

    render(
      <DashboardTopbar
        favoriteColor={null}
        playerOptions={[
          { id: "izzy", label: "Izzy" },
          { id: "corey", label: "Corey" },
        ]}
        profileName="Izzy"
        signedInPlayerId="izzy"
      />,
    );

    const selector = screen.getByRole("combobox", { name: "Focus player" });
    expect(selector).toHaveValue("izzy");

    await user.selectOptions(selector, "corey");

    expect(selector).toHaveValue("corey");
    expect(pushMock).toHaveBeenCalledWith(
      "/charts/relationship_graph?focusPlayerId=corey",
    );
  });
});
