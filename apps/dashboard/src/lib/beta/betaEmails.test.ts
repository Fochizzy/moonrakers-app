import { describe, expect, it } from "vitest";

import {
  buildApplicantEmail,
  buildInviteEmail,
  buildNotificationEmail,
  escapeHtml,
  PLAY_STORE_URL,
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
    expect(email.subject).toMatch(/thank you for registering/i);
    expect(email.html).toMatch(/Thank you for registering/);
    expect(email.html).toContain(`mailto:${SUPPORT_EMAIL}`);
    expect(email.html).toMatch(/bug feedback/i);
  });

  it("promises the confirmation rather than the download", () => {
    // The Play Store link belongs to the invite. Sending it here would let
    // anyone who typed an address into a public form install the beta.
    expect(email.html).not.toContain(PLAY_STORE_URL);
    expect(email.text).not.toContain(PLAY_STORE_URL);
    expect(email.html).toMatch(/second email/i);
    expect(email.html).toMatch(/google play store/i);
  });

  it("repeats the address they gave so a typo is obvious", () => {
    expect(email.html).toContain("player@gmail.com");
    expect(email.text).toContain("player@gmail.com");
  });

  it("carries the palette and type stack inline", () => {
    // Mail clients drop <style> and never resolve CSS variables.
    expect(email.html).not.toContain("var(--");
    expect(email.html).toContain("#0b1220");
    expect(email.html).toContain("#7c3aed");
    expect(email.html).toContain("Segoe UI");
  });

  it("declares itself light so client dark mode does not invert it", () => {
    expect(email.html).toContain('name="color-scheme" content="light"');
  });

  it("survives Outlook, which ignores max-width on a table", () => {
    expect(email.html).toContain('width="600"');
    expect(email.html).toContain("mso-table-lspace");
  });

  it("never puts a double quote inside a style attribute", () => {
    // A `"` in the font stack closes style="…" early and silently drops the
    // font plus every declaration after it. This shipped once already.
    for (const attr of email.html.match(/style="[^"]*"/g) ?? []) {
      expect(attr).not.toMatch(/font-family:[^;]*"/);
    }
    expect(email.html).toContain("'Segoe UI'");
  });

  it("ships a plain-text alternative alongside the HTML", () => {
    expect(email.text.length).toBeGreaterThan(80);
    expect(email.text).not.toContain("<");
  });
});

describe("buildInviteEmail", () => {
  const email = buildInviteEmail();

  it("thanks them for confirming and carries the download link", () => {
    expect(email.html).toMatch(/thank you for confirming your interest/i);
    expect(email.html).toContain(PLAY_STORE_URL);
    expect(email.text).toContain(PLAY_STORE_URL);
  });

  it("prints the link as text too, for clients that strip the button", () => {
    // The button is a styled table cell; a blocked or plain-text render must
    // still leave something pasteable behind.
    expect(email.html).toMatch(/paste this into your browser/i);
  });

  it("points questions at the support address", () => {
    expect(email.html).toContain(`mailto:${SUPPORT_EMAIL}`);
    expect(email.text).toContain(SUPPORT_EMAIL);
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
