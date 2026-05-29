import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import PlayerSearchPicker from "@/components/players/PlayerSearchPicker";
import PlaystyleScatterCard, {
  type PlaystyleScatterPoint,
} from "@/components/stats/PlaystyleScatterCard";
import {
  rankPlaystyleLeaderboard,
  type LeaderboardPlayer,
} from "@/components/stats/playstyleLeaderboard";
import DefinitionTermText from "@/components/ui/DefinitionTermText";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Text from "@/components/ui/Text";
import {
  buildGlobalPlaystyleCorrelations,
  buildPersonalPlaystyleCorrelations,
  type PlaystyleCorrelationKey,
  type PlaystyleCorrelationRow,
} from "@/utils/playstyleCorrelationEngine";
import { buildPlaystyleSamples, type PlaystyleSample } from "@/utils/playstyleEngine";
import { buildPlaystyleInsights } from "@/utils/playstyleInsights";
import { COLORS } from "@/utils/colors";
import type { Game, Player } from "@/utils/statsEngine";
import { getPlayerAccentColor } from "@/utils/turnTheme";

type Props = {
  authProfileId?: string | null;
  players: Player[];
  games: Game[];
  leaderboard: LeaderboardPlayer[];
  selectedPlayerId: string | null;
  onSelectPlayer: (playerId: string) => void;
};

const PERSONAL_MIN_GAMES = 5;
const GLOBAL_MIN_GAMES = 5;

const PERSONAL_CHART_KEYS: PlaystyleCorrelationKey[] = [
  "prestige",
  "objectivePoints",
];

const GLOBAL_CHART_KEYS: PlaystyleCorrelationKey[] = [
  "assistsGiven",
  "assistsReceived",
];

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function formatNumber(value: number, digits = 1) {
  if (!Number.isFinite(value)) return "--";
  return value.toFixed(digits);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "--";
  return `${Math.round(value * 100)}%`;
}

function getMetricLabel(key: PlaystyleCorrelationKey) {
  switch (key) {
    case "wins":
      return "Wins";
    case "prestige":
      return "Prestige";
    case "objectivePoints":
      return "Objective Prestige";
    case "assistsGiven":
      return "Assists Given";
    case "assistsReceived":
      return "Assists Received";
    default:
      return "Metric";
  }
}

function getMetricValue(sample: PlaystyleSample, key: PlaystyleCorrelationKey) {
  switch (key) {
    case "wins":
      return sample.winFlag;
    case "prestige":
      return sample.totalPrestige;
    case "objectivePoints":
      return sample.objectivePoints;
    case "assistsGiven":
      return sample.assistsGiven;
    case "assistsReceived":
      return sample.assistsReceived;
    default:
      return 0;
  }
}

function getCorrelationAccent(row: PlaystyleCorrelationRow) {
  if (row.status === "insufficient" || row.status === "flat" || row.direction === "neutral") {
    return COLORS.textMuted;
  }

  return row.direction === "positive" ? COLORS.green : COLORS.red;
}

function getCorrelationStory(row: PlaystyleCorrelationRow, minGames: number) {
  if (row.status === "insufficient") {
    return `Need at least ${minGames} valid games. Currently ${row.sampleSize}.`;
  }

  if (row.status === "flat") {
    return `Signal is flat across ${row.sampleSize} tracked games.`;
  }

  return `${row.strength} ${row.direction} relationship across ${row.sampleSize} games.`;
}

function buildScatterPoints(
  samples: PlaystyleSample[],
  metricKey: PlaystyleCorrelationKey,
  colorMap: Map<string, string>,
  singleColor?: string
) {
  return samples
    .filter(
      (sample) =>
        Number.isFinite(sample.stayAtBaseRate) &&
        Number.isFinite(getMetricValue(sample, metricKey))
    )
    .map<PlaystyleScatterPoint>((sample) => ({
      id: `${sample.gameId}-${sample.playerId}-${metricKey}`,
      x: sample.stayAtBaseRate as number,
      y: getMetricValue(sample, metricKey),
      color: singleColor ?? colorMap.get(sample.playerId) ?? COLORS.cyan,
    }));
}

function buildBaseWinRate(samples: PlaystyleSample[], includeBaseTurns: boolean) {
  const matching = samples.filter((sample) =>
    includeBaseTurns ? sample.stayAtBaseTurns > 0 : sample.stayAtBaseTurns === 0
  );

  return matching.length ? average(matching.map((sample) => sample.winFlag)) : Number.NaN;
}

