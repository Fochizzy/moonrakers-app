import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <section className="view-stack">
      <div className="empty">
        <p className="eyebrow" style={{ margin: 0 }}>
          Not found
        </p>
        <h1 className="empty__title">That page is not on the dashboard</h1>
        <p className="empty__copy">
          The link may point at a chart, game, or player that no longer exists.
        </p>
        <div className="page-header__actions">
          <Link className="btn btn--primary" href="/">
            Back to home
          </Link>
          <Link className="btn" href="/charts">
            Chart catalog
          </Link>
          <Link className="btn" href="/history">
            Mission archive
          </Link>
        </div>
      </div>
    </section>
  );
}
