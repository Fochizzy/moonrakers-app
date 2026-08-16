/**
 * The three emails the beta flow sends: a thank-you to the applicant, the
 * invite once they are on the tester list, and a notification to Izzy.
 *
 * Written as inline-styled tables rather than with the dashboard's stylesheet.
 * Mail clients strip `<style>` blocks, do not resolve CSS custom properties,
 * and several still ignore flex and grid — so the palette below is literal hex
 * and the layout is a fixed-width centred table.
 *
 * Light shell, dark brand band. The dashboard is dark end to end, and these
 * used to be too, but a dark email is the one thing Gmail and Outlook dark
 * modes reliably ruin: they invert what they think is a light design and land
 * on dark text over a dark panel. A light email renders the same in both
 * modes, and the brand still leads because the header band is the app's navy.
 */

/** Literal hex, because mail clients never resolve a CSS variable. */
const THEME = {
  /** Purple from the app, darkened until white text on it is legible. */
  accent: "#7c3aed",
  /** The app's navy, used for the header band and headings. */
  brand: "#0b1220",
  border: "#dfe4ee",
  callout: "#f4f6fb",
  card: "#ffffff",
  /** Teal from the app, darkened to stay readable on white. */
  gold: "#0f766e",
  /** Teal as it appears on the navy band, where it can stay bright. */
  goldOnBrand: "#5eead4",
  muted: "#6b7688",
  page: "#eef1f7",
  text: "#2b3444",
  textOnBrand: "#e7ecf6",
} as const;

/**
 * Single quotes, not double. Every use of this sits inside a `style="…"`
 * attribute, and a double quote there closes the attribute early — silently
 * dropping the font and every declaration after it. That is what made these
 * mails render in the client's default serif.
 */
const FONT_STACK = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

/**
 * The product name, in one place because it appears in the brand band, the
 * footer, two subject lines and the body copy — and because "Moonrakers" on its
 * own is the board game, not this app.
 *
 * Two spellings: the entity is for the HTML part, and the plain apostrophe for
 * subjects, preheaders and the text alternative, where a client would render
 * `&rsquo;` literally.
 */
export const APP_NAME = "Moonraker's Analytics";
const APP_NAME_HTML = "Moonraker&rsquo;s Analytics";

export const SUPPORT_EMAIL = "info@moonrakersapp.org";
export const BETA_GROUP_URL = "https://groups.google.com/g/moonrakers-beta";
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.fochizzy.moonrakers";
export const PREVIEW_URL = "https://www.moonrakersapp.org/preview";

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

/**
 * Gmail pads the preview line with whatever body copy follows the preheader.
 * Trailing zero-width joiners give it nothing to find.
 */
const PREHEADER_PAD = "&#8204;&nbsp;".repeat(60);

