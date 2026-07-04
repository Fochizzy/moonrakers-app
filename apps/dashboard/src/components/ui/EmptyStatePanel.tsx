import { DashboardPanel } from "./DashboardPanel";

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
    <DashboardPanel padding="spacious" tone="blue">
      <div style={{ display: "grid", gap: "0.8rem" }}>
        <p className="section-eyebrow" style={{ margin: 0 }}>
          {eyebrow}
        </p>
        <h3
          style={{
            margin: 0,
            color: "var(--text-strong)",
            fontSize: "1.55rem",
            letterSpacing: "-0.03em",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: 0,
            color: "var(--sub)",
            fontSize: "1rem",
            lineHeight: 1.7,
            maxWidth: "42rem",
          }}
        >
          {copy}
        </p>
        {action ? <div>{action}</div> : null}
      </div>
    </DashboardPanel>
  );
}
