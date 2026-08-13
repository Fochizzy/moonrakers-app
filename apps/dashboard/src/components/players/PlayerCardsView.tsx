"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { RosterPlayer } from "@/lib/data/loadPlayerRoster";

type PlayerCardsViewProps = {
  focusPlayerId: string | null;
  players: RosterPlayer[];
  signedInPlayerId: string;
};

function winRate(player: RosterPlayer) {
  return player.gamesPlayed > 0
    ? Math.round((player.wins / player.gamesPlayed) * 100)
    : 0;
}

function CardStat({ label, value }: { label: string; value: string | number }) {
  return (
    <span style={{ display: "grid", gap: "0.15rem" }}>
      <span
        style={{
          color: "var(--muted)",
          fontSize: "0.7rem",
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{ color: "var(--text-strong)", fontSize: "1.05rem", fontWeight: 800 }}
      >
        {value}
      </span>
    </span>
  );
}

export function PlayerCardsView({
  focusPlayerId,
  players,
  signedInPlayerId,
}: PlayerCardsViewProps) {
  const [query, setQuery] = useState("");

  // Rank is recomputed from this gallery's own ordering so the "#n" badge
  // always matches the order the cards are shown in.
  const rankedPlayers = useMemo(
    () =>
      [...players]
        .sort((left, right) => {
          if (right.currentElo !== left.currentElo) {
            return right.currentElo - left.currentElo;
          }
          if (right.wins !== left.wins) {
            return right.wins - left.wins;
          }
          if (right.prestige !== left.prestige) {
            return right.prestige - left.prestige;
          }
          return left.name.localeCompare(right.name);
        })
        .map((player, index) => ({ ...player, rank: index + 1 })),
    [players],
  );

  const focusedPlayer = useMemo(() => {
    const requested = rankedPlayers.find(
      (player) => player.id === (focusPlayerId ?? signedInPlayerId),
    );
    return requested ?? rankedPlayers[0] ?? null;
  }, [focusPlayerId, rankedPlayers, signedInPlayerId]);

  const visiblePlayers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return rankedPlayers;
    }

    return rankedPlayers.filter((player) =>
      player.name.toLowerCase().includes(normalized),
    );
  }, [query, rankedPlayers]);

  if (rankedPlayers.length === 0 || !focusedPlayer) {
    return (
      <section className="view-stack">
        <EmptyStatePanel
          copy="Player cards are built from rated games. Save a game in the Moonrakers app and the gallery will fill in."
          eyebrow="Player Cards"
          title="No cards to show yet"
        />
      </section>
    );
  }

  return (
    <section className="view-stack">
      <DashboardPanel padding="spacious" tone="accent">
        <div style={{ display: "grid", gap: "1.25rem" }}>
          <SectionHeading
            copy="Fleet cards ranked by rating, with the record and production behind each one."
            eyebrow="Player Cards"
            title="Card gallery"
          />

          <label style={{ display: "grid", gap: "0.45rem" }}>
            <span
              style={{
                color: "var(--sub)",
                fontSize: "0.8rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Search players
            </span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name"
              style={{
                width: "100%",
                padding: "0.85rem 1rem",
                borderRadius: "0.9rem",
                border: "1px solid var(--border-strong)",
                background: "rgba(255, 255, 255, 0.04)",
                color: "var(--text-strong)",
                fontSize: "1rem",
              }}
              type="search"
              value={query}
            />
          </label>
        </div>
      </DashboardPanel>

      <DashboardPanel padding="spacious" tone="success">
        <div style={{ display: "grid", gap: "1.1rem" }}>
          <SectionHeading
            action={
              <Link
                href={`/player-profile/${encodeURIComponent(focusedPlayer.id)}`}
                style={{
                  padding: "0.7rem 1.05rem",
                  borderRadius: "999px",
                  border: "1px solid rgba(168, 85, 247, 0.4)",
                  background: "rgba(168, 85, 247, 0.16)",
                  color: "var(--text-strong)",
                  fontWeight: 700,
                }}
              >
                Open profile
              </Link>
            }
            copy={
              focusedPlayer.gamesPlayed > 0
                ? `${focusedPlayer.wins} wins · ${winRate(focusedPlayer)}% win rate across ${focusedPlayer.gamesPlayed} games`
                : "No logged games yet"
            }
            eyebrow={`Rank #${focusedPlayer.rank}`}
            title={focusedPlayer.name}
          />

          <div className="metric-grid">
            <MetricCard
              accent={focusedPlayer.color?.trim() || "var(--accent)"}
              label="Current ELO"
              value={focusedPlayer.currentElo}
            />
            <MetricCard label="Peak ELO" value={focusedPlayer.peakElo} />
            <MetricCard label="Prestige" value={focusedPlayer.prestige} />
            <MetricCard label="Score" value={focusedPlayer.score} />
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel padding="spacious">
        <div style={{ display: "grid", gap: "1rem" }}>
          <SectionHeading
            copy={`${visiblePlayers.length} of ${rankedPlayers.length} cards shown.`}
            eyebrow="Gallery"
            title="All cards"
          />

          {visiblePlayers.length === 0 ? (
            <p style={{ margin: 0, color: "var(--sub)" }}>
              No player matches that search.
            </p>
          ) : (
            <div className="metric-grid">
              {visiblePlayers.map((player) => (
                <Link
                  href={`/player-cards?playerId=${encodeURIComponent(player.id)}`}
                  key={player.id}
                  style={{
                    display: "grid",
                    gap: "0.7rem",
                    padding: "1.05rem",
                    borderRadius: "1.2rem",
                    border: `1px solid ${
                      player.id === focusedPlayer.id
                        ? "rgba(45, 212, 191, 0.5)"
                        : "var(--border)"
                    }`,
                    background:
                      player.id === focusedPlayer.id
                        ? "rgba(45, 212, 191, 0.08)"
                        : "rgba(255, 255, 255, 0.03)",
                    borderTop: `5px solid ${player.color?.trim() || "var(--accent)"}`,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: "0.6rem",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--text-strong)",
                        fontSize: "1.1rem",
                        fontWeight: 800,
                      }}
                    >
                      {player.name}
                    </span>
                    <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                      #{player.rank}
                    </span>
                  </span>

                  <span
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: "0.6rem",
                    }}
                  >
                    <CardStat label="ELO" value={player.currentElo} />
                    <CardStat label="Win rate" value={`${winRate(player)}%`} />
                    <CardStat label="Games" value={player.gamesPlayed} />
                    <CardStat label="Prestige" value={player.prestige} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </DashboardPanel>
    </section>
  );
}
