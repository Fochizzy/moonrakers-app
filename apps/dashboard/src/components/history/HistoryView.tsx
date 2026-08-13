"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatDateTime } from "@/lib/formatDateTime";
import {
  filterHistoryRows,
  listHistoryGroupNames,
  sortHistoryRows,
  type HistoryFilter,
  type HistoryRow,
  type HistorySort,
} from "@/lib/history/historyRows";

type HistoryViewProps = {
  focusGameId: string | null;
  rows: HistoryRow[];
};

const FILTER_TABS: Array<{ key: HistoryFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "group", label: "Groups" },
  { key: "mine", label: "Include Me" },
];

const SORT_OPTIONS: Array<{ key: HistorySort; label: string }> = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "winner", label: "Winner name" },
  { key: "rounds", label: "Most rounds" },
];

function PillButton({
  active,
  label,
  onSelect,
}: {
  active: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      onClick={onSelect}
      style={{
        padding: "0.55rem 0.95rem",
        borderRadius: "999px",
        border: `1px solid ${active ? "rgba(168, 85, 247, 0.45)" : "var(--border)"}`,
        background: active
          ? "linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(59, 130, 246, 0.14) 100%)"
          : "rgba(255, 255, 255, 0.04)",
        color: active ? "var(--text-strong)" : "var(--sub)",
        cursor: "pointer",
        fontSize: "0.85rem",
        fontWeight: active ? 700 : 600,
        whiteSpace: "nowrap",
      }}
      type="button"
    >
      {label}
    </button>
  );
}

function PlayerChip({
  color,
  isWinner,
  name,
  totalPrestige,
}: {
  color: string | null;
  isWinner: boolean;
  name: string;
  totalPrestige: number;
}) {
  const accent = color?.trim() || "var(--blue)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.45rem",
        padding: "0.35rem 0.7rem",
        borderRadius: "999px",
        border: `1px solid ${isWinner ? "rgba(45, 212, 191, 0.5)" : "var(--border)"}`,
        background: isWinner ? "rgba(45, 212, 191, 0.1)" : "rgba(255, 255, 255, 0.04)",
        color: "var(--text)",
        fontSize: "0.85rem",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: "0.55rem",
          height: "0.55rem",
          borderRadius: "999px",
          background: accent,
        }}
      />
      <span style={{ fontWeight: isWinner ? 700 : 600 }}>{name}</span>
      <span style={{ color: "var(--muted)" }}>{totalPrestige}</span>
    </span>
  );
}

