type PageHeaderProps = {
  actions?: React.ReactNode;
  copy?: string;
  eyebrow: string;
  meta?: React.ReactNode;
  title: string;
};

/**
 * The single title block at the top of a route. Deliberately not a panel — the
 * page title should read as a different layer from the content boxes below it.
 */
export function PageHeader({
  actions,
  copy,
  eyebrow,
  meta,
  title,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        <p className="eyebrow" style={{ margin: 0 }}>
          {eyebrow}
        </p>
        <h1 className="page-header__title">{title}</h1>
        {copy ? <p className="page-header__copy">{copy}</p> : null}
        {meta ? <p className="page-header__meta">{meta}</p> : null}
      </div>

      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}
