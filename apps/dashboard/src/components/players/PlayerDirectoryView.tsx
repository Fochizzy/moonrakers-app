"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
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
      <DashboardPanel padding="spacious" tone="accent">
        <div style={{ display: "grid", gap: "1.25rem" }}>
          <SectionHeading
            copy="Every player this account can see, with their rating and record. Open a profile for the full intel read."
            eyebrow="Players"
            title="Profile directory"
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

      <div className="metric-grid">
        <MetricCard label="Players" value={players.length} />
        <MetricCard label="Groups" value={groups.length} />
        <MetricCard
          accent="var(--gold)"
          label="Rated players"
          value={players.filter((player) => player.gamesPlayed > 0).length}
        />
      </div>

      <DashboardPanel padding="spacious">
        <div style={{ display: "grid", gap: "1rem" }}>
          <SectionHeading
            copy={`${visiblePlayers.length} of ${players.length} profiles shown.`}
            eyebrow="Directory"
            title="Profiles"
          />

          {visiblePlayers.length === 0 ? (
            <p style={{ margin: 0, color: "var(--sub)" }}>
              No player matches that search.
            </p>
          ) : (
            <div className="metric-grid">
              {visiblePlayers.map((player) => (
                <Link
                  href={`/player-profile/${encodeURIComponent(player.id)}`}
                  key={player.id}
                  style={{
                    display: "grid",
                    gap: "0.45rem",
                    padding: "1rem",
                    borderRadius: "1.1rem",
                    border: `1px solid ${
                      player.id === signedInPlayerId
                        ? "rgba(45, 212, 191, 0.45)"
                        : "var(--border)"
                    }`,
                    background:
                      player.id === signedInPlayerId
                        ? "rgba(45, 212, 191, 0.08)"
                        : "rgba(255, 255, 255, 0.03)",
                    borderLeft: `4px solid ${player.color?.trim() || "var(--accent)"}`,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.6rem",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--text-strong)",
                        fontSize: "1.05rem",
                        fontWeight: 700,
                      }}
                    >
                      {player.name}
                    </span>
                    {player.id === signedInPlayerId ? (
                      <span
                        style={{
                          color: "var(--gold)",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                        }}
                      >
                        You
                      </span>
                    ) : null}
                  </span>
                  <span style={{ color: "var(--sub)", fontSize: "0.9rem" }}>
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
        <DashboardPanel padding="spacious">
          <div style={{ display: "grid", gap: "1rem" }}>
            <SectionHeading
              copy="Saved groups and who sits in each one."
              eyebrow="Roster"
              title="Groups"
            />

            <div className="metric-grid">
              {groups.map((group) => (
                <div
                  key={group.id}
                  style={{
                    display: "grid",
                    gap: "0.45rem",
                    padding: "1rem",
                    borderRadius: "1.1rem",
                    border: "1px solid var(--border)",
                    background: "rgba(255, 255, 255, 0.03)",
                  }}
                >
                  <span
                    style={{
                      color: "var(--text-strong)",
                      fontSize: "1.05rem",
                      fontWeight: 700,
                    }}
                  >
                    {group.name}
                  </span>
                  <span style={{ color: "var(--sub)", fontSize: "0.9rem" }}>
                    {group.memberNames.length > 0
                      ? group.memberNames.join(" · ")
                      : "No members saved"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </DashboardPanel>
      ) : null}
    </section>
  );
}
