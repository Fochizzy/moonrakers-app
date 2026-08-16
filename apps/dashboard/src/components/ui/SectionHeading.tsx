type SectionHeadingProps = {
  action?: React.ReactNode;
  copy?: string;
  eyebrow: string;
  title: string;
};

/**
 * Heading for a panel's contents. Sits a level below PageHeader so a panel
 * inside a route never competes with the route title.
 */
export function SectionHeading({
  action,
  copy,
  eyebrow,
  title,
}: SectionHeadingProps) {
  return (
    <div className="panel-head">
      <div className="panel-head__text">
        <p className="eyebrow" style={{ margin: 0 }}>
          {eyebrow}
        </p>
        <h2 className="panel-title">{title}</h2>
        {copy ? <p className="panel-copy">{copy}</p> : null}
      </div>

      {action ? <div className="page-header__actions">{action}</div> : null}
    </div>
  );
}
