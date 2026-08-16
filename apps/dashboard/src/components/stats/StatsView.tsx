"use client";

import Link from "next/link";
import { useState } from "react";
import type { StatsScreenPayload } from "@moonrakers/analytics-contract";

import { asArray, asRecord, toText } from "@/components/charts/chartUtils";
import { DashboardPanel } from "@/components/ui/DashboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatShortDate } from "@/lib/formatDateTime";
import {
  formatCount,
  formatDecimal,
  formatScalar,
  humanizeKey,
  MISSING,
  toFiniteNumber,
} from "@/lib/formatNumber";

type StatsTab =
  | "correlations"
  | "games"
  | "overview"
  | "player"
  | "playstyle"
  | "rivals";

const TABS: Array<{ key: StatsTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "player", label: "Player" },
  { key: "playstyle", label: "Playstyle" },
  { key: "correlations", label: "Correlations" },
  { key: "rivals", label: "Rivals" },
  { key: "games", label: "Games" },
];

const TONE_ACCENTS: Record<string, string> = {
  accent: "var(--accent)",
  blue: "var(--blue)",
  danger: "var(--danger)",
  success: "var(--gold)",
};

/**
 * Identity and prose fields are part of a section's framing, not values to put
 * in a stat tile — rendering them blindly is what put a raw profile UUID on
 * screen next to the real numbers.
 */
const NON_METRIC_KEYS = new Set([
  "description",
  "id",
  "key",
  "label",
  "name",
  "playerid",
  "summary",
  "title",
]);

function metricEntries(value: unknown) {
  return Object.entries(asRecord(value))
    .filter(
      ([key, entry]) =>
        !NON_METRIC_KEYS.has(key.toLowerCase()) &&
        (typeof entry === "string" || typeof entry === "number"),
    )
    .map(([key, entry]) => ({
      key,
      label: humanizeKey(key),
      value: formatScalar(entry),
    }));
}

function sectionCopy(value: unknown) {
  const section = asRecord(value);
  return toText(section.description) || toText(section.summary) || undefined;
}

function MetricSection({
  copy,
  entries,
  eyebrow,
  title,
}: {
  copy?: string;
  entries: Array<{ key: string; label: string; value: string }>;
  eyebrow: string;
  title: string;
}) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <DashboardPanel padding="normal">
      <SectionHeading copy={copy} eyebrow={eyebrow} title={title} />
      <div className="stat-grid">
        {entries.map((entry) => (
          <MetricCard key={entry.key} label={entry.label} value={entry.value} />
        ))}
      </div>
    </DashboardPanel>
  );
}

/**
 * Every game row the server publishes carries the full result, so the row is
 * built from those fields rather than a generic "Tracked game" label. Older
 * payload shapes that only carry `label`/`value` still render as written.
 */
function toGameRows(value: unknown) {
  return asArray(asRecord(value).items).map((entry, index) => {
    const row = asRecord(entry);
    const gameId = toText(row.gameId ?? row.id);
    const winnerName = toText(row.winnerName);
    const genericLabel = toText(row.label ?? row.title);
    const genericValue = toText(row.value ?? row.summary ?? row.description);

    return {
      assists: toFiniteNumber(row.assists),
      contracts: toFiniteNumber(row.contracts),
      failures: toFiniteNumber(row.failures),
      finishedAt: toText(row.finishedAt),
      gameId,
      genericLabel,
      genericValue,
      groupName: toText(row.groupName),
      isWinner: row.isWinner === true,
      key: gameId || toText(row.key) || `game-${index}`,
      playerCount: toFiniteNumber(row.playerCount),
      prestige: toFiniteNumber(row.prestige),
      prestigeSpread: toFiniteNumber(row.prestigeSpread),
      winnerName,
    };
  });
}

function toCorrelationRows(value: unknown) {
  const section = asRecord(value);
  const combined = [
    ...asArray(section.entries),
    ...asArray(section.items),
    ...asArray(section.macro),
    ...asArray(section.personal),
    ...asArray(section.pairing),
  ];

  return combined.map((entry, index) => {
    const row = asRecord(entry);
    const numeric = toFiniteNumber(row.value ?? row.score);

    return {
      key: toText(row.key ?? row.metricKey ?? row.label, `correlation-${index}`),
      label: toText(
        row.label ?? row.title ?? row.metricLabel,
        `Correlation ${index + 1}`,
      ),
      meaning: toText(row.meaning ?? row.summary ?? row.description),
      strength: toText(row.strength),
      value: numeric,
    };
  });
}

