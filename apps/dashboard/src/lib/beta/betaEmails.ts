/**
 * The two emails a beta request sends: a thank-you to the applicant and a
 * notification to Izzy.
 *
 * Written as inline-styled tables rather than with the dashboard's stylesheet.
 * Mail clients strip `<style>` blocks, do not resolve CSS custom properties,
 * and several still ignore flex and grid — so the palette below is the app's
 * tokens hard-copied as literal hex, and the layout is a centred table.
 */

/** globals.css tokens, resolved to literals mail clients can actually read. */
const THEME = {
  accent: "#a855f7",
  background: "#040814",
  border: "#1c2438",
  gold: "#2dd4bf",
  muted: "#7d8ca3",
  panel: "#0c1226",
  panelSoft: "#111a33",
  sub: "#94a3b8",
  text: "#e2e8f0",
  textStrong: "#f8fbff",
} as const;

const FONT_STACK = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';

export const SUPPORT_EMAIL = "info@moonrakersapp.org";
export const BETA_GROUP_URL = "https://groups.google.com/g/moonrakers-beta";
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.fochizzy.moonrakers";

export type BetaEmail = { html: string; subject: string; text: string };

/**
 * The applicant's address is untrusted input that ends up inside the HTML of
 * the mail sent to Izzy. The address format check still permits `<`, so escape
 * before interpolating rather than relying on it.
 */
export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shell({
  body,
  eyebrow,
  heading,
  preheader,
}: {
  body: string;
  eyebrow: string;
  heading: string;
  preheader: string;
}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${THEME.background};color:${THEME.text};font-family:${FONT_STACK};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${THEME.background};padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:${THEME.panel};border:1px solid ${THEME.border};border-radius:16px;">
        <tr>
          <td style="padding:28px 28px 8px 28px;">
            <p style="margin:0 0 6px 0;color:${THEME.gold};font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
            <h1 style="margin:0;color:${THEME.textStrong};font-size:24px;font-weight:800;letter-spacing:-0.02em;line-height:1.2;">${escapeHtml(heading)}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 28px 28px 28px;">${body}</td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr>
          <td style="padding:16px 28px 0 28px;">
            <p style="margin:0;color:${THEME.muted};font-size:12px;line-height:1.5;">
              Moonrakers Command · sent because someone asked for beta access at
              <a href="https://www.moonrakersapp.org/preview" style="color:${THEME.sub};text-decoration:underline;">moonrakersapp.org</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function paragraph(html: string) {
  return `<p style="margin:0 0 14px 0;color:${THEME.sub};font-size:15px;line-height:1.6;">${html}</p>`;
}

function link(href: string, label: string) {
  return `<a href="${escapeHtml(href)}" style="color:${THEME.gold};text-decoration:underline;">${escapeHtml(label)}</a>`;
}

function calloutRow(label: string, value: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${THEME.panelSoft};border:1px solid ${THEME.border};border-radius:12px;margin:0 0 16px 0;">
  <tr>
    <td style="padding:14px 16px;">
      <p style="margin:0 0 4px 0;color:${THEME.muted};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(label)}</p>
      <p style="margin:0;color:${THEME.textStrong};font-size:16px;font-weight:700;word-break:break-all;">${escapeHtml(value)}</p>
    </td>
  </tr>
</table>`;
}

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px 0;">
  <tr>
    <td style="background-color:${THEME.accent};border-radius:999px;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-family:${FONT_STACK};font-size:15px;font-weight:700;text-decoration:none;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

/** Sent to whoever asked for access. */
export function buildApplicantEmail(email: string): BetaEmail {
  const body = [
    paragraph("Thanks for signing up to the Moonrakers Command beta."),
    calloutRow("Google Play account", email),
    paragraph(
      `We have your request. You'll be added to the tester list and get a Google Play invite at this address — keep an eye on it, including the spam folder.`,
    ),
    paragraph(
      `If you have any questions or bug feedback, please reach out to Izzy at ${link(
        `mailto:${SUPPORT_EMAIL}`,
        SUPPORT_EMAIL,
      )}.`,
    ),
    paragraph(
      "In the meantime, the preview shows every chart, every statistic, and the game entry screen — no account needed.",
    ),
    button("https://www.moonrakersapp.org/preview", "Open the preview"),
  ].join("\n");

  return {
    subject: "Thanks for signing up to the Moonrakers beta",
    html: shell({
      body,
      eyebrow: "Beta access",
      heading: "Thanks for signing up",
      preheader: "We have your request for Moonrakers Command beta access.",
    }),
    text: [
      "Thanks for signing up to the Moonrakers Command beta.",
      "",
      `Google Play account: ${email}`,
      "",
      "We have your request. You'll be added to the tester list and get a Google Play invite at this address - keep an eye on it, including the spam folder.",
      "",
      `If you have any questions or bug feedback, please reach out to Izzy at ${SUPPORT_EMAIL}.`,
      "",
      "In the meantime, the preview shows every chart, statistic, and the game entry screen - no account needed:",
      "https://www.moonrakersapp.org/preview",
    ].join("\n"),
  };
}

/**
 * Sent from the admin console once someone has been added to the tester group.
 * The wording is the operator's, kept verbatim; only the link is turned into a
 * button so the same sentence works in both the HTML and plain-text parts.
 */
export function buildInviteEmail(): BetaEmail {
  const body = [
    paragraph("Thank you for registering for the Moonraker's Beta test!"),
    paragraph(
      "You are now eligible to download the app from the GooglePlay store using this link:",
    ),
    button(PLAY_STORE_URL, "Get Moonrakers on Google Play"),
    paragraph(link(PLAY_STORE_URL, PLAY_STORE_URL)),
    paragraph(
      `If you have any questions or concerns please reach out to ${link(
        `mailto:${SUPPORT_EMAIL}`,
        SUPPORT_EMAIL,
      )}.`,
    ),
  ].join("\n");

  return {
    subject: "You're in — the Moonrakers beta is ready to download",
    html: shell({
      body,
      eyebrow: "Beta access",
      heading: "You're on the tester list",
      preheader: "Download Moonrakers Command from Google Play.",
    }),
    text: [
      "Thank you for registering for the Moonraker's Beta test!",
      "",
      "You are now eligible to download the app from the GooglePlay store using this link:",
      PLAY_STORE_URL,
      "",
      `If you have any questions or concerns please reach out to ${SUPPORT_EMAIL}.`,
    ].join("\n"),
  };
}

/** Sent to Izzy, with the one action that cannot be automated made one click. */
export function buildNotificationEmail(email: string): BetaEmail {
  const body = [
    paragraph("Someone asked for beta access from the preview page."),
    calloutRow("Add this address to the tester group", email),
    button(`${BETA_GROUP_URL}/members`, "Open group members"),
    paragraph(
      `Google's member API only covers Workspace groups, so a consumer group has to be added to by hand. Paste the address above into ${link(
        `${BETA_GROUP_URL}/members`,
        "Add members",
      )}.`,
    ),
    paragraph(
      `They have already had the thank-you email, so nothing is owed to them right now.`,
    ),
  ].join("\n");

  return {
    subject: `Beta access request: ${email}`,
    html: shell({
      body,
      eyebrow: "New request",
      heading: "Beta access request",
      preheader: `${email} asked for beta access.`,
    }),
    text: [
      "Someone asked for beta access from the preview page.",
      "",
      `Add this address to the tester group: ${email}`,
      "",
      `Group members: ${BETA_GROUP_URL}/members`,
      "",
      "Google's member API only covers Workspace groups, so a consumer group has to be added to by hand.",
      "They have already had the thank-you email.",
    ].join("\n"),
  };
}
