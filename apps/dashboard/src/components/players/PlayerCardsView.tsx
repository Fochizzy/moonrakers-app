"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
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
        <PageHeader
          copy="Fleet cards ranked by rating, with the record and production behind each one."
          eyebrow="Player Cards"
          title="Card gallery"
        />
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
      <PageHeader
        copy="Fleet cards ranked by rating, with the record and production behind each one."
        eyebrow="Player Cards"
        title="Card gallery"
      />

      <DashboardPanel padding="normal" tone="success">
        <div className="panel-head">
          <div className="panel-head__text">
            <p className="eyebrow" style={{ margin: 0 }}>
              Rank #{focusedPlayer.rank}
            </p>
            <h2 className="panel-title" style={{ fontSize: "var(--t-lg)" }}>
              {focusedPlayer.name}
            </h2>
            <p className="panel-copy">
              {focusedPlayer.gamesPlayed > 0
                ? `${focusedPlayer.wins} wins · ${winRate(focusedPlayer)}% win rate across ${focusedPlayer.gamesPlayed} games`
                : "No logged games yet"}
            </p>
          </div>
          <Link
            className="btn btn--primary"
            href={`/player-profile/${encodeURIComponent(focusedPlayer.id)}`}
          >
            Open profile
          </Link>
        </div>

        <div className="stat-grid">
          <MetricCard
            accent={focusedPlayer.color?.trim() || "var(--accent)"}
            label="Current ELO"
            value={focusedPlayer.currentElo}
          />
          <MetricCard label="Peak ELO" value={focusedPlayer.peakElo} />
          <MetricCard label="Prestige" value={focusedPlayer.prestige} />
          <MetricCard label="Score" value={focusedPlayer.score} />
        </div>
      </DashboardPanel>

      <DashboardPanel padding="normal">
        <div className="panel-head">
          <div className="panel-head__text">
            <p className="eyebrow" style={{ margin: 0 }}>
              Gallery
            </p>
            <h2 className="panel-title">All cards</h2>
          </div>
          <span className="panel-count">
            {visiblePlayers.length} of {rankedPlayers.length} cards shown.
          </span>
        </div>

        <div className="stack-md">
          <label className="field">
            <span className="field__label">Search players</span>
            <input
              className="input"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name"
              type="search"
              value={query}
            />
          </label>

          {visiblePlayers.length === 0 ? (
            <p className="panel-copy" style={{ margin: 0 }}>
              No player matches that search.
            </p>
          ) : (
            <div className="card-grid">
              {visiblePlayers.map((player) => (
                <Link
                  className={
                    player.id === focusedPlayer.id ? "tile row--focus" : "tile"
                  }
                  href={`/player-cards?playerId=${encodeURIComponent(player.id)}`}
                  key={player.id}
                  style={{
                    borderTop: `3px solid ${player.color?.trim() || "var(--accent)"}`,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                    }}
                  >
                    <span className="tile__title">{player.name}</span>
                    <span className="tile__meta">#{player.rank}</span>
                  </span>

                  <span className="tile-stats">
                    <span className="statline__item">
                      <span className="statline__label">ELO</span>
                      <span className="statline__value">{player.currentElo}</span>
                    </span>
                    <span className="statline__item">
                      <span className="statline__label">Win rate</span>
                      <span className="statline__value">{winRate(player)}%</span>
                    </span>
                    <span className="statline__item">
                      <span className="statline__label">Games</span>
                      <span className="statline__value">{player.gamesPlayed}</span>
                    </span>
                    <span className="statline__item">
                      <span className="statline__label">Prestige</span>
                      <span className="statline__value">{player.prestige}</span>
                    </span>
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
