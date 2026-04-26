import React, { useMemo, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";

import { useStore } from "@/store/useStore";
import StarryNight from "@/components/ui/StarryNight";
import Text from "@/components/ui/Text";

import PlayerCardIcon from "@/components/player/PlayerCardIcon";
import PlaystyleSection from "@/components/stats/PlaystyleSection";

import {
  buildLeaderboard,
  buildLeagueSummary,
  type Player,
  type Game,
} from "@/utils/statsEngine";
import { buildDerivedPlayerStats } from "@/utils/derivedMetricsEngine";
import { buildGlobalCorrelations } from "@/utils/correlationEngine";
import { buildIndividualCorrelations } from "@/utils/individualCorrelationEngine";
import { buildGameCorrelations } from "@/utils/gameCorrelationEngine";

type StatsTab = "overview" | "players" | "playstyle" | "correlations" | "games";
type CorrelationTab = "global" | "individual" | "game";

const GLOBAL_CORRELATION_TIERS = [
  {
    title: "Tier 1 · Primary Signals",
    keys: [
      "allContractsEfficiency",
      "failureRate",
      "earlyLeadRate",
      "lateLeadRate",
      "objectivesPerGame",
      "assists",
      "assistPrestigeReceived",
      "prestigePerTurn",
    ],
  },
  {
    title: "Tier 2 · Conversion + Advanced",
    keys: [
      "consistencyScore",
      "clutchScore",
      "leadConversion",
      "objectiveConversionRate",
      "supportConversionRate",
      "opponentStrength",
    ],
  },
  {
    title: "Tier 3 · Meta / Style",
    keys: ["avgStartSeat", "interactionIndex", "aggroIndex", "tempoIndex"],
  },
];

const INDIVIDUAL_CORRELATION_TIERS = [
  {
    title: "Tier 1 · Core",
    keys: [
      "allContractsEfficiency",
      "earlyLeadRate",
      "lateLeadRate",
      "objectivesPerGame",
    ],
  },
  {
    title: "Tier 2 · Support",
    keys: ["assists", "assistPrestigeReceived", "clutchScore"],
  },
  {
    title: "Tier 3 · Context",
    keys: ["opponentStrength", "tempoIndex"],
  },
];

const GAME_CORRELATION_TIERS = [
  {
    title: "Tier 2 · Match Conditions",
    keys: [
      "totalAssistsVsEarlyLeaderWinning",
      "totalObjectivesVsObjectiveLeaderWinning",
      "supportDensityVsSupportLeaderWinning",
    ],
  },
  {
    title: "Tier 3 · Environment",
    keys: [
      "averageEfficiencyVsEarlyLeaderWinning",
      "failuresVsSupportLeaderWinning",
      "interactionDensityVsObjectiveLeaderWinning",
    ],
  },
];

function getRowsForTier(rows: any[], keys: string[]) {
  return keys.map((k) => rows.find((r) => r.key === k)).filter(Boolean);
}

const COLORS = {
  bg: "#040814",
  surface: "#0A1428",
  surfaceAlt: "#0F172A",
  surfaceGlass: "#0B1323",

  borderSoft: "rgba(148, 163, 184, 0.18)",
  borderStrong: "rgba(139, 92, 246, 0.36)",

  textPrimary: "#F8FBFF",
  textSecondary: "#C7D6F3",
  textMuted: "#8EA6C8",

  brand: "#8B5CF6",
  brandTint: "rgba(139, 92, 246, 0.16)",

  cyan: "#67E8F9",
  blueGlow: "#60A5FA",

  success: "#22c55e",
  danger: "#ef4444",
  gold: "#FBBF24",
  purple: "#A855F7",
  blue: "#3B82F6",
  teal: "#22D3EE",
  pink: "#EC4899",
};

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${(value * 100).toFixed(0)}%`;
}

function formatSigned(value: number, digits = 1) {
  if (!Number.isFinite(value)) return "";
  if (value > 0) return `+${value.toFixed(digits)}`;
  if (value < 0) return value.toFixed(digits);
  return `0.${"0".repeat(Math.max(0, digits - 1))}`;
}

function formatCorrelation(value: number) {
  if (!Number.isFinite(value)) return "0.00";
  return value.toFixed(2);
}

function formatCorrelationValue(value: number) {
  if (!Number.isFinite(value)) return "0.00";
  return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

function getCorrelationStrength(value: number) {
  const abs = Math.abs(value);
  if (abs >= 0.7) return "Very Strong";
  if (abs >= 0.5) return "Strong";
  if (abs >= 0.3) return "Moderate";
  if (abs >= 0.1) return "Weak";
  return "Minimal";
}

function getCorrelationTone(value: number) {
  const abs = Math.abs(value);
  if (abs < 0.1) return "Neutral";
  return value > 0 ? "Positive" : "Negative";
}

function getCorrelationMeaning(label: string, value: number) {
  if (!Number.isFinite(value)) {
    return `${label} currently has no usable signal.`;
  }

  const abs = Math.abs(value);

  if (abs < 0.1) {
    return `${label} is not showing a meaningful relationship to winning yet.`;
  }

  const lower = label.toLowerCase();

  if (value > 0) {
    return `${getCorrelationStrength(
      value
    )} positive relationship. Higher ${lower} tends to line up with more winning.`;
  }

  return `${getCorrelationStrength(
    value
  )} negative relationship. Higher ${lower} tends to line up with less winning.`;
}

function getTopWinningSignals(rows: any[]) {
  return [...rows]
    .filter((row) => Number.isFinite(row?.value))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 3);
}

function getPlayerColor(color?: string) {
  if (!color) return COLORS.brand;
  return color;
}

function getGlowColor(color?: string) {
  const base = getPlayerColor(color);
  return `${base}22`;
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.tabButton}>
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
        {label}
      </Text>
      <View
        style={[
          styles.tabButtonUnderline,
          active && styles.tabButtonUnderlineActive,
        ]}
      />
    </Pressable>
  );
}

function PrimaryTabPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.primaryTabPill, active && styles.primaryTabPillActive]}
    >
      <Text style={[styles.primaryTabPillText, active && styles.primaryTabPillTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function StatPill({
  label,
  value,
  accent,
  strong = false,
  metricKey,
  onInfoPress,
}: {
  label: string;
  value: string | number;
  accent?: string;
  strong?: boolean;
  metricKey?: string;
  onInfoPress?: () => void;
}) {
  return (
    <View
      style={[
        styles.statPill,
        strong && styles.statPillStrong,
        accent ? { borderColor: accent, backgroundColor: `${accent}12` } : null,
      ]}
    >
      <View style={styles.statPillHeader}>
        <Text style={styles.statPillLabel}>{label}</Text>
        {metricKey && onInfoPress ? (
          <TouchableOpacity
            onPress={onInfoPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.infoButtonText}>?</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={[styles.statPillValue, strong && styles.statPillValueStrong]}>
        {value}
      </Text>
    </View>
  );
}

function CorrelationRowCard({ row }: { row: any }) {
  const tone = getCorrelationTone(row.value);
  const accent =
    tone === "Neutral"
      ? COLORS.textMuted
      : tone === "Positive"
        ? COLORS.success
        : COLORS.danger;

  return (
    <View style={[styles.correlationCard, { borderColor: `${accent}55` }]}>
      <View style={styles.correlationHeader}>
        <Text style={styles.correlationLabel}>{row.label}</Text>
        <View
          style={[
            styles.correlationBadge,
            { borderColor: `${accent}66`, backgroundColor: `${accent}16` },
          ]}
        >
          <Text style={[styles.correlationBadgeText, { color: accent }]}>
            {formatCorrelationValue(row.value)} · {getCorrelationStrength(row.value)}{" "}
            {tone}
          </Text>
        </View>
      </View>
      <Text style={styles.correlationMeaning}>
        {getCorrelationMeaning(row.label, row.value)}
      </Text>
    </View>
  );
}

function PlayerSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.playerSection}>
      <Text style={styles.playerSectionTitle}>{title}</Text>
      <View style={styles.compactGrid}>{children}</View>
    </View>
  );
}

function safeMetric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getGameWinnerId(game: any) {
  return game?.winnerId ?? game?.selectedWinnerId ?? game?.manualWinnerId ?? null;
}

function getGameRows(game: any) {
  const totals = game?.totals ?? {};
  return Object.entries(totals).map(([playerId, stats]: any) => ({
    playerId,
    prestige:
      safeMetric(
        stats?.totalPrestige ?? stats?.prestige ?? stats?.directPrestige
      ) + safeMetric(stats?.assistPrestigeReceived),
    assists: safeMetric(stats?.assists),
    objectives: safeMetric(stats?.contracts),
    failures: safeMetric(stats?.failures),
  }));
}

function buildSelectableGames(games: any[]) {
  return [...games].reverse().map((game: any, index: number) => {
    const rows = getGameRows(game).sort((a, b) => b.prestige - a.prestige);
    const winnerId = getGameWinnerId(game) ?? rows[0]?.playerId ?? null;
    const leader = rows[0];
    const runnerUp = rows[1];
    const margin = leader && runnerUp ? leader.prestige - runnerUp.prestige : 0;

    return {
      id: String(game?.id ?? `game-${index}`),
      label: `Game ${games.length - index}`,
      winnerId,
      margin,
      assists: rows.reduce((sum, row) => sum + row.assists, 0),
      objectives: rows.reduce((sum, row) => sum + row.objectives, 0),
      failures: rows.reduce((sum, row) => sum + row.failures, 0),
      rows,
    };
  });
}

export default function StatsScreen() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<StatsTab>("overview");
  const [activeCorrelationTab, setActiveCorrelationTab] =
    useState<CorrelationTab>("global");
  const [selectedCorrelationPlayerId, setSelectedCorrelationPlayerId] =
    useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const players = useStore((s: any) =>
    Array.isArray(s.players) ? s.players : []
  ) as Player[];
  const games = useStore((s: any) =>
    Array.isArray(s.games) ? s.games : []
  ) as Game[];

  const goToDefinition = (metricKey: string) => {
    router.push({
      pathname: "/definitions",
      params: { metric: metricKey },
    });
  };

  const baseLeaderboard = useMemo(
    () => buildLeaderboard(players, games),
    [players, games]
  );

  const leaderboard = useMemo(
    () => buildDerivedPlayerStats(baseLeaderboard, games),
    [baseLeaderboard, games]
  );

  const summary = useMemo(
    () => buildLeagueSummary(baseLeaderboard, games),
    [baseLeaderboard, games]
  );
  const statsHeroHighlights = useMemo(
    () => [
      { label: "Players", value: leaderboard.length },
      { label: "Games", value: games.length },
      {
        label: "Takeaway",
        value: leaderboard[0]?.name ? `${leaderboard[0].name} leads` : "Log a game",
      },
    ],
    [games.length, leaderboard]
  );

  const globalCorrelations = useMemo(
    () => buildGlobalCorrelations(leaderboard),
    [leaderboard]
  );

  const topSignals = useMemo(
    () => getTopWinningSignals(globalCorrelations),
    [globalCorrelations]
  );

  const resolvedCorrelationPlayerId =
    selectedCorrelationPlayerId ?? leaderboard[0]?.id ?? null;
  const resolvedPlayerId = selectedPlayerId ?? leaderboard[0]?.id ?? null;

  const individualCorrelations = useMemo(
    () =>
      buildIndividualCorrelations(
        leaderboard,
        resolvedCorrelationPlayerId ?? undefined
      ),
    [leaderboard, resolvedCorrelationPlayerId]
  );

  const selectedCorrelationPlayer = useMemo(
    () =>
      leaderboard.find((p: any) => p.id === resolvedCorrelationPlayerId) ?? null,
    [leaderboard, resolvedCorrelationPlayerId]
  );

  const selectedPlayer = useMemo(
    () => leaderboard.find((p: any) => p.id === resolvedPlayerId) ?? null,
    [leaderboard, resolvedPlayerId]
  );

  const selectableGames = useMemo(() => buildSelectableGames(games), [games]);

  const resolvedGameId = selectedGameId ?? selectableGames[0]?.id ?? null;

  const selectedGame = useMemo(
    () => selectableGames.find((g) => g.id === resolvedGameId) ?? null,
    [selectableGames, resolvedGameId]
  );

  const gameCorrelations = useMemo(
    () => buildGameCorrelations(games),
    [games]
  );

  const renderOverviewTab = () => (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Overview</Text>
      <Pressable
        style={styles.compareButtonTop}
        onPress={() => router.push("/charts/compare")}
      >
        <Text style={styles.compareButtonText}>Compare Players</Text>
      </Pressable>

      <View style={styles.compactGrid}>
        <StatPill label="Players" value={leaderboard.length} strong />
        <StatPill label="Games" value={games.length} strong />
        <StatPill
          label="Prestige"
          value={summary.totalPrestige}
          accent={COLORS.blueGlow}
          strong
          metricKey="totalPrestige"
          onInfoPress={() => goToDefinition("totalPrestige")}
        />
        <StatPill
          label="Total Score"
          value={summary.totalScore}
          accent={COLORS.purple}
          strong
          metricKey="score"
          onInfoPress={() => goToDefinition("score")}
        />
        <StatPill
          label="Assist Sent"
          value={summary.totalAssistSent.toFixed(1)}
          accent={COLORS.teal}
          metricKey="assistPrestigeSent"
          onInfoPress={() => goToDefinition("assistPrestigeSent")}
        />
        <StatPill
          label="Assist Received"
          value={summary.totalAssistReceived.toFixed(1)}
          accent={COLORS.blueGlow}
          metricKey="assistPrestigeReceived"
          onInfoPress={() => goToDefinition("assistPrestigeReceived")}
        />
        <StatPill
          label="Avg Winner Seat"
          value={summary.avgWinnerSeat > 0 ? summary.avgWinnerSeat.toFixed(2) : ""}
          accent={COLORS.blue}
        />
        <StatPill
          label="Seat ? Win Corr"
          value={formatCorrelation(summary.turnOrderWinCorrelation)}
          accent={COLORS.success}
        />
      </View>

      <View style={styles.signalSection}>
        <Text style={styles.compactSectionTitle}>Top 3 Winning Signals</Text>
        <View style={styles.signalList}>
          {topSignals.map((signal: any, index: number) => {
            const accent = signal.value >= 0 ? COLORS.success : COLORS.danger;
            return (
              <View
                key={signal.key}
                style={[styles.signalCard, { borderColor: `${accent}55` }]}
              >
                <View style={styles.signalRank}>
                  <Text style={styles.signalRankText}>#{index + 1}</Text>
                </View>
                <View style={styles.signalBody}>
                  <Text style={styles.signalLabel}>{signal.label}</Text>
                  <Text style={[styles.signalValue, { color: accent }]}>
                    {formatCorrelationValue(signal.value)} ·{" "}
                    {getCorrelationStrength(signal.value)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );

  const renderPlayersTab = () => {
    if (!leaderboard.length) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No stats yet</Text>
          <Text style={styles.emptyText}>
            Finish a few games to populate the stats view.
          </Text>
        </View>
      );
    }

    if (!selectedPlayer) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No player selected</Text>
          <Text style={styles.emptyText}>
            Choose a player to view their stats breakdown.
          </Text>
        </View>
      );
    }

    const accent = getPlayerColor(selectedPlayer.color);
    const selectedIndex = leaderboard.findIndex(
      (p: any) => p.id === selectedPlayer.id
    );

    return (
      <View style={styles.playersList}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectorWrap}
        >
          {leaderboard.map((player: any) => {
            const active = player.id === resolvedPlayerId;
            return (
              <Pressable
                key={player.id}
                onPress={() => setSelectedPlayerId(player.id)}
                style={styles.selectorTab}
              >
                <Text
                  style={[
                    styles.selectorTabText,
                    active && styles.selectorTabTextActive,
                  ]}
                >
                  {player.name}
                </Text>
                <View
                  style={[
                    styles.selectorTabUnderline,
                    active && styles.selectorTabUnderlineActive,
                  ]}
                />
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.playerCard, { borderColor: `${accent}33` }]}>
          <View style={[styles.playerAccent, { backgroundColor: accent }]} />
          <View
            style={[
              styles.playerGlow,
              { backgroundColor: getGlowColor(selectedPlayer.color) },
            ]}
          />

          <View style={styles.playerHeader}>
            <View style={styles.playerHeaderLeft}>
              <View
                style={[
                  styles.playerCardBadgeWrap,
                  { shadowColor: getPlayerColor(selectedPlayer.color) },
                ]}
              >
                <PlayerCardIcon
                  player={selectedPlayer as any}
                  size={42}
                  borderRadius={10}
                  showInitial={false}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rankText, { color: accent }]}>
                  #{selectedIndex + 1}
                </Text>
                <Text style={styles.playerName}>{selectedPlayer.name}</Text>
                <Text style={styles.playerMeta}>
                  {formatPercent(selectedPlayer.winRate)} win ·{" "}
                  {selectedPlayer.games} games ·{" "}
                  {selectedPlayer.avgPrestigePerGame.toFixed(1)} prestige/game
                </Text>
              </View>
            </View>

            <View style={styles.playerPrimaryValueWrap}>
              <Text style={styles.playerPrimaryValue}>
                {selectedPlayer.totalPrestige}
              </Text>
              <Text style={styles.playerPrimaryLabel}>prestige</Text>
            </View>
          </View>

          <PlayerSection title="Core">
            <StatPill
              label="Wins"
              value={selectedPlayer.wins}
              accent={COLORS.success}
              strong
              metricKey="wins"
              onInfoPress={() => goToDefinition("wins")}
            />
            <StatPill
              label="Direct"
              value={selectedPlayer.directPrestige}
              accent={COLORS.blueGlow}
              strong
              metricKey="directPrestige"
              onInfoPress={() => goToDefinition("directPrestige")}
            />
            <StatPill
              label="Assist In"
              value={selectedPlayer.assistPrestigeReceived.toFixed(1)}
              accent={COLORS.teal}
              strong
              metricKey="assistPrestigeReceived"
              onInfoPress={() => goToDefinition("assistPrestigeReceived")}
            />
            <StatPill
              label="Assist Out"
              value={selectedPlayer.assistPrestigeSent.toFixed(1)}
              accent={COLORS.purple}
              strong
              metricKey="assistPrestigeSent"
              onInfoPress={() => goToDefinition("assistPrestigeSent")}
            />
            <StatPill
              label="All Eff"
              value={selectedPlayer.allContractsEfficiency.toFixed(2)}
              accent={COLORS.success}
              metricKey="allContractsEfficiency"
              onInfoPress={() => goToDefinition("allContractsEfficiency")}
            />
            <StatPill
              label="Assist Eff"
              value={selectedPlayer.assistanceEfficiency.toFixed(2)}
              accent={COLORS.purple}
              metricKey="assistanceEfficiency"
              onInfoPress={() => goToDefinition("assistanceEfficiency")}
            />
            <StatPill
              label="Direct Eff"
              value={selectedPlayer.directEfficiency.toFixed(2)}
              accent={COLORS.blueGlow}
              metricKey="directEfficiency"
              onInfoPress={() => goToDefinition("directEfficiency")}
            />
            <StatPill
              label="Fail %"
              value={formatPercent(selectedPlayer.failureRate)}
              accent={COLORS.danger}
              metricKey="failureRate"
              onInfoPress={() => goToDefinition("failureRate")}
            />
          </PlayerSection>

          <PlayerSection title="Performance">
            <StatPill
              label="Consistency"
              value={selectedPlayer.consistencyScore.toFixed(2)}
              accent={COLORS.success}
              metricKey="consistencyScore"
              onInfoPress={() => goToDefinition("consistencyScore")}
            />
            <StatPill
              label="Clutch"
              value={formatPercent(selectedPlayer.clutchScore)}
              accent={COLORS.blue}
              metricKey="clutchScore"
              onInfoPress={() => goToDefinition("clutchScore")}
            />
            <StatPill
              label="Carry"
              value={formatPercent(selectedPlayer.carryFactor)}
              accent={COLORS.blueGlow}
              metricKey="carryFactor"
              onInfoPress={() => goToDefinition("carryFactor")}
            />
            <StatPill
              label="Momentum"
              value={formatSigned(selectedPlayer.momentum)}
              accent={COLORS.purple}
              metricKey="momentum"
              onInfoPress={() => goToDefinition("momentum")}
            />
            <StatPill
              label="Prestige / Turn"
              value={selectedPlayer.prestigePerTurn.toFixed(2)}
              accent={COLORS.teal}
              metricKey="prestigePerTurn"
              onInfoPress={() => goToDefinition("prestigePerTurn")}
            />
            <StatPill
              label="Early Lead %"
              value={formatPercent(selectedPlayer.earlyLeadRate)}
              accent={COLORS.blue}
            />
            <StatPill
              label="Late Lead %"
              value={formatPercent(selectedPlayer.lateLeadRate)}
              accent={COLORS.gold}
            />
            <StatPill
              label="Lead Conv"
              value={formatPercent(selectedPlayer.leadConversion)}
              accent={COLORS.success}
              metricKey="leadConversion"
              onInfoPress={() => goToDefinition("leadConversion")}
            />
            <StatPill
              label="Late Lead Conv"
              value={formatPercent(selectedPlayer.lateLeadConversion)}
              accent="#10B981"
              metricKey="lateLeadConversion"
              onInfoPress={() => goToDefinition("lateLeadConversion")}
            />
            <StatPill
              label="Objective Conv"
              value={formatPercent(selectedPlayer.objectiveConversionRate)}
              accent={COLORS.cyan}
            />
            <StatPill
              label="Support Conv"
              value={formatPercent(selectedPlayer.supportConversionRate)}
              accent={COLORS.purple}
            />
            <StatPill
              label="Avg Margin"
              value={formatSigned(selectedPlayer.avgPrestigeMarginPerGame)}
              accent={COLORS.blueGlow}
            />
            <StatPill
              label="Best Margin"
              value={formatSigned(selectedPlayer.bestPrestigeMargin)}
              accent={COLORS.blueGlow}
            />
            <StatPill
              label="Objectives / Game"
              value={selectedPlayer.objectivesPerGame.toFixed(2)}
              accent={COLORS.gold}
            />
            <StatPill
              label="Assists / Game"
              value={selectedPlayer.assistsGivenPerGame.toFixed(2)}
              accent={COLORS.teal}
            />
            <StatPill
              label="Assist In / Game"
              value={selectedPlayer.assistsReceivedPerGame.toFixed(2)}
              accent={COLORS.blueGlow}
            />
          </PlayerSection>

          <PlayerSection title="Context">
            <StatPill
              label="Opponent Str"
              value={selectedPlayer.opponentStrength.toFixed(2)}
              accent={COLORS.textSecondary}
            />
            <StatPill
              label="Tempo"
              value={selectedPlayer.tempoIndex.toFixed(2)}
              accent={COLORS.pink}
              metricKey="tempoIndex"
              onInfoPress={() => goToDefinition("tempoIndex")}
            />
            <StatPill
              label="Interaction"
              value={selectedPlayer.interactionIndex.toFixed(2)}
              accent={COLORS.cyan}
            />
            <StatPill
              label="Aggro"
              value={selectedPlayer.aggroIndex.toFixed(2)}
              accent={COLORS.danger}
            />
            <StatPill
              label="Seat ? Win Corr"
              value={formatCorrelation(selectedPlayer.turnOrderWinCorrelation)}
              accent={COLORS.success}
            />
            <StatPill
              label="Assist Count In"
              value={selectedPlayer.assistCountBySource}
            />
          </PlayerSection>
        </View>
      </View>
    );
  };

  const renderPlaystyleTab = () => (
    <PlaystyleSection
      players={players}
      games={games}
      leaderboard={leaderboard}
      selectedPlayerId={resolvedPlayerId}
      onSelectPlayer={setSelectedPlayerId}
    />
  );

  const renderCorrelationTab = () => (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Correlations</Text>
      <Text style={styles.title}>Win Signals</Text>

      <View style={styles.subtabWrap}>
        <TabButton
          label="Global"
          active={activeCorrelationTab === "global"}
          onPress={() => setActiveCorrelationTab("global")}
        />
        <TabButton
          label="Individual"
          active={activeCorrelationTab === "individual"}
          onPress={() => setActiveCorrelationTab("individual")}
        />
        <TabButton
          label="Game"
          active={activeCorrelationTab === "game"}
          onPress={() => setActiveCorrelationTab("game")}
        />
      </View>

      {activeCorrelationTab === "global" && (
        <View style={styles.list}>
          <Text style={styles.subtitle}>
            Across all players, these are the strongest league-wide win signals.
          </Text>

          {GLOBAL_CORRELATION_TIERS.map((tier) => {
            const rows = getRowsForTier(globalCorrelations, tier.keys);
            if (!rows.length) return null;

            return (
              <View key={tier.title} style={styles.tierSection}>
                <Text style={styles.compactSectionTitle}>{tier.title}</Text>
                <View style={styles.list}>
                  {rows.map((row: any) => (
                    <CorrelationRowCard key={row.key} row={row} />
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {activeCorrelationTab === "individual" && (
        <View style={styles.list}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectorWrap}
          >
            {leaderboard.map((player: any) => {
              const active = player.id === resolvedCorrelationPlayerId;
              return (
                <Pressable
                  key={player.id}
                  onPress={() => setSelectedCorrelationPlayerId(player.id)}
                  style={styles.selectorTab}
                >
                  <Text
                    style={[
                      styles.selectorTabText,
                      active && styles.selectorTabTextActive,
                    ]}
                  >
                    {player.name}
                  </Text>
                  <View
                    style={[
                      styles.selectorTabUnderline,
                      active && styles.selectorTabUnderlineActive,
                    ]}
                  />
                </Pressable>
              );
            })}
          </ScrollView>

          {selectedCorrelationPlayer ? (
            <Text style={styles.subtitle}>
              What tends to drive wins specifically for{" "}
              {selectedCorrelationPlayer.name}.
            </Text>
          ) : null}

          {INDIVIDUAL_CORRELATION_TIERS.map((tier) => {
            const rows = getRowsForTier(individualCorrelations, tier.keys);
            if (!rows.length) return null;

            return (
              <View key={tier.title} style={styles.tierSection}>
                <Text style={styles.compactSectionTitle}>{tier.title}</Text>
                <View style={styles.list}>
                  {rows.map((row: any) => (
                    <CorrelationRowCard key={row.key} row={row} />
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {activeCorrelationTab === "game" && (
        <View style={styles.list}>
          <Text style={styles.subtitle}>
            Match-condition signals showing what kinds of games favor a certain
            type of winner.
          </Text>

          {GAME_CORRELATION_TIERS.map((tier) => {
            const rows = getRowsForTier(gameCorrelations, tier.keys);
            if (!rows.length) return null;

            return (
              <View key={tier.title} style={styles.tierSection}>
                <Text style={styles.compactSectionTitle}>{tier.title}</Text>
                <View style={styles.list}>
                  {rows.map((row: any) => (
                    <CorrelationRowCard key={row.key} row={row} />
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderGamesTab = () => (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Games</Text>
      <Text style={styles.subtitle}>
        Select a game to inspect its outcome, environment, and margin.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.selectorWrap}
      >
        {selectableGames.map((game) => {
          const active = game.id === resolvedGameId;
          return (
            <Pressable
              key={game.id}
              onPress={() => setSelectedGameId(game.id)}
              style={styles.selectorTab}
            >
              <Text
                style={[
                  styles.selectorTabText,
                  active && styles.selectorTabTextActive,
                ]}
              >
                {game.label}
              </Text>
              <View
                style={[
                  styles.selectorTabUnderline,
                  active && styles.selectorTabUnderlineActive,
                ]}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      {selectedGame ? (
        <View style={styles.gamePanel}>
          <Text style={styles.compactSectionTitle}>{selectedGame.label}</Text>

          <View style={styles.compactGrid}>
            <StatPill
              label="Margin"
              value={selectedGame.margin.toFixed(1)}
              accent={COLORS.blueGlow}
              strong
            />
            <StatPill
              label="Assists"
              value={selectedGame.assists}
              accent={COLORS.teal}
              strong
            />
            <StatPill
              label="Objectives"
              value={selectedGame.objectives}
              accent={COLORS.gold}
              strong
            />
            <StatPill
              label="Failures"
              value={selectedGame.failures}
              accent={COLORS.danger}
              strong
            />
          </View>

          <View style={styles.list}>
            {selectedGame.rows.map((row: any, index: number) => {
              const isWinner = row.playerId === selectedGame.winnerId;
              const player = leaderboard.find((p: any) => p.id === row.playerId) as any;

              return (
                <View key={row.playerId} style={styles.gameRowCard}>
                  <View style={styles.gameRowIdentity}>
                    <View
                      style={[
                        styles.gamePlayerCardWrap,
                        { shadowColor: getPlayerColor(player?.color) },
                      ]}
                    >
                      <PlayerCardIcon
                        player={(player ?? {
                          id: row.playerId,
                          name: player?.name ?? row.playerId,
                          color: player?.color,
                          assignedCardArtIndex: player?.assignedCardArtIndex,
                          initials:
                            player?.initials ??
                            (player?.name?.slice(0, 2)?.toUpperCase() ?? "?"),
                        }) as any}
                        size={26}
                        borderRadius={6}
                        showInitial={true}
                      />
                    </View>
                    <View style={styles.gameRowIdentityText}>
                      <Text style={styles.gameRowTitle}>
                        {index + 1}. {player?.name ?? row.playerId}
                      </Text>
                      <Text style={styles.gameRowMeta}>
                        {isWinner ? "Winner" : "Participant"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.gameRowStats}>
                    <Text style={styles.gameRowStat}>
                      P {row.prestige.toFixed(1)}
                    </Text>
                    <Text style={styles.gameRowStat}>A {row.assists}</Text>
                    <Text style={styles.gameRowStat}>O {row.objectives}</Text>
                    <Text style={styles.gameRowStat}>F {row.failures}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No games yet</Text>
          <Text style={styles.emptyText}>Finish a game to inspect it here.</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.backgroundLayer}>
        <StarryNight />
        <View style={styles.backgroundNebulaPurple} />
        <View style={styles.backgroundNebulaBlue} />
        <View style={styles.backgroundDim} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTitleWrap}>
            <Text style={styles.heroEyebrow}>Statistics</Text>
            <Text style={styles.heroTitle}>Mission Snapshot</Text>
            <Text style={styles.heroSubtitle}>
              {leaderboard[0]?.name
                ? `${leaderboard[0].name} currently sets the pace while ${summary.totalPrestige} prestige has been logged across the league.`
                : "Save a few games and this screen will open with a KPI-first league snapshot."}
            </Text>
          </View>

          <View style={styles.statsHeroHighlights}>
            {statsHeroHighlights.map((item) => (
              <View key={item.label} style={styles.heroHighlightPill}>
                <Text style={styles.heroHighlightLabel}>{item.label}</Text>
                <Text style={styles.heroHighlightValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.primaryTabRail}>
          <PrimaryTabPill
            label="Home"
            active={activeTab === "overview"}
            onPress={() => setActiveTab("overview")}
          />
          <PrimaryTabPill
            label="Players"
            active={activeTab === "players"}
            onPress={() => setActiveTab("players")}
          />
          <PrimaryTabPill
            label="Playstyle"
            active={activeTab === "playstyle"}
            onPress={() => setActiveTab("playstyle")}
          />
          <PrimaryTabPill
            label="Insights"
            active={activeTab === "correlations"}
            onPress={() => setActiveTab("correlations")}
          />
          <PrimaryTabPill
            label="Games"
            active={activeTab === "games"}
            onPress={() => setActiveTab("games")}
          />
        </View>

        {activeTab === "overview" && renderOverviewTab()}
        {activeTab === "players" && renderPlayersTab()}
        {activeTab === "playstyle" && renderPlaystyleTab()}
        {activeTab === "correlations" && renderCorrelationTab()}
        {activeTab === "games" && renderGamesTab()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundNebulaPurple: {
    position: "absolute",
    top: -80,
    left: -30,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(168,85,247,0.14)",
  },
  backgroundNebulaBlue: {
    position: "absolute",
    bottom: -120,
    right: -20,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.10)",
  },
  backgroundDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.20)",
  },
  content: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 8,
  },
  heroCard: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    gap: 6,
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  brandTitle: {
    color: COLORS.brand,
    fontSize: 24,
    fontWeight: "900",
  },
  heroTitleWrap: {
    gap: 6,
  },
  heroEyebrow: {
    color: COLORS.cyan,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "900",
  },
  heroSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  statsHeroHighlights: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
  },
  heroHighlightPill: {
    minWidth: 92,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    gap: 4,
  },
  heroHighlightLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  heroHighlightValue: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "900",
  },
  primaryTabRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  subtabWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 14,
    rowGap: 8,
    alignItems: "flex-end",
  },
  primaryTabPill: {
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryTabPillActive: {
    backgroundColor: "rgba(96,165,250,0.16)",
    borderColor: "rgba(96,165,250,0.30)",
  },
  primaryTabPillText: {
    color: "#AFC3E8",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  primaryTabPillTextActive: {
    color: COLORS.textPrimary,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 4,
    gap: 6,
  },
  tabButtonText: {
    color: "#AFC3E8",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.15,
  },
  tabButtonTextActive: {
    color: COLORS.textPrimary,
  },
  tabButtonUnderline: {
    width: "100%",
    minWidth: 40,
    height: 2,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  tabButtonUnderlineActive: {
    backgroundColor: COLORS.cyan,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.18)",
    gap: 8,
  },
  eyebrow: {
    color: COLORS.cyan,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 17,
  },
  compactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 6,
  },
  list: {
    gap: 8,
  },
  signalSection: {
    gap: 6,
    marginTop: 2,
  },
  compactSectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "900",
  },
  signalList: {
    gap: 6,
  },
  signalCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    backgroundColor: COLORS.surfaceAlt,
  },
  signalRank: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  signalRankText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: "900",
  },
  signalBody: {
    flex: 1,
    gap: 2,
  },
  signalLabel: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: "900",
  },
  signalValue: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statPill: {
    width: "48.5%",
    minWidth: 0,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
    backgroundColor: "rgba(22,35,56,0.96)",
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  statPillStrong: {
    backgroundColor: "rgba(20,34,54,1)",
  },
  statPillHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 2,
  },
  statPillLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
    fontWeight: "700",
  },
  statPillValue: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  statPillValueStrong: {
    fontSize: 12,
    fontWeight: "900",
  },
  infoButtonText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "900",
  },
  compareButtonTop: {
    marginTop: 2,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(168,85,247,0.16)",
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.45)",
  },
  compareButtonText: {
    color: "#E9D5FF",
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 0.4,
  },
  emptyCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
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
  playerSection: {
    gap: 6,
    marginTop: 2,
  },
  playerSectionTitle: {
    color: COLORS.cyan,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  playersList: {
    gap: 8,
  },
  playerCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
    padding: 10,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    gap: 8,
  },
  playerAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  playerGlow: {
    position: "absolute",
    top: -24,
    right: -24,
    width: 90,
    height: 90,
    borderRadius: 999,
  },
  playerCardBadgeWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  playerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  playerHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  rankText: {
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 2,
  },
  playerName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "900",
  },
  playerMeta: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  playerPrimaryValueWrap: {
    alignItems: "flex-end",
  },
  playerPrimaryValue: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24,
  },
  playerPrimaryLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  selectorWrap: {
    gap: 14,
    paddingRight: 12,
    alignItems: "center",
  },
  selectorTab: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 6,
  },
  selectorTabText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  selectorTabTextActive: {
    color: COLORS.textPrimary,
    fontWeight: "900",
  },
  selectorTabUnderline: {
    width: "100%",
    minWidth: 44,
    height: 2,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  selectorTabUnderlineActive: {
    backgroundColor: COLORS.cyan,
  },
  tierSection: {
    gap: 6,
    marginTop: 2,
  },
  gamePanel: {
    gap: 8,
    marginTop: 2,
  },
  gameRowCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surfaceAlt,
  },
  gamePlayerCardWrap: {
    borderRadius: 8,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  gameRowIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  gameRowIdentityText: {
    flex: 1,
  },
  gameRowTitle: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "900",
  },
  gameRowMeta: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  gameRowStats: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  gameRowStat: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
  correlationCard: {
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surfaceAlt,
    gap: 6,
  },
  correlationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
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
  },
  correlationLabel: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "900",
    flex: 1,
  },
  correlationMeaning: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 17,
  },
});
