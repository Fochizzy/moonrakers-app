import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ORIGINAL_SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

afterEach(() => {
  if (ORIGINAL_SUPABASE_URL === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_SUPABASE_URL;
  }

  if (ORIGINAL_SUPABASE_PUBLISHABLE_KEY === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      ORIGINAL_SUPABASE_PUBLISHABLE_KEY;
  }

  vi.resetModules();
});

describe("dashboardEnv", () => {
  it("falls back to the Moonrakers Supabase defaults when env vars are absent", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    vi.resetModules();

    const { dashboardEnv } = await import("./env");

    expect(dashboardEnv).toMatchObject({
      NEXT_PUBLIC_SUPABASE_URL: "https://znpzawotdmkcdjpwjkds.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        "sb_publishable_U657t2wc1r6ParKopa6F8A_mp0VZFxW",
    });
  });

  it("prefers explicit env vars when they are provided", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_custom";
    vi.resetModules();

    const { dashboardEnv } = await import("./env");

    expect(dashboardEnv).toMatchObject({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_custom",
    });
  });
});
