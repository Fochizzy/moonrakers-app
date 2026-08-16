"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDateTime } from "@/lib/formatDateTime";
import { formatCount } from "@/lib/formatNumber";
import { assignDistinctAccents } from "@/lib/playerColor";
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

/** Rows mounted before the reader asks for more. */
const PAGE_SIZE = 25;

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
  // The archive is read in full so search and filters stay instant, but every
  // row carries a roster and a stat line, so only a page of them is mounted.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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

  const pagedRows = visibleRows.slice(0, visibleCount);
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
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
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
                      setVisibleCount(PAGE_SIZE);
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
                onChange={(event) => {
                  setSort(event.target.value as HistorySort);
                  setVisibleCount(PAGE_SIZE);
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

          {filter === "group" && groupNames.length > 0 ? (
            <div className="segmented" style={{ alignSelf: "start" }}>
              <button
                aria-pressed={groupName === "all"}
                className="segmented__item"
                onClick={() => {
                  setGroupName("all");
                  setVisibleCount(PAGE_SIZE);
                }}
                type="button"
              >
                All groups
              </button>
              {groupNames.map((name) => (
                <button
                  aria-pressed={groupName === name}
                  className="segmented__item"
                  key={name}
                  onClick={() => {
                    setGroupName(name);
                    setVisibleCount(PAGE_SIZE);
                  }}
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
        {pagedRows.map((row) => {
          const accents = assignDistinctAccents(row.players);
          const winnerId =
            row.players.find((player) => player.isWinner)?.id ?? null;

          return (
            <article
              className={row.id === focusGameId ? "row row--focus" : "row"}
              key={row.id}
              style={
                {
                  "--row-accent": (winnerId && accents[winnerId]) || "var(--border-strong)",
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
                    {row.margin !== null
                      ? ` · won by ${formatCount(row.margin)}`
                      : ""}
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
                      style={{ background: accents[player.id] }}
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

      {pagedRows.length < visibleRows.length ? (
        <div className="load-more">
          <p className="panel-count" style={{ margin: 0 }}>
            Showing {pagedRows.length} of {visibleRows.length} matching games.
          </p>
          <button
            className="btn"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            type="button"
          >
            Show {Math.min(PAGE_SIZE, visibleRows.length - pagedRows.length)} more
          </button>
        </div>
      ) : null}
    </section>
  );
}
