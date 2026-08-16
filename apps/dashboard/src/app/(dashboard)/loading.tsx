import { DashboardPanel } from "@/components/ui/DashboardPanel";

export default function DashboardLoading() {
  return (
    <section className="view-stack">
      <DashboardPanel padding="spacious" tone="accent">
        <div className="view-stack">
          <div
            className="loading-shimmer"
            style={{ width: "8rem", height: "0.85rem", borderRadius: "999px" }}
          />
          <div
            className="loading-shimmer"
            style={{ width: "18rem", height: "2.8rem", borderRadius: "1rem" }}
          />
          <div
            className="loading-shimmer"
            style={{ width: "100%", height: "5rem", borderRadius: "1rem" }}
          />
        </div>
      </DashboardPanel>

      <div className="stat-grid">
        {[0, 1, 2].map((entry) => (
          <DashboardPanel
            key={entry}
            as="article"
            padding="normal"
            style={{ minHeight: "11rem" }}
          >
            <div className="view-stack">
              <div
                className="loading-shimmer"
                style={{ width: "7rem", height: "0.8rem", borderRadius: "999px" }}
              />
              <div
                className="loading-shimmer"
                style={{ width: "5rem", height: "2.4rem", borderRadius: "1rem" }}
              />
              <div
                className="loading-shimmer"
                style={{ width: "100%", height: "3.4rem", borderRadius: "1rem" }}
              />
            </div>
          </DashboardPanel>
        ))}
      </div>
    </section>
  );
}
