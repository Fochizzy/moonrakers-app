import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createServerClientMock,
  getUserMock,
  nextResponseNextMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  getUserMock: vi.fn(),
  nextResponseNextMock: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));

vi.mock("next/server", () => ({
  NextResponse: {
    next: nextResponseNextMock,
  },
}));

import { updateSession } from "./proxy";

function createResponse() {
  return {
    cookies: {
      set: vi.fn(),
    },
  };
}

describe("updateSession", () => {
  beforeEach(() => {
    createServerClientMock.mockReset();
    getUserMock.mockReset();
    nextResponseNextMock.mockReset();
  });

  it("refreshes auth cookies onto the middleware response", async () => {
    const responses = [createResponse(), createResponse()];
    nextResponseNextMock.mockImplementation(() => responses.shift());

    const request = {
      cookies: {
        getAll: vi.fn(() => [{ name: "sb-access-token", value: "stale-token" }]),
        set: vi.fn(),
      },
    };

    getUserMock.mockImplementation(async () => {
      const [, , options] = createServerClientMock.mock.calls[0] ?? [];
      options.cookies.setAll([
        {
          name: "sb-access-token",
          value: "fresh-token",
          options: { path: "/", httpOnly: true },
        },
      ]);

      return { data: { user: { id: "viewer-id" } }, error: null };
    });

    createServerClientMock.mockImplementation((_url, _key, options) => ({
      auth: {
        getUser: getUserMock,
      },
    }));

    const response = await updateSession(request as never);

    expect(createServerClientMock).toHaveBeenCalledTimes(1);
    expect(getUserMock).toHaveBeenCalledTimes(1);
    expect(request.cookies.set).toHaveBeenCalledWith(
      "sb-access-token",
      "fresh-token",
    );
    expect(nextResponseNextMock).toHaveBeenCalledTimes(2);
    expect(response).toBeDefined();
    expect(response.cookies.set).toHaveBeenCalledWith(
      "sb-access-token",
      "fresh-token",
      { path: "/", httpOnly: true },
    );
  });

  it("still returns a response when request cookie mutation throws", async () => {
    const responses = [createResponse(), createResponse()];
    nextResponseNextMock.mockImplementation(() => responses.shift());

    const request = {
      cookies: {
        getAll: vi.fn(() => []),
        set: vi.fn(() => {
          throw new Error("request cookies are read-only");
        }),
      },
    };

    getUserMock.mockImplementation(async () => {
      const [, , options] = createServerClientMock.mock.calls[0] ?? [];
      options.cookies.setAll([
        {
          name: "sb-refresh-token",
          value: "fresh-refresh-token",
          options: { path: "/" },
        },
      ]);

      return { data: { user: null }, error: null };
    });

    createServerClientMock.mockImplementation((_url, _key, options) => ({
      auth: {
        getUser: getUserMock,
      },
    }));

    const response = await updateSession(request as never);

    expect(nextResponseNextMock).toHaveBeenCalledTimes(2);
    expect(response.cookies.set).toHaveBeenCalledWith(
      "sb-refresh-token",
      "fresh-refresh-token",
      { path: "/" },
    );
  });
});
