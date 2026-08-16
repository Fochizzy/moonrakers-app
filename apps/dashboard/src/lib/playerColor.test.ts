import { describe, expect, it } from "vitest";

import { assignDistinctAccents, playerAccent } from "./playerColor";

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

  it("keeps unique colors and moves a clash to a free palette entry", () => {
    // Mirrors the archived games where Corey and GregMTG are both stored blue.
    const accents = assignDistinctAccents([
      { id: "a-corey", color: "Blue" },
      { id: "b-greg", color: "blue" },
      { id: "c-james", color: "green" },
    ]);

    expect(accents["a-corey"]).toBe("#3B82F6");
    expect(accents["c-james"]).toBe("#22C55E");
    expect(accents["b-greg"]).not.toBe("#3B82F6");
    expect(new Set(Object.values(accents)).size).toBe(3);
  });

  it("assigns the same accent regardless of the order rows are displayed in", () => {
    const players = [
      { id: "a-corey", color: "blue" },
      { id: "b-greg", color: "blue" },
      { id: "c-james", color: "green" },
    ];

    expect(assignDistinctAccents([...players].reverse())).toEqual(
      assignDistinctAccents(players),
    );
  });

  it("gives every player a distinct accent when a whole table clashes", () => {
    const accents = assignDistinctAccents(
      ["p1", "p2", "p3", "p4"].map((id) => ({ id, color: "blue" })),
    );

    expect(new Set(Object.values(accents)).size).toBe(4);
  });

  it("still resolves players that have no stored color", () => {
    const accents = assignDistinctAccents([
      { id: "p1", color: "purple" },
      { id: "p2", color: null },
    ]);

    expect(accents.p1).toBe("#A855F7");
    expect(accents.p2).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(accents.p2).not.toBe(accents.p1);
  });

  it("uses the caller's fallback only when no color is stored", () => {
    expect(playerAccent(null)).toBe("var(--accent)");
    expect(playerAccent("", "var(--blue)")).toBe("var(--blue)");
    // An unrecognized word is still a stored color, so it takes the app default.
    expect(playerAccent("chartreuse")).toBe("#3B82F6");
  });
});