/** Resets Outlook's table spacing, which it applies whether asked or not. */
const TABLE_RESET =
  "border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;";

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
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Declared light so a client does not "helpfully" invert it into mush. -->
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(heading)}</title>
<!--[if mso]>
<xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<![endif]-->
<style>
  /* Progressive enhancement only — every rule that matters is also inline. */
  @media only screen and (max-width:600px) {
    .mk-pad { padding-left:20px !important; padding-right:20px !important; }
    .mk-h1 { font-size:22px !important; }
    .mk-btn a { display:block !important; text-align:center !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:${THEME.page};color:${THEME.text};font-family:${FONT_STACK};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader)}${PREHEADER_PAD}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${THEME.page}" style="${TABLE_RESET}background-color:${THEME.page};">
  <tr>
    <td align="center" style="padding:28px 12px;">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->

      <!-- width attribute as well as max-width: Outlook ignores the CSS. -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="${TABLE_RESET}width:100%;max-width:600px;background-color:${THEME.card};border:1px solid ${THEME.border};border-radius:14px;overflow:hidden;">
        <tr>
          <td bgcolor="${THEME.brand}" class="mk-pad" style="background-color:${THEME.brand};padding:20px 32px;">
            <p style="margin:0;color:#ffffff;font-family:${FONT_STACK};font-size:15px;font-weight:800;letter-spacing:-0.01em;">${APP_NAME_HTML}</p>
            <p style="margin:4px 0 0 0;color:${THEME.goldOnBrand};font-family:${FONT_STACK};font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
          </td>
        </tr>
        <tr>
          <td class="mk-pad" style="padding:28px 32px 8px 32px;">
            <h1 class="mk-h1" style="margin:0;color:${THEME.brand};font-family:${FONT_STACK};font-size:25px;font-weight:800;letter-spacing:-0.02em;line-height:1.25;">${escapeHtml(heading)}</h1>
          </td>
        </tr>
        <tr>
          <td class="mk-pad" style="padding:12px 32px 30px 32px;">${body}</td>
        </tr>
      </table>

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="${TABLE_RESET}width:100%;max-width:600px;">
        <tr>
          <td class="mk-pad" style="padding:16px 32px 0 32px;">
            <p style="margin:0;color:${THEME.muted};font-family:${FONT_STACK};font-size:12px;line-height:1.6;">
              Sent by ${APP_NAME_HTML} because this address was entered at
              <a href="${PREVIEW_URL}" style="color:${THEME.muted};text-decoration:underline;">moonrakersapp.org</a>.
              Questions: <a href="mailto:${SUPPORT_EMAIL}" style="color:${THEME.muted};text-decoration:underline;">${SUPPORT_EMAIL}</a>
            </p>
          </td>
        </tr>
      </table>

      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`;
}

function paragraph(html: string) {
  return `<p style="margin:0 0 14px 0;color:${THEME.text};font-family:${FONT_STACK};font-size:15px;line-height:1.65;">${html}</p>`;
}

function link(href: string, label: string) {
  return `<a href="${escapeHtml(href)}" style="color:${THEME.gold};font-weight:600;text-decoration:underline;">${escapeHtml(label)}</a>`;
}

/** The one fact the reader most needs to check, boxed so it cannot be skimmed. */
function calloutRow(label: string, value: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${TABLE_RESET}background-color:${THEME.callout};border:1px solid ${THEME.border};border-radius:10px;margin:0 0 18px 0;">
  <tr>
    <td style="padding:14px 16px;">
      <p style="margin:0 0 4px 0;color:${THEME.muted};font-family:${FONT_STACK};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(label)}</p>
      <p style="margin:0;color:${THEME.brand};font-family:${FONT_STACK};font-size:16px;font-weight:700;word-break:break-word;">${escapeHtml(value)}</p>
    </td>
  </tr>
</table>`;
}

/** Numbered "what happens next", so the wait is expected rather than silent. */
function steps(items: string[]) {
  const rows = items
    .map(
      (item, index) => `  <tr>
    <td width="26" valign="top" style="padding:0 10px 10px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="${TABLE_RESET}"><tr>
        <td width="22" height="22" align="center" valign="middle" bgcolor="${THEME.accent}" style="background-color:${THEME.accent};border-radius:11px;color:#ffffff;font-family:${FONT_STACK};font-size:12px;font-weight:700;line-height:22px;">${index + 1}</td>
      </tr></table>
    </td>
    <td valign="top" style="padding:0 0 10px 0;color:${THEME.text};font-family:${FONT_STACK};font-size:15px;line-height:1.5;">${item}</td>
  </tr>`,
    )
    .join("\n");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${TABLE_RESET}margin:0 0 18px 0;">
${rows}
</table>`;
}

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="mk-btn" style="${TABLE_RESET}margin:2px 0 16px 0;">
  <tr>
    <td bgcolor="${THEME.accent}" align="center" style="background-color:${THEME.accent};border-radius:8px;mso-padding-alt:13px 24px;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 24px;color:#ffffff;font-family:${FONT_STACK};font-size:15px;font-weight:700;line-height:1;text-decoration:none;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

/** Buttons get blocked and images get stripped; a plain link always survives. */
function fallbackLink(href: string) {
  return `<p style="margin:-6px 0 16px 0;color:${THEME.muted};font-family:${FONT_STACK};font-size:12px;line-height:1.6;word-break:break-word;">Button not working? Paste this into your browser:<br><a href="${escapeHtml(href)}" style="color:${THEME.muted};text-decoration:underline;">${escapeHtml(href)}</a></p>`;
}

function divider() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${TABLE_RESET}margin:2px 0 16px 0;"><tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:${THEME.border};">&nbsp;</td></tr></table>`;
}

