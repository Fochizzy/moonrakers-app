import { Fragment } from "react";

import {
  AFFILIATION_DISCLAIMER,
  CREDIT_LINE_PREFIX,
  getCreditLinks,
} from "@/lib/siteCredits";

/**
 * The credit and disclaimer every page ends on. Rendered by each shell rather
 * than by the root layout, because the shells set their own min-height and a
 * footer appended after one of them would land a screen below the content.
 */
export function SiteFooter() {
  const links = getCreditLinks();

  return (
    <footer className="site-footer">
      {/* The separators are real spaces rather than CSS padding, so a screen
          reader does not run the three labels together into one word. */}
      <p className="site-footer__line">
        {CREDIT_LINE_PREFIX}
        {links.map((link) => (
          <Fragment key={link.label}>
            <span className="site-footer__dot">{" · "}</span>
            {link.href ? (
              <a
                className="site-footer__link"
                href={link.href}
                rel="noreferrer"
                target="_blank"
              >
                {link.label}
              </a>
            ) : (
              link.label
            )}
          </Fragment>
        ))}
      </p>
      <p className="site-footer__note">{AFFILIATION_DISCLAIMER}</p>
    </footer>
  );
}
