import type { EloScreenPayload } from "@moonrakers/analytics-contract";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionHeading } from "@/components/ui/SectionHeading";

const sortOptions = [
  ["elo", "ELO"],
  ["wins", "Wins"],
  ["games", "Games"],
  ["score", "Score"],
  ["prestige", "Prestige"],
  ["efficiency", "Efficiency"],
  ["avgPrestige", "Avg Prestige"],
] as const;

export function EloView({ payload }: { payload: EloScreenPayload }) {
  const selectedPlayerId = payload.selectedPlayerId ?? "";
  const selectedOpponentId = payload.selectedOpponentId ?? "";

  return (
    <section className="view-stack">
      <SectionHeading
        eyebrow="ELO"
        title="Leaderboard command table"
        copy="Player and opponent filters stay visible above the leaderboard so the signed-in dashboard keeps compare context in reach."
      />

      <DashboardPanel tone="blue">
        <form style={{ display: "grid", gap: "1rem" }}>
          <div className="metric-grid">
            <label style={{ display: "grid", gap: "0.45rem" }}>
              <span className="section-eyebrow" style={{ margin: 0 }}>
                Focus Player
              </span>
              <select
                aria-label="Focus Player"
                defaultValue={selectedPlayerId}
                name="focusPlayerId"
                style={{
                  width: "100%",
                  padding: "0.95rem 1rem",
                  borderRadius: "1rem",
                  border: "1px solid rgba(96, 165, 250, 0.34)",
                  background: "rgba(7, 12, 28, 0.84)",
                  color: "var(--text-strong)",
                }}
              >
                <option value="">All pilots</option>
                {payload.playerOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                    {typeof option.currentElo === "number"
                      ? ` - ${Math.round(option.currentElo)} ELO`
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: "0.45rem" }}>
              <span className="section-eyebrow" style={{ margin: 0 }}>
                Opponent
              </span>
              <select
                aria-label="Opponent"
                defaultValue={selectedOpponentId}
                name="opponentId"
                style={{
                  width: "100%",
                  padding: "0.95rem 1rem",
                  borderRadius: "1rem",
                  border: "1px solid rgba(45, 212, 191, 0.34)",
                  background: "rgba(7, 12, 28, 0.84)",
                  color: "var(--text-strong)",
                }}
              >
                <option value="">Any rival</option>
                {payload.playerOptions
                  .filter((option) => option.id !== selectedPlayerId)
                  .map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                      {typeof option.currentElo === "number"
                        ? ` - ${Math.round(option.currentElo)} ELO`
                        : ""}
                    </option>
                  ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: "0.45rem" }}>
              <span className="section-eyebrow" style={{ margin: 0 }}>
                Sort
              </span>
              <select
                aria-label="Sort"
                defaultValue={payload.sortKey}
                name="sortKey"
                style={{
                  width: "100%",
                  padding: "0.95rem 1rem",
                  borderRadius: "1rem",
                  border: "1px solid rgba(168, 85, 247, 0.34)",
                  background: "rgba(7, 12, 28, 0.84)",
                  color: "var(--text-strong)",
                }}
              >
                {sortOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              style={{
                padding: "0.9rem 1.1rem",
                borderRadius: "1rem",
                border: "1px solid rgba(168, 85, 247, 0.38)",
                background:
                  "linear-gradient(135deg, rgba(168, 85, 247, 0.24) 0%, rgba(59, 130, 246, 0.22) 100%)",
                color: "var(--text-strong)",
                fontWeight: 700,
              }}
            >
              Update Board
            </button>
          </div>
        </form>
      </DashboardPanel>

      {payload.summary ? (
        <div className="metric-grid">
          <MetricCard label="Current ELO" value={payload.summary.currentElo} accent="var(--accent)" />
          <MetricCard label="Peak ELO" value={payload.summary.peakElo} accent="var(--blue)" />
          <MetricCard label="Recent Form" value={payload.summary.recentForm} accent="var(--gold)" />
        </div>
      ) : payload.topCards.length > 0 ? (
        <div className="metric-grid">
          {payload.topCards.map((card) => (
            <MetricCard key={card.key} label={card.label} value={card.value} />
          ))}
        </div>
      ) : null}

      {payload.leaderboardRows.length > 0 ? (
        <div className="view-stack">
          <SectionHeading
            eyebrow="Leaderboard"
            title="Published ranking rows"
            copy="This table is sourced from the same server-authored leaderboard feed as the mobile experience."
          />
          <div className="metric-grid">
            {payload.leaderboardRows.map((row) => (
              <DashboardPanel
                key={row.playerId}
                as="article"
                tone="accent"
                style={{ display: "grid", gap: "0.6rem" }}
              >
                <p className="section-eyebrow" style={{ margin: 0 }}>
                  Rank #{row.rank}
                </p>
                <h3
                  style={{
                    margin: 0,
                    color: "var(--text-strong)",
                    fontSize: "1.2rem",
                    letterSpacing: "-0.03em",
                  }}
                >
                  {row.name}
                </h3>
                <p style={{ margin: 0, color: "var(--sub)", lineHeight: 1.65 }}>
                  ELO {Math.round(row.currentElo)} • Peak {Math.round(row.peakElo)} • {row.wins}W-{row.losses}L
                </p>
              </DashboardPanel>
            ))}
          </div>
        </div>
      ) : (
        <EmptyStatePanel
          eyebrow="Leaderboard"
          title={payload.emptyState?.title ?? "No leaderboard rows returned"}
          copy={
            payload.emptyState?.description ??
            "The ELO route is ready, but the current payload did not return any leaderboard rows."
          }
        />
      )}
    </section>
  );
}
