type EmptyStatePanelProps = {
  action?: React.ReactNode;
  copy: string;
  eyebrow: string;
  title: string;
};

export function EmptyStatePanel({
  action,
  copy,
  eyebrow,
  title,
}: EmptyStatePanelProps) {
  return (
    <div className="empty">
      <p className="eyebrow" style={{ margin: 0 }}>
        {eyebrow}
      </p>
      <h3 className="empty__title">{title}</h3>
      <p className="empty__copy">{copy}</p>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
