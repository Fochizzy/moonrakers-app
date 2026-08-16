"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Without this boundary a failed loader dropped the reader onto the raw Next.js
 * error screen, outside the dashboard shell and with no way back.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <section className="view-stack">
      <div className="empty">
        <p className="eyebrow" style={{ margin: 0 }}>
          Something broke
        </p>
        <h1 className="empty__title">This page could not load</h1>
        <p className="empty__copy">
          The analytics service did not answer for this view. Retrying usually
          clears it; if it keeps failing, the published data may still be
          refreshing.
        </p>
        {error.digest ? (
          <p className="tile__meta">Reference {error.digest}</p>
        ) : null}
        <div className="page-header__actions">
          <button className="btn btn--primary" onClick={reset} type="button">
            Try again
          </button>
          <Link className="btn" href="/">
            Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}
