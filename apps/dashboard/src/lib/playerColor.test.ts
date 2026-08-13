import { describe, expect, it } from "vitest";

import { playerAccent } from "./playerColor";

describe("playerAccent", () => {
  it("maps the color words the participant rows actually store to the app palette", () => {
    expect(playerAccent("purple")).toBe("#A855F7");
    expect(playerAccent("blue")).toBe("#3B82F6");
    expect(playerAccent("green")).toBe("#22C55E");
    expect(playerAccent("yellow")).toBe("#EAB308");
    expect(playerAccent("orange")).toBe("#F97316");
  });

  it("never returns a bare CSS color word", () => {
    for (const word of ["purple", "blue", "green", "yellow", "orange", "Blue"]) {
      expect(playerAccent(word)).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("is case and whitespace insensitive, matching the app's normalizer", () => {
    expect(playerAccent("  Purple ")).toBe(playerAccent("purple"));
    expect(playerAccent("BLUE")).toBe(playerAccent("blue"));
  });

  it("uses the caller's fallback only when no color is stored", () => {
    expect(playerAccent(null)).toBe("var(--accent)");
    expect(playerAccent("", "var(--blue)")).toBe("var(--blue)");
    // An unrecognized word is still a stored color, so it takes the app default.
    expect(playerAccent("chartreuse")).toBe("#3B82F6");
  });
});