function chunkPlayerTabItems(
  items: ReadonlyArray<{ key: string; label: string }>,
  chunkSize = 4
) {
  const rows: Array<Array<{ key: string; label: string }>> = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    rows.push([...items.slice(index, index + chunkSize)]);
  }

  return rows;
}

function SummaryCard({
  label,
  value,
  meta,
  accent,
}: {
  label: string;
  value: string;
  meta?: string;
  accent: string;
}) {
  return (
    <View
      style={[
        styles.summaryCard,
        {
          borderColor: `${accent}44`,
          backgroundColor: `${accent}12`,
        },
      ]}
    >
      <DefinitionTermText
        label={label}
        style={[styles.summaryLabel, { color: accent }]}
      />
      <Text style={styles.summaryValue}>{value}</Text>
      {meta ? <Text style={styles.summaryMeta}>{meta}</Text> : null}
    </View>
  );
}

function CorrelationCard({
  row,
  minGames,
}: {
  row: PlaystyleCorrelationRow;
  minGames: number;
}) {
  const accent = getCorrelationAccent(row);
  const toneLabel =
    row.status === "insufficient"
      ? "Need More"
      : row.status === "flat"
        ? "Flat"
        : `${row.strength} ${row.direction}`;

  return (
    <View style={[styles.correlationCard, { borderColor: `${accent}55` }]}>
      <View style={styles.correlationHeader}>
        <DefinitionTermText label={row.label} style={styles.correlationLabel} />
        <View
          style={[
            styles.correlationBadge,
            {
              borderColor: `${accent}55`,
              backgroundColor: `${accent}16`,
            },
          ]}
        >
          <Text style={[styles.correlationBadgeText, { color: accent }]}>{toneLabel}</Text>
        </View>
      </View>

      <Text style={styles.correlationValue}>r = {row.value.toFixed(2)}</Text>
      <Text style={styles.correlationStory}>{getCorrelationStory(row, minGames)}</Text>
    </View>
  );
}

function InsightBullet({ text }: { text: string }) {
  return (
    <View style={styles.insightRow}>
      <View style={styles.insightDot} />
      <Text style={styles.insightText}>{text}</Text>
    </View>
  );
}

function ScopePanel({
  eyebrow,
  title,
  subtitle,
  rows,
  minGames,
  chartKeys,
  chartSamples,
  chartSubtitlePrefix,
  colorMap,
  singleColor,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  rows: PlaystyleCorrelationRow[];
  minGames: number;
  chartKeys: PlaystyleCorrelationKey[];
  chartSamples: PlaystyleSample[];
  chartSubtitlePrefix: string;
  colorMap: Map<string, string>;
  singleColor?: string;
}) {
  return (
    <View style={styles.scopePanel}>
      <Text style={styles.scopeEyebrow}>{eyebrow}</Text>
      <Text style={styles.scopeTitle}>{title}</Text>
      <Text style={styles.scopeSubtitle}>{subtitle}</Text>

      <View style={styles.correlationList}>
        {rows.map((row) => (
          <CorrelationCard key={row.key} row={row} minGames={minGames} />
        ))}
      </View>

      <View style={styles.chartList}>
        {chartKeys.map((key) => {
          const row = rows.find((entry) => entry.key === key);
          const points = buildScatterPoints(chartSamples, key, colorMap, singleColor);
          const subtitle = row
            ? `${chartSubtitlePrefix} r = ${row.value.toFixed(2)}`
            : chartSubtitlePrefix;

          return (
            <PlaystyleScatterCard
              key={`${eyebrow}-${key}`}
              title={`Stay at Base vs ${getMetricLabel(key)}`}
              subtitle={subtitle}
              yLabel={getMetricLabel(key)}
              points={points}
              accentColor={singleColor ?? COLORS.cyan}
              emptyText="Need more completed games with playable turns."
            />
          );
        })}
      </View>
    </View>
  );
}

