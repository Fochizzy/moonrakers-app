import { describe, expect, it } from "vitest";

import {
  isDuplicateRequestError,
  MAX_EMAIL_LENGTH,
  normalizeBetaEmail,
  parseBetaAccessRequest,
} from "./betaAccessRequest";

describe("normalizeBetaEmail", () => {
  it("lower-cases and trims so the unique index cannot be sidestepped", () => {
    expect(normalizeBetaEmail("  Someone@Gmail.COM ")).toBe("someone@gmail.com");
  });

  it("treats a non-string as empty rather than throwing", () => {
    expect(normalizeBetaEmail(undefined)).toBe("");
    expect(normalizeBetaEmail(42)).toBe("");
    expect(normalizeBetaEmail(null)).toBe("");
  });
});

describe("parseBetaAccessRequest", () => {
  it("accepts an ordinary address", () => {
    expect(parseBetaAccessRequest("player@gmail.com")).toEqual({
      ok: true,
      email: "player@gmail.com",
    });
  });

  it("asks for an address when the field is blank", () => {
    const result = parseBetaAccessRequest("   ");

    expect(result.ok).toBe(false);
    expect(result).toHaveProperty("message", expect.stringMatching(/Google Play/i));
  });

  it.each([
    ["no at sign", "player.gmail.com"],
    ["no domain dot", "player@gmail"],
    ["spaces inside", "play er@gmail.com"],
    ["two at signs", "a@b@gmail.com"],
  ])("rejects %s", (_label, value) => {
    expect(parseBetaAccessRequest(value).ok).toBe(false);
  });

  it("rejects an address longer than the column allows", () => {
    const tooLong = `${"a".repeat(MAX_EMAIL_LENGTH)}@gmail.com`;

    expect(parseBetaAccessRequest(tooLong).ok).toBe(false);
  });

  it("rejects a non-string payload", () => {
    expect(parseBetaAccessRequest({ email: "x" }).ok).toBe(false);
  });
});

describe("isDuplicateRequestError", () => {
  it("recognises the unique-violation code", () => {
    expect(isDuplicateRequestError({ code: "23505" })).toBe(true);
  });

  it("leaves every other failure alone", () => {
    expect(isDuplicateRequestError({ code: "42501" })).toBe(false);
    expect(isDuplicateRequestError(null)).toBe(false);
  });
});
