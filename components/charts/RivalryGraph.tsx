import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import ChartFocusCard from "@/components/charts/ChartFocusCard";
import ChartStage from "@/components/charts/ChartStage";
import ChartUnderlineTabs from "@/components/charts/ChartUnderlineTabs";
import Text from "@/components/ui/Text";
import { getPlayerColor as normalizePlayerColor } from "@/utils/chartTheme";

const COLORS = {
  card: "rgba(12,18,38,0.92)",
  cardAlt: "rgba(16,24,48,0.95)",
  text: "#E2E8F0",
  sub: "#94A3B8",
  muted: "#64748B",
  accent: "#A855F7",
  accentSoft: "rgba(168,85,247,0.18)",
  blue: "#3B82F6",
  blueSoft: "rgba(59,130,246,0.18)",
  green: "#22C55E",
  greenSoft: "rgba(34,197,94,0.16)",
  red: "#EF4444",
  border: "rgba(255,255,255,0.08)",
  whiteSoft: "rgba(255,255,255,0.06)",
};

type Player = {
  id: string;
  name: string;
  color?: string;
};

type GameTotals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  objectivePrestige?: number;
  assistPrestigeSent?: number;
  assistPrestigeGiven?: number;
  assistsGiven?: number;
  assists?: number;
  score?: number;
};

type Game = {
  id?: string | number;
  createdAt?: number;
  players?: Array<{ id: string }>;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  totals?: Record<string, GameTotals>;
};

type ModeKey = "dominance" | "winRate" | "prestigeMargin" | "synergy";

type RivalryRow = {
  opponentId: string;
  opponentName: string;
  opponentColor: string;
  gamesTogether: number;
  wins: number;
  losses: number;
  playerPrestigeTotal: number;
  opponentPrestigeTotal: number;
  netAssistBenefitTotal: number;
  dominance: number;
  winRate: number;
  prestigeMargin: number;
  synergy: number;
  intensity: number;
  recentEdge: number;
  momentum: number;
};

type Props = {
  playerId: string;
  games?: Game[];
  players?: Player[];
};

const EMPTY_GAMES: Game[] = [];
const EMPTY_PLAYERS: Player[] = [];

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : Number(value) || 0;
}