export default function PlaystyleSection({
  authProfileId = null,
  players,
  games,
  leaderboard,
  selectedPlayerId,
  onSelectPlayer,
}: Props) {
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const playerColorMap = useMemo(() => {
    const map = new Map<string, string>();

    for (const player of players) {
      if (player?.id) {
        map.set(player.id, getPlayerAccentColor((player as any)?.color));
      }
    }

    for (const player of leaderboard) {
      if (player?.id && !map.has(player.id)) {
        map.set(player.id, getPlayerAccentColor(player.color));
      }
    }

    return map;
  }, [leaderboard, players]);

  const samples = useMemo(() => buildPlaystyleSamples(players, games), [games, players]);
  const orderedLeaderboard = useMemo(
    () =>
      rankPlaystyleLeaderboard({
        leaderboard,
        authProfileId,
        samples,
      }),
    [authProfileId, leaderboard, samples]
  );

  const resolvedPlayer =
    orderedLeaderboard.find((player) => player.id === selectedPlayerId) ??
    orderedLeaderboard[0] ??
    null;

  const personalSamples = useMemo(
    () =>
      resolvedPlayer
        ? samples.filter((sample) => sample.playerId === resolvedPlayer.id)
        : [],
    [resolvedPlayer, samples]
  );

  const personalRows = useMemo(
    () =>
      buildPersonalPlaystyleCorrelations(samples, resolvedPlayer?.id ?? null, PERSONAL_MIN_GAMES),
    [resolvedPlayer?.id, samples]
  );

  const globalRows = useMemo(
    () => buildGlobalPlaystyleCorrelations(samples, GLOBAL_MIN_GAMES),
    [samples]
  );

  const insights = useMemo(
    () =>
      buildPlaystyleInsights({
        playerName: resolvedPlayer?.name ?? "Selected player",
        personalRows,
        globalRows,
      }),
    [globalRows, personalRows, resolvedPlayer?.name]
  );
  const playerTabItems = useMemo(
    () =>
      orderedLeaderboard.map((player) => ({
        key: player.id,
        label: player.id === authProfileId ? "You" : player.name,
      })),
    [authProfileId, orderedLeaderboard]
  );
  const playerTabRows = useMemo(
    () => chunkPlayerTabItems(playerTabItems),
    [playerTabItems]
  );
  const filteredPlayerItems = useMemo(() => {
    const normalizedQuery = playerSearchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    return orderedLeaderboard
      .filter((player) => {
        const name = String(player.name ?? "").trim().toLowerCase();
        const id = String(player.id ?? "").trim().toLowerCase();
        return name.includes(normalizedQuery) || id.includes(normalizedQuery);
      })
      .map((player) => ({
        id: player.id,
        label: player.id === authProfileId ? "You" : player.name,
        meta:
          player.id === resolvedPlayer?.id
            ? "Currently selected"
            : "Switch playstyle focus",
      }));
  }, [authProfileId, orderedLeaderboard, playerSearchQuery, resolvedPlayer?.id]);

  const validPersonalSamples = personalSamples.filter((sample) =>
    Number.isFinite(sample.stayAtBaseRate)
  );
  const validGlobalSamples = samples.filter((sample) => Number.isFinite(sample.stayAtBaseRate));

  const personalBaseRate = average(
    validPersonalSamples.map((sample) => sample.stayAtBaseRate as number)
  );
  const globalBaseRate = average(
    validGlobalSamples.map((sample) => sample.stayAtBaseRate as number)
  );
  const personalBaseTurns = average(personalSamples.map((sample) => sample.stayAtBaseTurns));
  const personalPrestige = average(personalSamples.map((sample) => sample.totalPrestige));
  const globalPrestige = average(samples.map((sample) => sample.totalPrestige));
  const personalObjectives = average(personalSamples.map((sample) => sample.objectivePoints));
  const globalObjectives = average(samples.map((sample) => sample.objectivePoints));
  const personalAssistsGiven = average(personalSamples.map((sample) => sample.assistsGiven));
  const globalAssistsGiven = average(samples.map((sample) => sample.assistsGiven));
  const personalAssistsReceived = average(
    personalSamples.map((sample) => sample.assistsReceived)
  );
  const globalAssistsReceived = average(samples.map((sample) => sample.assistsReceived));
  const winRateWithBase = buildBaseWinRate(personalSamples, true);
  const winRateWithoutBase = buildBaseWinRate(personalSamples, false);

  if (!leaderboard.length || !samples.length || !resolvedPlayer) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>No playstyle data yet</Text>
        <Text style={styles.emptyText}>
          Finish or import a few games to start tracking stay-at-base tendencies.
        </Text>
      </View>
    );
  }

  const accentColor = getPlayerAccentColor(resolvedPlayer.color);

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Playstyle</Text>
      <Text style={styles.title}>Stay at Base Profile</Text>

      <View style={styles.selectorSection}>
        <View style={styles.selectorTabStack}>
          {playerTabRows.map((row, index) => (
            <SegmentedControl
              key={`playstyle-selector-row-${index}`}
              items={row}
              value={resolvedPlayer.id}
              onChange={onSelectPlayer}
              style={styles.selectorSegmentedControl}
            />
          ))}
        </View>

        <PlayerSearchPicker
          query={playerSearchQuery}
          onQueryChange={setPlayerSearchQuery}
          onClearQuery={() => setPlayerSearchQuery("")}
          placeholder="Search players"
          items={filteredPlayerItems}
          selectedIds={[resolvedPlayer.id]}
          onSelect={(playerId) => {
            onSelectPlayer(playerId);
            setPlayerSearchQuery("");
          }}
          inputProps={{ returnKeyType: "search" }}
          showResultsOnlyWhenQuery
        />
      </View>

      <View style={styles.summaryGrid}>
        <SummaryCard
          label="Base Rate"
          value={formatPercent(personalBaseRate)}
          meta={`Global ${formatPercent(globalBaseRate)}`}
          accent={COLORS.cyan}
        />
        <SummaryCard
          label="Base Turns / Game"
          value={formatNumber(personalBaseTurns)}
          meta={`${personalSamples.length} tracked games`}
          accent={accentColor}
        />
        <SummaryCard
          label="Prestige / Game"
          value={formatNumber(personalPrestige)}
          meta={`Global ${formatNumber(globalPrestige)}`}
          accent={COLORS.blueGlow}
        />
        <SummaryCard
          label="Objective Prestige / Game"
          value={formatNumber(personalObjectives)}
          meta={`Global ${formatNumber(globalObjectives)}`}
          accent={COLORS.gold}
        />
        <SummaryCard
          label="Assists Given / Game"
          value={formatNumber(personalAssistsGiven)}
          meta={`Global ${formatNumber(globalAssistsGiven)}`}
          accent={COLORS.green}
        />
        <SummaryCard
          label="Assists Received / Game"
          value={formatNumber(personalAssistsReceived)}
          meta={`Global ${formatNumber(globalAssistsReceived)}`}
          accent={COLORS.purple}
        />
        <SummaryCard
          label="Win Rate With Base"
          value={formatPercent(winRateWithBase)}
          meta={`Without base ${formatPercent(winRateWithoutBase)}`}
          accent={COLORS.red}
        />
      </View>

      <View style={styles.insightPanel}>
        <Text style={styles.sectionTitle}>Quick Reads</Text>
        <View style={styles.insightList}>
          {insights.map((insight, index) => (
            <InsightBullet key={`${insight}-${index}`} text={insight} />
          ))}
        </View>
      </View>

      <ScopePanel
        eyebrow="Personal"
        title={resolvedPlayer.name}
        subtitle={`Across ${personalSamples.length} tracked games, this is how their own stay-at-base rate lines up with outcomes.`}
        rows={personalRows}
        minGames={PERSONAL_MIN_GAMES}
        chartKeys={PERSONAL_CHART_KEYS}
        chartSamples={personalSamples}
        chartSubtitlePrefix="Your games"
        colorMap={playerColorMap}
        singleColor={accentColor}
      />

      <ScopePanel
        eyebrow="Global"
        title="All Player-Games"
        subtitle={`Across ${samples.length} player-game rows, this is the broader table pattern behind stay-at-base decisions.`}
        rows={globalRows}
        minGames={GLOBAL_MIN_GAMES}
        chartKeys={GLOBAL_CHART_KEYS}
        chartSamples={samples}
        chartSubtitlePrefix="All tracked rows"
        colorMap={playerColorMap}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.18)",
    gap: 10,
  },
  eyebrow: {
    color: COLORS.cyan,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "900",
  },
  selectorSection: {
    gap: 10,
  },
  selectorTabStack: {
    gap: 8,
  },
  selectorSegmentedControl: {
    width: "100%",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  summaryCard: {
    width: "48.5%",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryValue: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  summaryMeta: {
    color: COLORS.textSecondary,
    fontSize: 10,
    lineHeight: 15,
  },
  insightPanel: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.18)",
    backgroundColor: "rgba(103,232,249,0.06)",
    gap: 8,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "900",
  },
  insightList: {
    gap: 8,
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  insightDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: COLORS.cyan,
    marginTop: 6,
  },
  insightText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 17,
  },
  scopePanel: {
    gap: 10,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    backgroundColor: COLORS.surfaceAlt,
  },
  scopeEyebrow: {
    color: COLORS.cyan,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  scopeTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "900",
  },
  scopeSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 17,
  },
  correlationList: {
    gap: 8,
  },
  correlationCard: {
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    backgroundColor: "rgba(4,8,20,0.7)",
    gap: 4,
  },
  correlationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  correlationLabel: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "900",
  },
  correlationBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  correlationBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  correlationValue: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "900",
  },
  correlationStory: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  chartList: {
    gap: 10,
  },
  emptyCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    gap: 6,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "900",
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 17,
  },
});
