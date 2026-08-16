import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BetaSignupList, type BetaSignupRow } from "./BetaSignupList";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const rows: BetaSignupRow[] = [
  {
    id: "row-1",
    email: "player@gmail.com",
    createdAt: "2026-08-16T10:00:00.000Z",
    invitedAt: null,
  },
  {
    id: "row-2",
    email: "other@gmail.com",
    createdAt: "2026-08-15T10:00:00.000Z",
    invitedAt: "2026-08-15T12:00:00.000Z",
  },
];

function rowFor(email: string) {
  return within(screen.getByText(email).closest("tr") as HTMLElement);
}

function mockFetch(response: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    json: async () => response,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockClear();
});

describe("BetaSignupList", () => {
  it("offers Send invite before, and Resend after, an invite has gone", () => {
    render(<BetaSignupList rows={rows} />);

    expect(
      rowFor("player@gmail.com").getByRole("button", { name: "Send invite" }),
    ).toBeInTheDocument();

    const sentRow = rowFor("other@gmail.com");
    expect(sentRow.getByRole("button", { name: "Resend" })).toBeInTheDocument();
    expect(sentRow.getByText(/^Sent /)).toBeInTheDocument();
  });

  it("does not remove a signup on the first click", async () => {
    const fetchMock = mockFetch({ ok: true });
    render(<BetaSignupList rows={rows} />);

    await userEvent.click(
      rowFor("player@gmail.com").getByRole("button", {
        name: "Remove player@gmail.com",
      }),
    );

    // Armed, but nothing has been sent anywhere yet.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("Remove?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("backs out cleanly when the confirm is cancelled", async () => {
    const fetchMock = mockFetch({ ok: true });
    render(<BetaSignupList rows={rows} />);

    await userEvent.click(
      rowFor("player@gmail.com").getByRole("button", {
        name: "Remove player@gmail.com",
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("player@gmail.com")).toBeInTheDocument();
  });

  it("removes the row once the second click confirms it", async () => {
    const fetchMock = mockFetch({ ok: true, removed: 1 });
    render(<BetaSignupList rows={rows} />);

    await userEvent.click(
      rowFor("player@gmail.com").getByRole("button", {
        name: "Remove player@gmail.com",
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Yes, remove" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/beta-access/delete",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "player@gmail.com" }),
      }),
    );
    expect(screen.queryByText("player@gmail.com")).not.toBeInTheDocument();
    // The counts above the table are server-rendered.
    expect(refresh).toHaveBeenCalled();
    // The other row is untouched.
    expect(screen.getByText("other@gmail.com")).toBeInTheDocument();
  });

  it("keeps the row and shows why when the delete is refused", async () => {
    mockFetch({ ok: false, message: "That address is not on the signup list." }, false);
    render(<BetaSignupList rows={rows} />);

    await userEvent.click(
      rowFor("player@gmail.com").getByRole("button", {
        name: "Remove player@gmail.com",
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Yes, remove" }));

    expect(screen.getByText("player@gmail.com")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "That address is not on the signup list.",
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it("surfaces a failed invite without pretending it sent", async () => {
    mockFetch({ ok: false, message: "Brevo rejected the send." }, false);
    render(<BetaSignupList rows={rows} />);

    await userEvent.click(
      rowFor("player@gmail.com").getByRole("button", { name: "Send invite" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Brevo rejected the send.",
    );
    expect(
      rowFor("player@gmail.com").queryByText(/^Sent /),
    ).not.toBeInTheDocument();
  });
});
