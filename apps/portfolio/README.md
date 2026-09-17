# Portfolio

A single-page portfolio of the things I've shipped with Codex and Claude Code,
served as static assets from a Cloudflare Worker.

No framework, no build step, no dependencies at runtime. Cloudflare serves
`public/` straight off the edge, so there is no Worker script to cold-start.

Two pages:

- `public/index.html` — the portfolio.
- `public/resume.html` — the full résumé, at `/resume`. Dark on screen and
  black-on-white when printed, so the browser's own "Save as PDF" produces a
  clean paper copy. There is no .docx or .pdf checked in; this page is the
  résumé.

## A note on what is published

This repository is **public**, and so is everything in `public/`.

The résumé carries the contact email but **no phone number**, on purpose.
`scripts/check-page.mjs` fails the check if anything phone-number-shaped
appears in either page — matched as a pattern rather than a literal, so the
number itself never has to be committed here to check against. The street-level
detail is trimmed to city and state for the same reason.

If you ever want the phone number on the published résumé, remove that check
first; do not work around it.

## Add the photo

The page expects a portrait at:

```
public/media/portrait.jpg
```

Drop your photo in at that exact path and it appears in the hero. Until then the
page falls back to an `IH` monogram rather than a broken image, so it is always
safe to deploy.

The photo in place is 720×720, which is comfortably above what the 250px circle
needs on a high-density screen. A square source is cropped not at all — swap in
a non-square one and `object-position: center 22%` on `.portrait__img` decides
which part survives the crop.

## Run it locally

```sh
npm install
npm run dev --workspace @moonrakers/portfolio
```

Wrangler serves `public/` at `http://localhost:8787`.

## Check before deploying

```sh
npm run check --workspace @moonrakers/portfolio
```

Verifies every project and Play Store link is present and correctly formed, that
external anchors carry `rel="noopener noreferrer"`, and warns if the portrait is
still missing.

## Deploy

```sh
npm run deploy --workspace @moonrakers/portfolio
```

Publishes to `https://portfolio.<your-subdomain>.workers.dev`.

To put it on a custom domain, add a route to `wrangler.jsonc`:

```jsonc
"routes": [{ "pattern": "yourdomain.com", "custom_domain": true }]
```

Cloudflare creates the DNS record and edge certificate on deploy, provided the
zone is active in the account. Declaring routes makes Wrangler default
`workers_dev` to `false`, so keep `"workers_dev": true` if you want the
`workers.dev` URL to stay up as a fallback — same pattern as
`apps/dashboard/wrangler.jsonc`.

## Editing the content

Everything is in `public/index.html`:

- **Project blurbs** — one `<p>` inside each `.card`.
- **Links** — the `href` on each `.card`. If you change one, update the
  `expected` list in `scripts/check-page.mjs` so the check keeps guarding it.
- **Build attribution** — every card ends with a `.card__built` line reading
  "Built with Codex + Claude Code". It is repeated on all nine deliberately:
  the same two tools built everything on the page, and seeing it on each card
  is the claim. `check-page.mjs` fails if a card is added without one.
- **Stat strip** — the four `.stat` blocks under the hero. These are hand-counted
  (6 sites, 5 of them on Cloudflare Workers, 3 Android apps), so bump them when
  you ship something new.
- **Colours** — the `:root` custom properties at the top of the `<style>` block.
  They mirror the tokens in `apps/dashboard/src/app/globals.css`, so the
  portfolio and the Moonrakers dashboard read as the same hand.
- **About section** — `#about` in `index.html`, with the credential panel in
  `.facts` beside it. The résumé itself lives in `public/resume.html`; keep the
  two in step when a role or certification changes.
