"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import type { RosterGroup, RosterPlayer } from "@/lib/data/loadPlayerRoster";

type PlayerDirectoryViewProps = {
  groups: RosterGroup[];
  players: RosterPlayer[];
  signedInPlayerId: string;
};

export function PlayerDirectoryView({
  groups,
  players,
  signedInPlayerId,
}: PlayerDirectoryViewProps) {
  const [query, setQuery] = useState("");

  const sortedPlayers = useMemo(
    () => [...players].sort((left, right) => left.name.localeCompare(right.name)),
    [players],
  );

  const visiblePlayers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return sortedPlayers;
    }

    return sortedPlayers.filter((player) =>
      player.name.toLowerCase().includes(normalized),
    );
  }, [query, sortedPlayers]);

  if (players.length === 0) {
    return (
      <section className="view-stack">
        <PageHeader
          copy="Every player this account can see, with their rating and record."
          eyebrow="Players"
          title="Profile directory"
        />
        <EmptyStatePanel
          copy="No players are visible to this account yet. Add players and groups in the Moonrakers app and they will show up here."
          eyebrow="Players"
          title="No profiles yet"
        />
      </section>
    );
  }

  return (
    <section className="view-stack">
      <PageHeader
        copy="Every player this account can see, with their rating and record. Open a profile for the full intel read."
        eyebrow="Players"
        title="Profile directory"
      />

      <div className="stat-grid">
        <MetricCard label="Players" value={players.length} />
        <MetricCard label="Groups" value={groups.length} />
        <MetricCard
          accent="var(--gold)"
          label="Rated players"
          value={players.filter((player) => player.gamesPlayed > 0).length}
        />
      </div>

      <DashboardPanel padding="normal">
        <div className="panel-head">
          <div className="panel-head__text">
            <p className="eyebrow" style={{ margin: 0 }}>
              Directory
            </p>
            <h2 className="panel-title">Profiles</h2>
          </div>
          <span className="panel-count">
            {visiblePlayers.length} of {players.length} profiles shown.
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
                    player.id === signedInPlayerId ? "tile row--focus" : "tile"
                  }
                  href={`/player-profile/${encodeURIComponent(player.id)}`}
                  key={player.id}
                  style={
                    {
                      borderLeft: `3px solid ${player.color?.trim() || "var(--accent)"}`,
                    } as React.CSSProperties
                  }
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                    }}
                  >
                    <span className="tile__title">{player.name}</span>
                    {player.id === signedInPlayerId ? (
                      <span className="statline__label">You</span>
                    ) : null}
                  </span>
                  <span className="tile__meta">
                    {player.gamesPlayed > 0
                      ? `${player.currentElo} ELO · ${player.wins}W / ${player.losses}L · ${player.gamesPlayed} games`
                      : "No rated games yet"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </DashboardPanel>

      {groups.length > 0 ? (
        <DashboardPanel padding="normal">
          <div className="panel-head">
            <div className="panel-head__text">
              <p className="eyebrow" style={{ margin: 0 }}>
                Roster
              </p>
              <h2 className="panel-title">Groups</h2>
            </div>
            <span className="panel-count">{groups.length} saved</span>
          </div>

          <div className="card-grid">
            {groups.map((group) => (
              <div className="tile" key={group.id}>
                <span className="tile__title">{group.name}</span>
                <span className="tile__meta">
                  {group.memberNames.length > 0
                    ? group.memberNames.join(" · ")
                    : "No members saved"}
                </span>
              </div>
            ))}
          </div>
        </DashboardPanel>
      ) : null}
    </section>
  );
}
