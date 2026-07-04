import { DashboardPanel } from "@/components/ui/DashboardPanel";

type DashboardTopbarProps = {
  favoriteColor: string | null;
  profileName: string;
};

export function DashboardTopbar({
  favoriteColor,
  profileName,
}: DashboardTopbarProps) {
  const profileAccent = favoriteColor?.trim() || "var(--gold)";

  return (
    <DashboardPanel
      as="header"
      padding="normal"
      tone="accent"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "grid", gap: "0.45rem", minWidth: 0 }}>
        <p className="section-eyebrow" style={{ margin: 0 }}>
          Captain&apos;s Log
        </p>
        <div style={{ display: "grid", gap: "0.25rem" }}>
          <h2
            style={{
              margin: 0,
              color: "var(--text-strong)",
              fontSize: "1.2rem",
              letterSpacing: "-0.03em",
            }}
          >
            Signed-in personal dashboard
          </h2>
          <p
            style={{
              margin: 0,
              color: "var(--sub)",
              fontSize: "0.96rem",
              lineHeight: 1.6,
            }}
          >
            Compare crews, scan correlations, and track your published Moonrakers
            trends from one command rail.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.75rem 0.95rem",
          borderRadius: "999px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          background: "rgba(255, 255, 255, 0.04)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: "0.85rem",
            height: "0.85rem",
            borderRadius: "999px",
            background: profileAccent,
            boxShadow: `0 0 18px ${profileAccent}`,
            flexShrink: 0,
          }}
        />
        <div style={{ display: "grid", gap: "0.1rem" }}>
          <span
            style={{
              color: "var(--muted)",
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Active Pilot
          </span>
          <span
            style={{
              color: "var(--text-strong)",
              fontSize: "0.98rem",
              fontWeight: 700,
            }}
          >
            {profileName}
          </span>
        </div>
      </div>
    </DashboardPanel>
  );
}