function safeDiv(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function withAlpha(hex: string, alphaHex: string): string {
  if (typeof hex === "string" && /^#[0-9A-Fa-f]{6}$/.test(hex)) {
    return `${hex}${alphaHex}`;
  }
  return hex;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getWinnerId(game?: Game): string | undefined {
  return game ? game.winnerId ?? game.selectedWinnerId ?? game.manualWinnerId : undefined;
}

function getTotalPrestige(totals?: GameTotals | null): number {
  if (!totals) return 0;

  if (typeof totals.totalPrestige === "number" && Number.isFinite(totals.totalPrestige)) {
    return totals.totalPrestige;
  }

  if (typeof totals.prestige === "number" && Number.isFinite(totals.prestige)) {
    return totals.prestige;
  }

  return (
    toNumber(totals.directPrestige) +
    toNumber(totals.assistPrestigeReceived) +
    toNumber(totals.objectivePrestige)
  );
}

function getAssistOut(totals?: GameTotals | null): number {
  return Math.max(
    0,
    toNumber(totals?.assistPrestigeSent) ||
      toNumber(totals?.assistPrestigeGiven) ||
      toNumber(totals?.assistsGiven) ||
      toNumber(totals?.assists)
  );
}

function getPlayerColor(color?: string, index = 0): string {
  if (typeof color === "string" && color.trim()) {
    return normalizePlayerColor(color.trim());
  }

  const fallback = [
    COLORS.accent,
    COLORS.blue,
    COLORS.green,
    COLORS.blue,
    COLORS.red,
    "#14B8A6",
    "#E879F9",
    "#F97316",
  ];

  return fallback[index % fallback.length] ?? COLORS.accent;
}

function formatSigned(value: number, digits = 2): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function getModeLabel(mode: ModeKey): string {
  switch (mode) {
    case "dominance":
      return "Dominance";
    case "winRate":
      return "Win Rate";
    case "prestigeMargin":
      return "Prestige Margin";
    case "synergy":
      return "Synergy";
    default:
      return "Value";
  }
}

function getModeDescription(mode: ModeKey): string {
  switch (mode) {
    case "dominance":
      return "Wins minus losses per shared game";
    case "winRate":
      return "Share of wins against this opponent";
    case "prestigeMargin":
      return "Average prestige edge per shared game";
    case "synergy":
      return "Relative assist in/out edge per shared game";
    default:
      return "Comparison value";
  }
}

function getModeValue(row: RivalryRow, mode: ModeKey): number {
  switch (mode) {
    case "winRate":
      return row.winRate * 2 - 1;
    case "prestigeMargin":
      return row.prestigeMargin;
    case "synergy":
      return row.synergy;
    case "dominance":
    default:
      return row.dominance;
  }
}

function formatModeValue(row: RivalryRow, mode: ModeKey): string {
  switch (mode) {
    case "winRate":
      return formatPct(row.winRate);
    case "prestigeMargin":
      return formatSigned(row.prestigeMargin);
    case "synergy":
      return formatSigned(row.synergy);
    case "dominance":
    default:
      return formatSigned(row.dominance);
  }
}

function getDeltaWord(value: number, mode: ModeKey): string {
  const amount = Math.abs(value);

  if (mode === "winRate") {
    if (amount < 0.08) return "slightly";
    if (amount < 0.2) return "clearly";
    return "heavily";
  }

  if (amount < 0.2) return "slightly";
  if (amount < 0.75) return "clearly";
  return "heavily";
}

function getOverallEdgeText(row: RivalryRow, playerAName: string): string {
  if (row.gamesTogether < 2) {
    return `${playerAName} and ${row.opponentName} only played a tiny sample together.`;
  }

  const dominanceGap = row.dominance;
  const prestigeGap = row.prestigeMargin;
  const synergyGap = row.synergy;
  const favoredName = row.winRate >= 0.5 ? playerAName : row.opponentName;
  const intensityWord = getDeltaWord(Math.abs(row.winRate - 0.5) * 2, "winRate");

  if (Math.abs(row.winRate - 0.5) < 0.08 && Math.abs(prestigeGap) < 0.35) {
    return `${playerAName} and ${row.opponentName} are very even overall.`;
  }

  let detail = "";
  if (Math.abs(prestigeGap) >= Math.abs(synergyGap) && Math.abs(prestigeGap) > 0.15) {
    detail =
      prestigeGap > 0
        ? `${playerAName} scores more prestige per game`
        : `${row.opponentName} scores more prestige per game`;
  } else if (Math.abs(synergyGap) > 0.15) {
    detail =
      synergyGap > 0
        ? `${playerAName} gets more help value from the team flow`
        : `${row.opponentName} gets more help value from the team flow`;
  } else if (Math.abs(dominanceGap) > 0.05) {
    detail =
      dominanceGap > 0
        ? `${playerAName} wins more of the close results`
        : `${row.opponentName} wins more of the close results`;
  }

  return detail
    ? `${favoredName} ${intensityWord} leads this matchup, and ${detail}.`
    : `${favoredName} ${intensityWord} leads this matchup overall.`;
}

function getSimpleMetricSentence(
  row: RivalryRow,
  mode: ModeKey,
  playerAName: string
): string {
  const value = getModeValue(row, mode);
  const absValue = Math.abs(value);
  const strength = getDeltaWord(absValue, mode);

  if (mode === "winRate") {
    if (Math.abs(row.winRate - 0.5) < 0.05) {
      return `${playerAName} and ${row.opponentName} win at almost the same rate.`;
    }
    return value >= 0
      ? `${playerAName} ${strength} wins this matchup more often than ${row.opponentName}.`
      : `${row.opponentName} ${strength} wins this matchup more often than ${playerAName}.`;
  }

  if (mode === "prestigeMargin") {
    if (absValue < 0.15) {
      return `${playerAName} and ${row.opponentName} score almost the same prestige per game.`;
    }
    return value >= 0
      ? `${playerAName} ${strength} scores more prestige per game than ${row.opponentName}.`
      : `${row.opponentName} ${strength} scores more prestige per game than ${playerAName}.`;
  }

  if (mode === "synergy") {
    if (absValue < 0.15) {
      return `${playerAName} and ${row.opponentName} get about the same support value from assists.`;
    }
    return value >= 0
      ? `${playerAName} ${strength} gets better assist flow than ${row.opponentName}.`
      : `${row.opponentName} ${strength} gets better assist flow than ${playerAName}.`;
  }

  if (absValue < 0.08) {
    return `${playerAName} and ${row.opponentName} have very similar overall results.`;
  }

  return value >= 0
    ? `${playerAName} ${strength} controls more of the results in this matchup.`
    : `${row.opponentName} ${strength} controls more of the results in this matchup.`;
}

function getMomentumSentence(row: RivalryRow, playerAName: string): string {
  if (Math.abs(row.momentum) < 0.08) {
    return `Recent games look similar to the full matchup history.`;
  }

  return row.momentum > 0
    ? `${playerAName} has been doing better lately than in the full sample.`
    : `${row.opponentName} has been doing better lately than in the full sample.`;
}

function getVerdict(row: RivalryRow, playerAName: string): string {
  if (row.gamesTogether < 2) return "Tiny sample";
  if (row.winRate >= 0.75) return `${playerAName} favored`;
  if (row.winRate <= 0.25) return `${row.opponentName} favored`;
  if (Math.abs(row.momentum) > 0.22) {
    return row.momentum > 0 ? `${playerAName} trending up` : `${row.opponentName} trending up`;
  }
  if (Math.abs(row.prestigeMargin) < 0.35) return "Usually close";
  return row.prestigeMargin > 0
    ? `${playerAName} edges on prestige`
    : `${row.opponentName} edges on prestige`;
}

function getGameSortValue(game: Game, index: number): number {
  const createdAt = toNumber(game.createdAt);
  if (createdAt > 0) return createdAt;
  if (typeof game.id === "number") return game.id;
  if (typeof game.id === "string" && /^\d+$/.test(game.id)) return Number(game.id);
  return index;
}

function getRivalryIntensity(
  gamesTogether: number,
  winRate: number,
  prestigeMargin: number,
  momentum: number
): number {
  const parity = 1 - Math.abs(winRate - 0.5) * 2;
  const closeness = 1 - Math.min(1, Math.abs(prestigeMargin) / 4);
  return gamesTogether * 0.65 + parity * 7 + closeness * 3 + Math.abs(momentum) * 2;
}

function buildRivalryRows(
  games: Game[],
  players: Player[],
  selectedPlayerAId: string
): RivalryRow[] {
  const orderedGames = [...games]
    .map((game, index) => ({ game, sortValue: getGameSortValue(game, index) }))
    .sort((a, b) => a.sortValue - b.sortValue)
    .map((entry) => entry.game);

  return players
    .filter((player) => player.id !== selectedPlayerAId)
    .map((opponent, index) => {
      const sharedGames = orderedGames.filter((game) => {
        const ids = (game.players ?? []).map((player) => String(player.id));
        return ids.includes(String(selectedPlayerAId)) && ids.includes(String(opponent.id));
      });

      let wins = 0;
      let losses = 0;
      let playerPrestigeTotal = 0;
      let opponentPrestigeTotal = 0;
      let netAssistBenefitTotal = 0;

      const recentSharedGames = sharedGames.slice(-Math.min(3, sharedGames.length));
      let recentScore = 0;

      for (const game of sharedGames) {
        const playerTotals = game.totals?.[selectedPlayerAId] ?? {};
        const opponentTotals = game.totals?.[opponent.id] ?? {};

        const winnerId = getWinnerId(game);
        if (String(winnerId) === String(selectedPlayerAId)) wins += 1;
        if (String(winnerId) === String(opponent.id)) losses += 1;

        const playerPrestige = getTotalPrestige(playerTotals);
        const opponentPrestige = getTotalPrestige(opponentTotals);

        playerPrestigeTotal += playerPrestige;
        opponentPrestigeTotal += opponentPrestige;

        const playerAssistOut = getAssistOut(playerTotals);
        const opponentAssistOut = getAssistOut(opponentTotals);
        netAssistBenefitTotal += playerAssistOut - opponentAssistOut;
      }

      for (const game of recentSharedGames) {
        const winnerId = getWinnerId(game);
        const playerTotals = game.totals?.[selectedPlayerAId] ?? {};
        const opponentTotals = game.totals?.[opponent.id] ?? {};

        const playerPrestige = getTotalPrestige(playerTotals);
        const opponentPrestige = getTotalPrestige(opponentTotals);

        let edge = 0;
        if (String(winnerId) === String(selectedPlayerAId)) edge += 1;
        if (String(winnerId) === String(opponent.id)) edge -= 1;
        edge += clamp((playerPrestige - opponentPrestige) / 10, -1, 1);

        recentScore += edge;
      }

      const gamesTogether = sharedGames.length;
      const dominance = gamesTogether > 0 ? safeDiv(wins - losses, gamesTogether) : 0;
      const winRate = gamesTogether > 0 ? safeDiv(wins, gamesTogether) : 0.5;
      const prestigeMargin =
        gamesTogether > 0
          ? safeDiv(playerPrestigeTotal - opponentPrestigeTotal, gamesTogether)
          : 0;
      const synergy =
        gamesTogether > 0 ? safeDiv(netAssistBenefitTotal, gamesTogether) : 0;
      const recentEdge =
        recentSharedGames.length > 0 ? safeDiv(recentScore, recentSharedGames.length) : 0;
      const momentum = recentEdge - dominance;
      const intensity = getRivalryIntensity(
        gamesTogether,
        winRate,
        prestigeMargin,
        momentum
      );

      return {
        opponentId: opponent.id,
        opponentName: opponent.name ?? "Unknown",
        opponentColor: getPlayerColor(opponent.color, index + 1),
        gamesTogether,
        wins,
        losses,
        playerPrestigeTotal,
        opponentPrestigeTotal,
        netAssistBenefitTotal,
        dominance,
        winRate,
        prestigeMargin,
        synergy,
        intensity,
        recentEdge,
        momentum,
      };
    })
    .sort((a, b) => {
      if (b.intensity !== a.intensity) return b.intensity - a.intensity;
      if (b.gamesTogether !== a.gamesTogether) return b.gamesTogether - a.gamesTogether;
      return a.opponentName.localeCompare(b.opponentName);
    });
}

function SectionHeader({
  title,
  sub,
}: {
  title: string;
  sub: string;
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSub}>{sub}</Text>
    </View>
  );
}

function UnderlineOption({
  label,
  active,
  activeColor = COLORS.accent,
  onPress,
}: {
  label: string;
  active: boolean;
  activeColor?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.underlineTabButton}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Text
        style={[
          styles.underlineTabText,
          active && { color: activeColor },
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.underlineTabLine,
          active && { backgroundColor: activeColor },
        ]}
      />
    </TouchableOpacity>
  );
}

