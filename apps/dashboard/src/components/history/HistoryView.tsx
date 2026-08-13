"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDateTime } from "@/lib/formatDateTime";
import { playerAccent } from "@/lib/playerColor";
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
        <PageHeader
          copy="Every finished game saved to the cloud, with winners, round counts, and links into the full game read."
          eyebrow="History"
          title="Mission Archive"
        />
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
      <PageHeader
        copy="Every finished game saved to the cloud, with winners, round counts, and links into the full game read."
        eyebrow="History"
        title="Mission Archive"
      />

      <div className="stat-grid">
        <MetricCard label="Games" value={rows.length} />
        <MetricCard accent="var(--gold)" label="Games with you" value={myGames} />
        <MetricCard label="Rounds logged" value={totalRounds} />
        <MetricCard label="Groups" value={groupNames.length} />
      </div>

      <DashboardPanel padding="normal">
        <div className="stack-md">
          <div className="toolbar">
            <label className="field toolbar__grow">
              <span className="field__label">Search</span>
              <input
                className="input"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by winner, player, group, or date"
                type="search"
                value={query}
              />
            </label>

            <div className="field">
              <span className="field__label">Filter</span>
              <div className="segmented">
                {FILTER_TABS.map((tab) => (
                  <button
                    aria-pressed={filter === tab.key}
                    className="segmented__item"
                    key={tab.key}
                    onClick={() => {
                      setFilter(tab.key);
                      if (tab.key !== "group") {
                        setGroupName("all");
                      }
                    }}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="field">
              <span className="field__label">Sort</span>
              <select
                className="select"
                onChange={(event) => setSort(event.target.value as HistorySort)}
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

          {filter === "group" && groupNames.length > 0 ? (
            <div className="segmented" style={{ alignSelf: "start" }}>
              <button
                aria-pressed={groupName === "all"}
                className="segmented__item"
                onClick={() => setGroupName("all")}
                type="button"
              >
                All groups
              </button>
              {groupNames.map((name) => (
                <button
                  aria-pressed={groupName === name}
                  className="segmented__item"
                  key={name}
                  onClick={() => setGroupName(name)}
                  type="button"
                >
                  {name}
                </button>
              ))}
            </div>
          ) : null}

          <p className="panel-count" style={{ margin: 0 }}>
            {visibleRows.length} of {rows.length} games visible.
          </p>
        </div>
      </DashboardPanel>

      {visibleRows.length === 0 ? (
        <EmptyStatePanel
          copy="No archived game matches those controls. Clear the search or switch back to the All filter."
          eyebrow="Archive"
          title="No games match"
        />
      ) : null}

      <div className="row-list">
        {visibleRows.map((row) => {
          const winnerColor =
            row.players.find((player) => player.isWinner)?.color ?? null;

          return (
            <article
              className={row.id === focusGameId ? "row row--focus" : "row"}
              key={row.id}
              style={
                {
                  "--row-accent": playerAccent(winnerColor, "var(--border-strong)"),
                } as React.CSSProperties
              }
            >
              <div className="row__head">
                <div className="stack-sm" style={{ minWidth: 0 }}>
                  <span className="eyebrow">
                    Game {row.ordinal}
                    {row.groupName ? ` · ${row.groupName}` : ""}
                  </span>
                  <h2 className="row__title">
                    {row.winnerName
                      ? `${row.winnerName} won with ${row.winnerPrestige}`
                      : "No winner recorded"}
                  </h2>
                  <p className="row__meta" suppressHydrationWarning>
                    {formatDateTime(row.createdAt)} · {row.roundCount} rounds ·{" "}
                    {row.players.length} players
                  </p>
                </div>

                <div className="page-header__actions">
                  <Link
                    className="btn btn--primary"
                    href={`/summary/${encodeURIComponent(row.id)}`}
                  >
                    Summary
                  </Link>
                  <Link
                    className="btn"
                    href={`/game-trends/${encodeURIComponent(row.id)}`}
                  >
                    Trends
                  </Link>
                </div>
              </div>

              <div className="pill-row">
                {row.players.map((player) => (
                  <span
                    className={player.isWinner ? "chip chip--win" : "chip"}
                    key={`${row.id}-${player.id}`}
                  >
                    <span
                      aria-hidden="true"
                      className="chip__dot"
                      style={{ background: playerAccent(player.color, "var(--blue)") }}
                    />
                    {player.name}
                    <span className="chip__num">{player.totalPrestige}</span>
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
