import { describe, expect, it } from "vitest";

import {
  buildApplicantEmail,
  buildNotificationEmail,
  escapeHtml,
  SUPPORT_EMAIL,
} from "./betaEmails";

describe("escapeHtml", () => {
  it("neutralises markup", () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">`)).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    );
  });
});

describe("buildApplicantEmail", () => {
  const email = buildApplicantEmail("player@gmail.com");

  it("thanks them and points bug feedback at Izzy", () => {
    expect(email.subject).toMatch(/thanks for signing up/i);
    expect(email.html).toMatch(/Thanks for signing up/);
    expect(email.html).toContain(`mailto:${SUPPORT_EMAIL}`);
    expect(email.html).toMatch(/questions or bug feedback/i);
  });

  it("repeats the address they gave so a typo is obvious", () => {
    expect(email.html).toContain("player@gmail.com");
    expect(email.text).toContain("player@gmail.com");
  });

  it("carries the app's palette and type stack inline", () => {
    // Mail clients drop <style> and never resolve CSS variables.
    expect(email.html).not.toContain("var(--");
    expect(email.html).toContain("#040814");
    expect(email.html).toContain("#a855f7");
    expect(email.html).toContain("Segoe UI");
  });

  it("ships a plain-text alternative alongside the HTML", () => {
    expect(email.text.length).toBeGreaterThan(80);
    expect(email.text).not.toContain("<");
  });
});

describe("buildNotificationEmail", () => {
  it("puts the requested address in the subject and body", () => {
    const email = buildNotificationEmail("player@gmail.com");

    expect(email.subject).toBe("Beta access request: player@gmail.com");
    expect(email.html).toContain("player@gmail.com");
  });

  it("links straight to the group members page", () => {
    const email = buildNotificationEmail("player@gmail.com");

    expect(email.html).toContain(
      "https://groups.google.com/g/moonrakers-beta/members",
    );
  });

  it("escapes an address that carries markup", () => {
    const email = buildNotificationEmail('a"<script>@evil.com');

    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
});
