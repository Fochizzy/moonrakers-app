import { describe, expect, it, vi } from "vitest";

import { buildApplicantEmail } from "./betaEmails";
import { readBrevoConfig, sendBrevoEmail } from "./sendBrevoEmail";

const email = buildApplicantEmail("player@gmail.com");

describe("readBrevoConfig", () => {
  it("returns null when no key is set, so sending is skipped not failed", () => {
    expect(readBrevoConfig({})).toBeNull();
    expect(readBrevoConfig({ BREVO_API_KEY: "   " })).toBeNull();
  });

  it("falls back to the project's own sender and reply-to", () => {
    const config = readBrevoConfig({ BREVO_API_KEY: "key" });

    expect(config).toEqual({
      apiKey: "key",
      fromEmail: "info@moonrakersapp.org",
      fromName: "Moonraker's Analytics",
      replyTo: "info@moonrakersapp.org",
    });
  });

  it("lets the environment override every address", () => {
    const config = readBrevoConfig({
      BREVO_API_KEY: "key",
      BETA_FROM_EMAIL: "beta@example.com",
      BETA_FROM_NAME: "Beta",
      BETA_REPLY_TO: "reply@example.com",
    });

    expect(config?.fromEmail).toBe("beta@example.com");
    expect(config?.fromName).toBe("Beta");
    expect(config?.replyTo).toBe("reply@example.com");
  });
});

describe("sendBrevoEmail", () => {
  it("skips without a config rather than throwing", async () => {
    const fetchImpl = vi.fn();

    await expect(
      sendBrevoEmail({ config: null, email, to: "a@b.com", fetchImpl }),
    ).resolves.toEqual({ ok: true, skipped: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts the shape Brevo's transactional endpoint expects", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ messageId: "<abc@brevo>" }), {
        status: 201,
      }),
    );

    const result = await sendBrevoEmail({
      config: {
        apiKey: "secret",
        fromEmail: "beta@example.com",
        fromName: "Beta",
        replyTo: "reply@example.com",
      },
      email,
      to: "player@gmail.com",
      fetchImpl,
    });

    expect(result).toEqual({
      ok: true,
      skipped: false,
      messageId: "<abc@brevo>",
    });

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect((init.headers as Record<string, string>)["api-key"]).toBe("secret");

    const body = JSON.parse(String(init.body));
    expect(body.sender).toEqual({ email: "beta@example.com", name: "Beta" });
    expect(body.to).toEqual([{ email: "player@gmail.com" }]);
    expect(body.replyTo).toEqual({ email: "reply@example.com" });
    expect(body.htmlContent).toBe(email.html);
    expect(body.textContent).toBe(email.text);
  });

  it("reports a rejected send instead of pretending it worked", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response('{"message":"sender not valid"}', { status: 400 }),
      );

    const result = await sendBrevoEmail({
      config: {
        apiKey: "secret",
        fromEmail: "beta@example.com",
        fromName: "Beta",
        replyTo: "reply@example.com",
      },
      email,
      to: "player@gmail.com",
      fetchImpl,
    });

    expect(result.ok).toBe(false);
    expect(result).toHaveProperty(
      "reason",
      expect.stringContaining("sender not valid"),
    );
  });

  it("turns a network failure into a result rather than an exception", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline"));

    const result = await sendBrevoEmail({
      config: {
        apiKey: "secret",
        fromEmail: "beta@example.com",
        fromName: "Beta",
        replyTo: "reply@example.com",
      },
      email,
      to: "player@gmail.com",
      fetchImpl,
    });

    expect(result).toEqual({ ok: false, reason: "offline" });
  });
});