export default function RivalryGraph({
  playerId,
  games = EMPTY_GAMES,
  players = EMPTY_PLAYERS,
}: Props) {
  const [mode, setMode] = useState<ModeKey>("dominance");
  const [selectedPlayerAId, setSelectedPlayerAId] = useState<string | null>(playerId ?? null);
  const [selectedPlayerBId, setSelectedPlayerBId] = useState<string | null>(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    if (!players.length) {
      setSelectedPlayerAId(null);
      setSelectedPlayerBId(null);
      return;
    }

    const ids = new Set(players.map((player) => player.id));
    const nextA =
      selectedPlayerAId && ids.has(selectedPlayerAId)
        ? selectedPlayerAId
        : ids.has(playerId)
        ? playerId
        : players[0]?.id ?? null;

    const fallbackB = players.find((player) => player.id !== nextA)?.id ?? null;
    const nextB =
      selectedPlayerBId && ids.has(selectedPlayerBId) && selectedPlayerBId !== nextA
        ? selectedPlayerBId
        : fallbackB;

    if (nextA !== selectedPlayerAId) setSelectedPlayerAId(nextA);
    if (nextB !== selectedPlayerBId) setSelectedPlayerBId(nextB);
  }, [playerId, players, selectedPlayerAId, selectedPlayerBId]);

  const playerA = useMemo(
    () => players.find((player) => player.id === selectedPlayerAId) ?? null,
    [players, selectedPlayerAId]
  );

  const playerB = useMemo(
    () => players.find((player) => player.id === selectedPlayerBId) ?? null,
    [players, selectedPlayerBId]
  );

  const rows = useMemo(
    () => (selectedPlayerAId ? buildRivalryRows(games, players, selectedPlayerAId) : []),
    [games, players, selectedPlayerAId]
  );

  useEffect(() => {
    if (!rows.length) {
      setSelectedPlayerBId(null);
      return;
    }

    const ids = new Set(rows.map((row) => row.opponentId));
    if (selectedPlayerBId && ids.has(selectedPlayerBId)) return;

    setSelectedPlayerBId(rows[0]?.opponentId ?? null);
  }, [rows, selectedPlayerBId]);

  const selected = useMemo(
    () => rows.find((row) => row.opponentId === selectedPlayerBId) ?? rows[0] ?? null,
    [rows, selectedPlayerBId]
  );

  const playerAName = playerA?.name ?? "Player A";
  const playerAColor = getPlayerColor(playerA?.color, 0);
  const playerBName = playerB?.name ?? selected?.opponentName ?? "Player B";

  const noDirectMatchup =
    !!selectedPlayerBId &&
    !rows.some((row) => row.opponentId === selectedPlayerBId && row.gamesTogether > 0);

  const maxAbs = useMemo(() => {
    const values = rows.map((row) => Math.abs(getModeValue(row, mode)));
    return Math.max(1, ...values);
  }, [rows, mode]);

  const summaryCards = useMemo(() => {
    if (!selected) return [];

    return [
      {
        label: "Shared Games",
        value: String(selected.gamesTogether),
      },
      {
        label: "Record",
        value: `${selected.wins}-${selected.losses}`,
      },
      {
        label: getModeLabel(mode),
        value: formatModeValue(selected, mode),
      },
      {
        label: "Verdict",
        value: getVerdict(selected, playerAName),
      },
    ];
  }, [selected, mode, playerAName]);
  const modeTabs = useMemo(
    () =>
      (["dominance", "winRate", "prestigeMargin", "synergy"] as ModeKey[]).map(
        (entry) => ({
          key: entry,
          label: getModeLabel(entry),
        })
      ),
    []
  );

  const onChartLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.max(0, Math.floor(event.nativeEvent.layout.width));
    if (nextWidth !== chartWidth) setChartWidth(nextWidth);
  };

  if (!players.length) {
    return (
      <View style={styles.sectionCompact}>
        <Text style={styles.emptyText}>Rivalry Graph needs players to compare.</Text>
      </View>
    );
  }

  if (!playerA) {
    return (
      <View style={styles.sectionCompact}>
        <Text style={styles.emptyText}>No focus player selected yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionCompact}>
        <SectionHeader title="Player A" sub="Focus player" />
        <View style={styles.underlineSelectorRow}>
          {players.map((player, index) => {
            const active = player.id === selectedPlayerAId;
            const color = getPlayerColor(player.color, index);
            return (
              <UnderlineOption
                key={`a-${player.id}`}
                label={player.name || "Unknown"}
                active={active}
                activeColor={color}
                onPress={() => {
                  setSelectedPlayerAId(player.id);
                  if (player.id === selectedPlayerBId) {
                    const fallback =
                      players.find((entry) => entry.id !== player.id)?.id ?? null;
                    setSelectedPlayerBId(fallback);
                  }
                }}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCompact}>
        <SectionHeader title="Player B" sub="Head-to-head target" />
        <View style={styles.underlineSelectorRow}>
          {players
            .filter((player) => player.id !== selectedPlayerAId)
            .map((player, index) => {
              const active = player.id === selectedPlayerBId;
              const color = getPlayerColor(player.color, index + 1);
              return (
                <UnderlineOption
                  key={`b-${player.id}`}
                  label={player.name || "Unknown"}
                  active={active}
                  activeColor={color}
                  onPress={() => setSelectedPlayerBId(player.id)}
                />
              );
            })}
        </View>
      </View>

      <View style={styles.sectionCompact}>
        <SectionHeader title="Mode" sub={getModeDescription(mode)} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.underlineScroll}
        >
          <ChartUnderlineTabs
            items={modeTabs}
            activeKey={mode}
            onChange={(next) => setMode(next as ModeKey)}
          />
        </ScrollView>
      </View>

      {noDirectMatchup ? (
        <View style={styles.sectionCompact}>
          <Text style={styles.noticeTitle}>No shared matchup found</Text>
          <Text style={styles.noticeText}>
            {playerAName} and {playerBName} do not have any games together in the current data.
          </Text>
        </View>
      ) : null}

      {selected ? (
        <View style={styles.sectionCompact}>
          <SectionHeader title="Focus" sub={`${playerAName} vs ${selected.opponentName}`} />

          <ChartFocusCard
            title={selected.opponentName}
            value={formatModeValue(selected, mode)}
            helper={`${selected.gamesTogether} shared games | ${getModeLabel(mode)}`}
            story={getOverallEdgeText(selected, playerAName)}
            tone="comparison"
            accentColor={
              getModeValue(selected, mode) >= 0 ? playerAColor : selected.opponentColor
            }
            style={styles.focusCard}
          />

          <View style={styles.metricGridDense}>
            {summaryCards.map((card, index) => (
              <View
                key={`${card.label}-${index}`}
                style={[
                  styles.metricCardDense,
                  card.label === "Verdict" && {
                    backgroundColor: withAlpha(playerAColor, "14"),
                    borderColor: withAlpha(playerAColor, "55"),
                  },
                ]}
              >
                <Text style={styles.metricLabelCompact}>{card.label}</Text>
                <Text
                  style={[
                    styles.metricValueCompact,
                    card.label === "Verdict" && { color: playerAColor },
                  ]}
                  numberOfLines={1}
                >
                  {card.value}
                </Text>
              </View>
            ))}
          </View>

          <View
            style={[
              styles.insightCardCompact,
              {
                borderColor: withAlpha(playerAColor, "55"),
                backgroundColor: withAlpha(playerAColor, "12"),
              },
            ]}
          >
            <Text style={styles.summarySentence}>{getOverallEdgeText(selected, playerAName)}</Text>
            <Text style={styles.summarySentence}>
              {getSimpleMetricSentence(selected, mode, playerAName)}
            </Text>
            <Text style={styles.summarySentence}>
              {getMomentumSentence(selected, playerAName)}
            </Text>
          </View>
        </View>
      ) : null}

      <ChartStage
        tone="comparison"
        style={styles.chartStage}
        plotStyle={styles.chartStagePlot}
        header={<SectionHeader title="Rivalries" sub={`${rows.length} opponents`} />}
      >

        {!rows.length ? (
          <Text style={styles.emptyText}>No rivalry data yet for {playerAName}.</Text>
        ) : (
          <View style={styles.chartWrap} onLayout={onChartLayout}>
            {rows.map((row) => {
              const isSelected = row.opponentId === selected?.opponentId;
              const value = getModeValue(row, mode);
              const positive = value >= 0;
              const outerWidth = Math.max(240, chartWidth);
              const labelWidth = Math.max(76, Math.min(118, outerWidth * 0.24));
              const valueWidth = Math.max(60, Math.min(76, outerWidth * 0.18));
              const laneWidth = Math.max(100, outerWidth - labelWidth - valueWidth - 16);
              const halfWidth = laneWidth / 2;
              const rawBarWidth = (Math.abs(value) / Math.max(1, maxAbs)) * (halfWidth - 6);
              const barWidth = Math.max(value === 0 ? 0 : 6, rawBarWidth);

              return (
                <TouchableOpacity
                  key={row.opponentId}
                  style={[
                    styles.rowCard,
                    isSelected && {
                      borderColor: withAlpha(row.opponentColor, "66"),
                      backgroundColor: withAlpha(row.opponentColor, "12"),
                    },
                  ]}
                  onPress={() => setSelectedPlayerBId(row.opponentId)}
                  activeOpacity={0.92}
                >
                  <View style={[styles.rowLabelWrap, { width: labelWidth }]}>
                    <Text
                      style={[
                        styles.rowLabel,
                        isSelected && { color: row.opponentColor },
                      ]}
                      numberOfLines={1}
                    >
                      {row.opponentName}
                    </Text>
                    <Text style={styles.rowSubLabel} numberOfLines={1}>
                      {row.gamesTogether} games
                    </Text>
                  </View>

                  <View style={[styles.ladderWrap, { width: laneWidth }]}>
                    <View style={styles.centerLine} />

                    {value !== 0 ? (
                      <View
                        style={[
                          styles.barFill,
                          positive
                            ? {
                                left: halfWidth,
                                width: barWidth,
                                backgroundColor: playerAColor,
                              }
                            : {
                                right: halfWidth,
                                width: barWidth,
                                backgroundColor: row.opponentColor,
                              },
                        ]}
                      />
                    ) : null}

                    <View
                      style={[
                        styles.endpointDot,
                        positive
                          ? {
                              left: halfWidth + Math.max(0, barWidth - 5),
                              backgroundColor: playerAColor,
                            }
                          : {
                              left: halfWidth - Math.max(0, barWidth - 5) - 10,
                              backgroundColor: row.opponentColor,
                            },
                      ]}
                    />
                  </View>

                  <View style={[styles.rowValueWrap, { width: valueWidth }]}>
                    <Text
                      style={[
                        styles.rowValue,
                        {
                          color: positive ? playerAColor : row.opponentColor,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {formatModeValue(row, mode)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ChartStage>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },

  sectionCompact: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
  },
  insightCardCompact: {
    backgroundColor: COLORS.cardAlt,
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 6,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    flexShrink: 1,
  },
  sectionSub: {
    color: COLORS.sub,
    fontSize: 10,
    textAlign: "right",
    flexShrink: 1,
  },
  emptyText: {
    color: COLORS.sub,
    fontSize: 11,
  },
  underlineScroll: {
    paddingRight: 12,
  },

  underlineSelectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 12,
    rowGap: 8,
    alignItems: "flex-end",
  },
  underlineTabButton: {
    paddingBottom: 2,
  },
  underlineTabText: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "700",
  },
  underlineTabLine: {
    marginTop: 4,
    height: 2,
    borderRadius: 999,
    backgroundColor: "transparent",
  },

  metricGridDense: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  focusCard: {
    marginBottom: 8,
  },
  metricCardDense: {
    width: "49%",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 52,
    justifyContent: "center",
    backgroundColor: COLORS.whiteSoft,
    borderWidth: 1,
    borderColor: "transparent",
  },
  metricLabelCompact: {
    color: COLORS.sub,
    fontSize: 10,
    lineHeight: 12,
    marginBottom: 4,
  },
  metricValueCompact: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },
  summarySentence: {
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 6,
  },

  noticeTitle: {
    color: COLORS.blue,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4,
  },
  noticeText: {
    color: COLORS.sub,
    fontSize: 11,
    lineHeight: 16,
  },

  chartWrap: {
    gap: 6,
  },
  chartStage: {
    marginBottom: 6,
  },
  chartStagePlot: {
    paddingVertical: 8,
  },
  rowCard: {
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: COLORS.cardAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowLabelWrap: {
    justifyContent: "center",
  },
  rowLabel: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "800",
  },
  rowSubLabel: {
    color: COLORS.sub,
    fontSize: 10,
    marginTop: 2,
  },

  ladderWrap: {
    height: 18,
    borderRadius: 999,
    backgroundColor: COLORS.whiteSoft,
    position: "relative",
    overflow: "hidden",
    justifyContent: "center",
  },
  centerLine: {
    position: "absolute",
    left: "50%",
    marginLeft: -1,
    width: 2,
    top: 1,
    bottom: 1,
    borderRadius: 999,
    backgroundColor: withAlpha(COLORS.text, "22"),
  },
  barFill: {
    position: "absolute",
    top: 3,
    bottom: 3,
    borderRadius: 999,
  },
  endpointDot: {
    position: "absolute",
    top: 4,
    width: 10,
    height: 10,
    borderRadius: 999,
  },

  rowValueWrap: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  rowValue: {
    fontSize: 11,
    fontWeight: "900",
  },
  stageFooter: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: "700",
  },
});