function toRivalRows(value: unknown) {
  return asArray(value).map((entry, index) => {
    const row = asRecord(entry);

    return {
      draws: toFiniteNumber(row.draws),
      gamesTogether: toFiniteNumber(row.gamesTogether),
      key: toText(row.opponentId, `rival-${index}`),
      losses: toFiniteNumber(row.losses),
      opponentName: toText(row.opponentName, "Opponent"),
      wins: toFiniteNumber(row.wins),
    };
  });
}

export function StatsView({ payload }: { payload: StatsScreenPayload }) {
  const [activeTab, setActiveTab] = useState<StatsTab>("overview");

  const overviewCards = payload.overview.cards;
  const topSignals = payload.overview.topSignals;
  const playerDetail = asRecord(payload.players.detail);
  const playerStats = metricEntries(playerDetail.stats);
  const playstyle = asRecord(payload.playstyle);
  const playstyleHighlights = asArray(playstyle.highlights);
  const correlationRows = toCorrelationRows(payload.correlations);
  const rivalRows = toRivalRows(payload.headToHead);
  const gameRows = toGameRows(payload.games);
  const groupMeta = asRecord(payload.groupMeta);
  const playerCountSplit = asArray(groupMeta.playerCountSplit);
  const roundPhases = Object.entries(asRecord(payload.roundPhaseStats)).map(
    ([key, entry]) => ({ key, phase: asRecord(entry) }),
  );

  return (
    <section className="view-stack">
      <PageHeader
        copy={payload.overview.hero.takeaway}
        eyebrow="Stats"
        meta={`${formatCount(payload.overview.hero.games)} games · ${formatCount(payload.overview.hero.players)} players`}
        title="League readout"
      />

      <nav aria-label="Stats sections" className="segmented">
        {TABS.map((tab) => (
          <button
            aria-pressed={activeTab === tab.key}
            className="segmented__item"
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <div className="view-stack">
          {overviewCards.length > 0 ? (
            <div className="stat-grid">
              {overviewCards.map((card) => (
                <MetricCard
                  accent={card.accent}
                  detail={card.detail}
                  key={card.key}
                  label={card.label}
                  value={formatScalar(card.value)}
                />
              ))}
            </div>
          ) : null}

          {topSignals.length > 0 ? (
            <DashboardPanel padding="normal">
              <SectionHeading
                copy="What stands out across the tracked sample."
                eyebrow="Headline"
                title="Current signals"
              />
              <div className="stat-grid">
                {topSignals.map((signal) => (
                  <MetricCard
                    accent={TONE_ACCENTS[String(signal.tone ?? "")]}
                    detail={signal.meaning}
                    key={signal.key}
                    label={signal.label}
                    value={formatScalar(signal.value)}
                  />
                ))}
              </div>
            </DashboardPanel>
          ) : null}

          {playerCountSplit.length > 0 ? (
            <DashboardPanel padding="normal">
              <SectionHeading
                copy={sectionCopy(payload.groupMeta)}
                eyebrow="Table size"
                title="How results move with player count"
              />
              <div className="table-scroll">
                <table className="data-table data-table--compact">
                  <thead>
                    <tr>
                      <th className="col-text">Table size</th>
                      <th>Games</th>
                      <th>Wins</th>
                      <th>Win rate</th>
                      <th>Avg prestige</th>
                      <th>Avg assists</th>
                      <th>Avg failures</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerCountSplit.map((entry, index) => {
                      const split = asRecord(entry);
                      const winRate = toFiniteNumber(split.winRate);

                      return (
                        <tr key={toText(split.playerCount, String(index))}>
                          <td className="col-text is-strong">
                            {formatCount(split.playerCount)} players
                          </td>
                          <td>{formatCount(split.games)}</td>
                          <td>{formatCount(split.wins)}</td>
                          <td>
                            {winRate === null
                              ? MISSING
                              : `${(winRate * 100).toFixed(0)}%`}
                          </td>
                          <td>{formatDecimal(split.avgPrestige, 1)}</td>
                          <td>{formatDecimal(split.avgAssists, 1)}</td>
                          <td>{formatDecimal(split.avgFailures, 1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </DashboardPanel>
          ) : null}

          {overviewCards.length === 0 && topSignals.length === 0 ? (
            <EmptyStatePanel
              copy="This profile has not published overview cards yet."
              eyebrow="Overview"
              title="No overview data returned"
            />
          ) : null}
        </div>
      ) : null}

      {activeTab === "player" ? (
        <div className="view-stack">
          {playerStats.length > 0 ? (
            <DashboardPanel padding="normal">
              <SectionHeading
                copy={sectionCopy(playerDetail)}
                eyebrow="Focused player"
                title={toText(playerDetail.label, "Player detail")}
              />
              <div className="stat-grid">
                {playerStats.map((entry) => (
                  <MetricCard
                    key={entry.key}
                    label={entry.label}
                    value={entry.value}
                  />
                ))}
              </div>
            </DashboardPanel>
          ) : (
            <EmptyStatePanel
              copy="Pick a player from the focus selector to load their published detail block."
              eyebrow="Player"
              title="No player detail returned"
            />
          )}
        </div>
      ) : null}

      {activeTab === "playstyle" ? (
        <div className="view-stack">
          {toText(playstyle.label) || playstyleHighlights.length > 0 ? (
            <DashboardPanel padding="normal">
              <SectionHeading
                copy={toText(playstyle.summary) || undefined}
                eyebrow="Playstyle"
                title={toText(playstyle.label, "How this table wins")}
              />
              {playstyleHighlights.length > 0 ? (
                <div className="stat-grid">
                  {playstyleHighlights.map((entry, index) => {
                    const highlight = asRecord(entry);
                    return (
                      <MetricCard
                        key={toText(highlight.key, `highlight-${index}`)}
                        label={toText(highlight.label, `Highlight ${index + 1}`)}
                        value={formatScalar(highlight.value)}
                      />
                    );
                  })}
                </div>
              ) : null}
            </DashboardPanel>
          ) : null}

          <MetricSection
            copy={sectionCopy(payload.prestigeSources)}
            entries={metricEntries(payload.prestigeSources)}
            eyebrow="Sources"
            title="Where prestige comes from"
          />

          <MetricSection
            copy={sectionCopy(payload.paceProfile)}
            entries={metricEntries(payload.paceProfile)}
            eyebrow="Pace"
            title="First half versus second half"
          />

          <MetricSection
            copy={sectionCopy(payload.contractEfficiency)}
            entries={metricEntries(payload.contractEfficiency)}
            eyebrow="Reliability"
            title="Contract efficiency"
          />

          <MetricSection
            copy={sectionCopy(payload.consistencyProfile)}
            entries={metricEntries(payload.consistencyProfile)}
            eyebrow="Consistency"
            title="Scoring rounds"
          />

          {roundPhases.length > 0 ? (
            <DashboardPanel padding="normal">
              <SectionHeading
                copy="Per-round averages across each stretch of a game."
                eyebrow="Phases"
                title="How each phase plays"
              />
              <div className="table-scroll">
                <table className="data-table data-table--compact">
                  <thead>
                    <tr>
                      <th className="col-text">Phase</th>
                      <th>Prestige / round</th>
                      <th>Contracts / round</th>
                      <th>Failures / round</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roundPhases.map(({ key, phase }) => (
                      <tr key={key}>
                        <td className="col-text is-strong">
                          {toText(phase.label, humanizeKey(key))}
                        </td>
                        <td>{formatDecimal(phase.avgPrestigePerRound, 2)}</td>
                        <td>{formatDecimal(phase.avgContractsPerRound, 2)}</td>
                        <td>{formatDecimal(phase.avgFailuresPerRound, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DashboardPanel>
          ) : null}
        </div>
      ) : null}

      {activeTab === "correlations" ? (
        <div className="view-stack">
          {correlationRows.length > 0 ? (
            <DashboardPanel padding="normal">
              <div className="panel-head">
                <div className="panel-head__text">
                  <p className="eyebrow" style={{ margin: 0 }}>
                    Correlations
                  </p>
                  <h2 className="panel-title">What moves with winning</h2>
                </div>
                <span className="panel-count">
                  {correlationRows.length} tracked
                </span>
              </div>
              <div className="card-grid">
                {correlationRows.map((row) => (
                  <div className="tile" key={row.key}>
                    <span className="stat__label">{row.label}</span>
                    {row.value !== null ? (
                      <span
                        className="tile__title"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {row.value > 0 ? "+" : ""}
                        {row.value.toFixed(2)}
                        {row.strength ? (
                          <span className="tile__meta"> · {row.strength}</span>
                        ) : null}
                      </span>
                    ) : row.strength ? (
                      <span className="tile__meta">{row.strength}</span>
                    ) : null}
                    {row.meaning ? (
                      <span className="tile__copy">{row.meaning}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </DashboardPanel>
          ) : (
            <EmptyStatePanel
              copy="Correlations appear once enough finished games are saved to compare against."
              eyebrow="Correlations"
              title="No correlation rows returned"
            />
          )}
        </div>
      ) : null}

      {activeTab === "rivals" ? (
        <div className="view-stack">
          {rivalRows.length > 0 ? (
            <DashboardPanel padding="normal">
              <div className="panel-head">
                <div className="panel-head__text">
                  <p className="eyebrow" style={{ margin: 0 }}>
                    Head to head
                  </p>
                  <h2 className="panel-title">Record against each opponent</h2>
                  <p className="panel-copy">
                    Moonrakers has no draws — the last column counts shared games
                    a third player won.
                  </p>
                </div>
                <span className="panel-count">
                  {rivalRows.length} opponents
                </span>
              </div>
              <div className="table-scroll">
                <table className="data-table data-table--compact">
                  <thead>
                    <tr>
                      <th className="col-text">Opponent</th>
                      <th>Games together</th>
                      <th>Wins</th>
                      <th>Losses</th>
                      <th>Others won</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rivalRows.map((row) => (
                      <tr key={row.key}>
                        <td className="col-text is-strong">{row.opponentName}</td>
                        <td>{formatCount(row.gamesTogether)}</td>
                        <td className="is-good">{formatCount(row.wins)}</td>
                        <td>{formatCount(row.losses)}</td>
                        <td className="is-muted">{formatCount(row.draws)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DashboardPanel>
          ) : (
            <EmptyStatePanel
              copy="Head-to-head records appear once you share a finished game with another player."
              eyebrow="Rivals"
              title="No opponents tracked yet"
            />
          )}
        </div>
      ) : null}

      {activeTab === "games" ? (
        <div className="view-stack">
          {gameRows.length > 0 ? (
            <DashboardPanel padding="normal">
              <div className="panel-head">
                <div className="panel-head__text">
                  <p className="eyebrow" style={{ margin: 0 }}>
                    Games
                  </p>
                  <h2 className="panel-title">Every tracked table</h2>
                  <p className="panel-copy">Newest first.</p>
                </div>
                <span className="panel-count">{gameRows.length} games</span>
              </div>

              <div className="row-list">
                {gameRows.map((row) => (
                  <article className="row" key={row.key}>
                    <div className="row__head">
                      <div className="stack-sm" style={{ minWidth: 0 }}>
                        <span className="eyebrow" suppressHydrationWarning>
                          {row.finishedAt
                            ? formatShortDate(row.finishedAt)
                            : "Tracked game"}
                          {row.groupName ? ` · ${row.groupName}` : ""}
                        </span>
                        <h3 className="row__title">
                          {row.winnerName
                            ? `${row.winnerName} won${row.isWinner ? " · you" : ""}`
                            : row.genericLabel || "No winner recorded"}
                        </h3>
                        {row.genericValue && !row.winnerName ? (
                          <p className="row__meta">{row.genericValue}</p>
                        ) : (
                          <p className="row__meta">
                            {formatCount(row.playerCount)} players ·{" "}
                            {formatCount(row.prestigeSpread)} prestige spread
                          </p>
                        )}
                      </div>

                      {row.gameId ? (
                        <div className="page-header__actions">
                          <Link
                            className="btn btn--primary"
                            href={`/summary/${encodeURIComponent(row.gameId)}`}
                          >
                            Summary
                          </Link>
                          <Link
                            className="btn"
                            href={`/game-trends/${encodeURIComponent(row.gameId)}`}
                          >
                            Trends
                          </Link>
                        </div>
                      ) : null}
                    </div>

                    {row.prestige !== null ? (
                      <div className="statline">
                        <span className="statline__item">
                          <span className="statline__label">Your prestige</span>
                          <span className="statline__value">
                            {formatCount(row.prestige)}
                          </span>
                        </span>
                        <span className="statline__item">
                          <span className="statline__label">Contracts</span>
                          <span className="statline__value">
                            {formatCount(row.contracts)}
                          </span>
                        </span>
                        <span className="statline__item">
                          <span className="statline__label">Assists</span>
                          <span className="statline__value">
                            {formatCount(row.assists)}
                          </span>
                        </span>
                        <span className="statline__item">
                          <span className="statline__label">Failures</span>
                          <span className="statline__value">
                            {formatCount(row.failures)}
                          </span>
                        </span>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </DashboardPanel>
          ) : (
            <EmptyStatePanel
              copy="Finished games appear here once they are saved to the cloud."
              eyebrow="Games"
              title="No games returned"
            />
          )}
        </div>
      ) : null}
    </section>
  );
}
