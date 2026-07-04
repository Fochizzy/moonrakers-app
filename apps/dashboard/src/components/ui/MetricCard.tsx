import { DashboardPanel } from "./DashboardPanel";

type MetricCardProps = {
  accent?: string;
  detail?: string;
  label: string;
  value: string | number;
};

export function MetricCard({
  accent,
  detail,
  label,
  value,
}: MetricCardProps) {
  const valueColor = accent?.trim() || "var(--text-strong)";

  return (
    <DashboardPanel
      as="article"
      padding="normal"
      tone={accent ? "accent" : "default"}
      style={{ minHeight: "100%", display: "grid", gap: "0.7rem" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "var(--sub)",
            fontSize: "0.76rem",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </p>
        <span
          aria-hidden="true"
          style={{
            width: "0.65rem",
            height: "0.65rem",
            borderRadius: "999px",
            background: valueColor,
            boxShadow: `0 0 18px ${valueColor}`,
            flexShrink: 0,
          }}
        />
      </div>

      <p
        style={{
          margin: 0,
          color: valueColor,
          fontSize: "clamp(1.6rem, 2.8vw, 2.35rem)",
          fontWeight: 800,
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        {value}
      </p>

      {detail ? (
        <p
          style={{
            margin: 0,
            color: "var(--sub)",
            fontSize: "0.95rem",
            lineHeight: 1.55,
          }}
        >
          {detail}
        </p>
      ) : null}
    </DashboardPanel>
  );
}