export function HistoryView({ focusGameId, rows }: HistoryViewProps) {
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [sort, setSort] = useState<HistorySort>("newest");
  const [groupName, setGroupName] = useState("all");
  const [query, setQuery] = useState("");

  const groupNames = useMemo(() => listHistoryGroupNames(rows), [rows]);

  const visibleRows = useMemo(
    () =>
      sortHistoryRows(
        filterHistoryRows({
          dateLabelFor: (row) => formatDateTime(row.createdAt),
          filter,
          groupName,
          query,
          rows,
        }),
        sort,
      ),
    [filter, groupName, query, rows, sort],
  );

  const totalRounds = rows.reduce((count, row) => count + row.roundCount, 0);
  const myGames = rows.filter((row) => row.includesSignedInPlayer).length;

  if (rows.length === 0) {
    return (
      <section className="view-stack">
        <EmptyStatePanel
          copy="No finished games are saved to the cloud for this account yet. Play and save a game in the Moonrakers app and it will appear here."
          eyebrow="Archive"
          title="Mission archive is empty"
        />
      </section>
    );
  }

  return (
    <section className="view-stack">
      <DashboardPanel padding="spacious" tone="accent">
        <SectionHeading
          copy="Every finished game saved to the cloud, with winners, round counts, and links into the full game read."
          eyebrow="History"
          title="Mission Archive"
        />
      </DashboardPanel>

      <div className="metric-grid">
        <MetricCard label="Games" value={rows.length} />
        <MetricCard accent="var(--gold)" label="Games with you" value={myGames} />
        <MetricCard label="Rounds logged" value={totalRounds} />
        <MetricCard label="Groups" value={groupNames.length} />
      </div>

      <DashboardPanel padding="spacious">
        <div style={{ display: "grid", gap: "1.1rem" }}>
          <SectionHeading
            copy={`${visibleRows.length} of ${rows.length} games visible.`}
            eyebrow="Controls"
            title="Archive controls"
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
              Search
            </span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by winner, player, group, or date"
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

          <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
            {FILTER_TABS.map((tab) => (
              <PillButton
                active={filter === tab.key}
                key={tab.key}
                label={tab.label}
                onSelect={() => {
                  setFilter(tab.key);
                  if (tab.key !== "group") {
                    setGroupName("all");
                  }
                }}
              />
            ))}
          </div>

          {filter === "group" && groupNames.length > 0 ? (
            <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
              <PillButton
                active={groupName === "all"}
                label="All groups"
                onSelect={() => setGroupName("all")}
              />
              {groupNames.map((name) => (
                <PillButton
                  active={groupName === name}
                  key={name}
                  label={name}
                  onSelect={() => setGroupName(name)}
                />
              ))}
            </div>
          ) : null}

          <label style={{ display: "grid", gap: "0.45rem", maxWidth: "18rem" }}>
            <span
              style={{
                color: "var(--sub)",
                fontSize: "0.8rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Sort
            </span>
            <select
              onChange={(event) => setSort(event.target.value as HistorySort)}
              style={{
                padding: "0.7rem 0.9rem",
                borderRadius: "0.9rem",
                border: "1px solid var(--border-strong)",
                background: "rgba(255, 255, 255, 0.04)",
                color: "var(--text-strong)",
                fontSize: "0.95rem",
              }}
              value={sort}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </DashboardPanel>

      {visibleRows.length === 0 ? (
        <EmptyStatePanel
          copy="No archived game matches those controls. Clear the search or switch back to the All filter."
          eyebrow="Archive"
          title="No games match"
        />
      ) : null}

      {visibleRows.map((row) => {
        const focused = row.id === focusGameId;

        return (
          <DashboardPanel
            key={row.id}
            padding="spacious"
            tone={focused ? "success" : "default"}
          >
            <div style={{ display: "grid", gap: "0.9rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "grid", gap: "0.35rem", minWidth: 0 }}>
                  <p className="section-eyebrow" style={{ margin: 0 }}>
                    Game {row.ordinal}
                    {row.groupName ? ` · ${row.groupName}` : ""}
                  </p>
                  <h3
                    style={{
                      margin: 0,
                      color: "var(--text-strong)",
                      fontSize: "1.35rem",
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {row.winnerName
                      ? `${row.winnerName} won with ${row.winnerPrestige}`
                      : "No winner recorded"}
                  </h3>
                  <p
                    style={{ margin: 0, color: "var(--sub)", fontSize: "0.92rem" }}
                    suppressHydrationWarning
                  >
                    {formatDateTime(row.createdAt)} · {row.roundCount} rounds ·{" "}
                    {row.players.length} players
                  </p>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <Link
                    href={`/summary/${encodeURIComponent(row.id)}`}
                    style={{
                      padding: "0.6rem 1rem",
                      borderRadius: "0.9rem",
                      border: "1px solid rgba(168, 85, 247, 0.4)",
                      background: "rgba(168, 85, 247, 0.14)",
                      color: "var(--text-strong)",
                      fontSize: "0.88rem",
                      fontWeight: 700,
                    }}
                  >
                    Summary
                  </Link>
                  <Link
                    href={`/game-trends/${encodeURIComponent(row.id)}`}
                    style={{
                      padding: "0.6rem 1rem",
                      borderRadius: "0.9rem",
                      border: "1px solid var(--border-strong)",
                      background: "rgba(255, 255, 255, 0.05)",
                      color: "var(--text)",
                      fontSize: "0.88rem",
                      fontWeight: 700,
                    }}
                  >
                    Trends
                  </Link>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {row.players.map((player) => (
                  <PlayerChip
                    color={player.color}
                    isWinner={player.isWinner}
                    key={`${row.id}-${player.id}`}
                    name={player.name}
                    totalPrestige={player.totalPrestige}
                  />
                ))}
              </div>
            </div>
          </DashboardPanel>
        );
      })}
    </section>
  );
}