/**
 * Sent automatically the moment the preview form is submitted. It promises the
 * second email rather than the app itself: the download link only goes out once
 * the request has been confirmed in the operator console.
 */
export function buildApplicantEmail(email: string): BetaEmail {
  const body = [
    paragraph(
      `Thank you for registering for the ${APP_NAME_HTML} beta. There is nothing else you need to do right now.`,
    ),
    calloutRow("Registered address", email),
    paragraph("<strong>What happens next</strong>"),
    steps([
      "We confirm your request.",
      `You receive a second email at the address above with a link to download the app from the Google Play Store. <strong>Check your spam folder</strong> if it does not appear.`,
    ]),
    paragraph(
      `If that address is wrong, or nothing has arrived in a few days, reply to this email or write to ${link(
        `mailto:${SUPPORT_EMAIL}`,
        SUPPORT_EMAIL,
      )} — questions and bug feedback both go there.`,
    ),
    divider(),
    paragraph(
      "In the meantime, the preview runs every chart, every published metric and the live game entry screen against real tracked games. No account needed.",
    ),
    button(PREVIEW_URL, "Open the preview"),
  ].join("\n");

  return {
    subject: `Thank you for registering for the ${APP_NAME} beta`,
    html: shell({
      body,
      eyebrow: "Beta access",
      heading: "Thank you for registering",
      preheader: `Registered ${email}. A confirmation with your download link follows.`,
    }),
    text: [
      `Thank you for registering for the ${APP_NAME} beta.`,
      "There is nothing else you need to do right now.",
      "",
      `Registered address: ${email}`,
      "",
      "WHAT HAPPENS NEXT",
      "1. We confirm your request.",
      "2. You receive a second email at the address above with a link to download the app from the Google Play Store. Check your spam folder if it does not appear.",
      "",
      `If that address is wrong, or nothing has arrived in a few days, reply to this email or write to ${SUPPORT_EMAIL} - questions and bug feedback both go there.`,
      "",
      "In the meantime, the preview runs every chart, every published metric and the live game entry screen against real tracked games. No account needed:",
      PREVIEW_URL,
    ].join("\n"),
  };
}

/**
 * The confirmation, sent from the operator console. This is the one that
 * carries the download link, so the button is the whole point of the layout and
 * the plain link underneath is there for clients that strip it.
 */
export function buildInviteEmail(): BetaEmail {
  const body = [
    paragraph("Thank you for confirming your interest in the beta."),
    paragraph("Please download the app from the Google Play Store:"),
    button(PLAY_STORE_URL, "Download on Google Play"),
    fallbackLink(PLAY_STORE_URL),
    divider(),
    paragraph(
      `Any questions or concerns, please email ${link(
        `mailto:${SUPPORT_EMAIL}`,
        SUPPORT_EMAIL,
      )}.`,
    ),
  ].join("\n");

  return {
    subject: `Your ${APP_NAME} beta download link`,
    html: shell({
      body,
      eyebrow: "Beta access confirmed",
      heading: "Thank you for confirming",
      preheader: `Download ${APP_NAME} from the Google Play Store.`,
    }),
    text: [
      "Thank you for confirming your interest in the beta.",
      "",
      "Please download the app from the Google Play Store:",
      PLAY_STORE_URL,
      "",
      `Any questions or concerns, please email ${SUPPORT_EMAIL}.`,
    ].join("\n"),
  };
}

/** Sent to Izzy, with the one action that cannot be automated made one click. */
export function buildNotificationEmail(email: string): BetaEmail {
  const body = [
    paragraph("Someone asked for beta access from the preview page."),
    calloutRow("Add this address to the tester group", email),
    button(`${BETA_GROUP_URL}/members`, "Open group members"),
    fallbackLink(`${BETA_GROUP_URL}/members`),
    divider(),
    paragraph(
      `Google's member API only covers Workspace groups, so a consumer group has to be added to by hand — paste the address above into ${link(
        `${BETA_GROUP_URL}/members`,
        "Add members",
      )}.`,
    ),
    paragraph(
      "They have already had the thank-you email, so nothing is owed to them right now.",
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
