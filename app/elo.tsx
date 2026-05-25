import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store/useStore";
import ScreenBackground from "@/components/ui/ScreenBackground";
import { calculateElo } from "@/utils/elo";
import { APP_ROUTES } from "@/utils/appRoutes";
import { resolvePreferredChartPlayerId } from "@/utils/charts";

const COLORS = {
  bg: "#081120",
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
  border: "rgba(255,255,255,0.08)",
  whiteSoft: "rgba(255,255,255,0.06)",
  danger: "#F87171",
  dangerSoft: "rgba(248,113,113,0.14)",
};

type StorePlayer = {
  id: string;
  name?: string;
  color?: string;
};

type EloMetricTab =
  | "Leaderboard"
  | "Momentum"
  | "Skills"
  | "Context"
  | "Projection";

type SimpleEloRow = {
  gameId: string;
  createdAt: number;
  playerId: string;
  opponentIds: string[];
  win: number;
};

type PlayerSummary = {
  playerId: string;
  name: string;
  currentElo: number;
  peakElo: number;
  confidence: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  avgDelta: number;
  bestDelta: number;
  worstDelta: number;
  recentForm: string;
};

type StatCard = {
  key: string;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "accent" | "blue" | "green" | "danger";
};

const TABS: EloMetricTab[] = [
  "Leaderboard",
  "Momentum",
  "Skills",
  "Context",
  "Projection",
];

const DEFAULT_ELO = 1000;

function toneStyles(
  tone?: "default" | "accent" | "blue" | "green" | "danger"
) {
  switch (tone) {
    case "accent":
      return { bg: COLORS.accentSoft, value: COLORS.accent };
    case "blue":
      return { bg: COLORS.blueSoft, value: COLORS.blue };
    case "green":
      return { bg: COLORS.greenSoft, value: COLORS.green };
    case "danger":
      return { bg: COLORS.dangerSoft, value: COLORS.danger };
    default:
      return { bg: COLORS.whiteSoft, value: COLORS.text };
  }
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeId(value: unknown): string {
  return String(value ?? "").trim();
}

function formatMetricValue(value: string | number | undefined): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${Math.round(value)}`;
  }
  return "0";
}

function formatPercentFromDecimal(value: number): string {
  return `${Math.round((Number.isFinite(value) ? value : 0) * 100)}%`;
}

function formatSignedNumber(value: number): string {
  const rounded = Math.round(Number.isFinite(value) ? value : 0);
  if (rounded > 0) return `+${rounded}`;
  return `${rounded}`;
}

function getGameWinnerId(game: any): string | null {
  const explicit = normalizeId(
    game?.winnerId ?? game?.selectedWinnerId ?? game?.manualWinnerId
  );
  if (explicit) return explicit;

  const totals = game?.totals ?? {};
  const players = Array.isArray(game?.players) ? game.players : [];

  const ranked = players
    .map((p: any) => {
      const id = normalizeId(p?.id ?? p?.playerId);
      const totalPrestige = toNumber(
        totals?.[id]?.totalPrestige ?? totals?.[id]?.prestige
      );
      const score = toNumber(totals?.[id]?.score);
      return { id, totalPrestige, score };
    })
    .filter((row: any) => row.id)
    .sort((a: any, b: any) => {
      if (b.totalPrestige !== a.totalPrestige) {
        return b.totalPrestige - a.totalPrestige;
      }
      if (b.score !== a.score) return b.score - a.score;
      return a.id.localeCompare(b.id);
    });

  return ranked[0]?.id ?? null;
}

function getChronologicalGames(games: any[]): any[] {
  return [...(Array.isArray(games) ? games : [])].sort((a, b) => {
    const createdDiff = toNumber(a?.createdAt) - toNumber(b?.createdAt);
    if (createdDiff !== 0) return createdDiff;
    return normalizeId(a?.id).localeCompare(normalizeId(b?.id));
  });
}

function buildGameRowsByPlayer(
  games: any[],
  players: StorePlayer[]
): Record<string, SimpleEloRow[]> {
  const rowsByPlayer: Record<string, SimpleEloRow[]> = {};
  const validPlayerIds = new Set(
    players.map((player) => normalizeId(player.id)).filter(Boolean)
  );

  for (const player of players) {
    const id = normalizeId(player.id);
    rowsByPlayer[id] = [];
  }

  for (const game of getChronologicalGames(games)) {
    const participantIds: string[] = Array.from(
      new Set(
        (Array.isArray(game?.players) ? game.players : [])
          .map((player: any) => normalizeId(player?.id ?? player?.playerId))
          .filter((id: string) => Boolean(id) && validPlayerIds.has(id))
      )
    );

    if (participantIds.length < 2) continue;

    const winnerId = getGameWinnerId(game);
    if (!winnerId || !participantIds.includes(winnerId)) continue;

    const gameId =
      normalizeId(game?.id ?? game?.gameId) ||
      `${toNumber(game?.createdAt)}-${winnerId}`;

    for (const playerId of participantIds) {
      if (!rowsByPlayer[playerId]) rowsByPlayer[playerId] = [];
      rowsByPlayer[playerId].push({
        gameId,
        createdAt: toNumber(game?.createdAt),
        playerId,
        opponentIds: participantIds.filter((id) => id !== playerId),
        win: playerId === winnerId ? 1 : 0,
      });
    }
  }

  return rowsByPlayer;
}

function computeConfidence(rows: SimpleEloRow[]): number {
  if (!rows.length) return 0;
  return Math.min(1, rows.length / 12);
}

function buildContextRows(
  rows: SimpleEloRow[],
  selectedOpponentId: string | null
): SimpleEloRow[] {
  if (!selectedOpponentId) return rows;
  return rows.filter((row) => row.opponentIds.includes(selectedOpponentId));
}

function buildSummary(
  playerId: string,
  players: StorePlayer[],
  rowsByPlayer: Record<string, SimpleEloRow[]>,
  eloMap: Record<string, number>
): PlayerSummary {
  const rows = rowsByPlayer[playerId] ?? [];
  const name =
    players.find((player) => normalizeId(player.id) === playerId)?.name ||
    "Unknown";
  const currentEloRaw = eloMap[playerId];
  const currentElo =
    typeof currentEloRaw === "number" && Number.isFinite(currentEloRaw)
      ? currentEloRaw
      : DEFAULT_ELO;

  const wins = rows.filter((row) => row.win === 1).length;
  const losses = rows.length - wins;

  return {
    playerId,
    name,
    currentElo,
    peakElo: currentElo,
    confidence: computeConfidence(rows),
    gamesPlayed: rows.length,
    wins,
    losses,
    avgDelta: 0,
    bestDelta: 0,
    worstDelta: 0,
    recentForm: rows
      .slice(-5)
      .map((row) => (row.win ? "W" : "L"))
      .join(""),
  };
}

function buildTopCards(
  summary: PlayerSummary,
  rows: SimpleEloRow[],
  contextRows: SimpleEloRow[]
): StatCard[] {
  const winRate = rows.length ? summary.wins / rows.length : 0;
  const contextWinRate = contextRows.length
    ? contextRows.filter((row) => row.win === 1).length / contextRows.length
    : 0;

  return [
    {
      key: "current-elo",
      label: "Current ELO",
      value: `${Math.round(summary.currentElo)}`,
      sub: `${summary.gamesPlayed} rated game${
        summary.gamesPlayed === 1 ? "" : "s"
      }`,
      tone: "accent",
    },
    {
      key: "peak-elo",
      label: "Peak ELO",
      value: `${Math.round(summary.peakElo)}`,
      sub: "Matched to leaderboard source",
      tone: "blue",
    },
    {
      key: "win-rate",
      label: "Win Rate",
      value: formatPercentFromDecimal(winRate),
      sub: contextRows.length
        ? `H2H ${formatPercentFromDecimal(contextWinRate)}`
        : "All rated games",
      tone: "green",
    },
  ];
}

function buildSectionCards(
  activeTab: EloMetricTab,
  summary: PlayerSummary,
  rows: SimpleEloRow[],
  contextRows: SimpleEloRow[],
  opponentName: string | null
): { title: string; cards: StatCard[] } {
  const winRate = rows.length ? summary.wins / rows.length : 0;
  const contextWins = contextRows.filter((row) => row.win === 1).length;
  const contextWinRate = contextRows.length
    ? contextWins / contextRows.length
    : 0;

  switch (activeTab) {
    case "Momentum":
      return {
        title: "Momentum Snapshot",
        cards: [
          {
            key: "recent-form",
            label: "Recent Form",
            value: summary.recentForm || "—",
            tone: "accent",
          },
          {
            key: "games",
            label: "Rated Games",
            value: `${summary.gamesPlayed}`,
            tone: "default",
          },
          {
            key: "wins",
            label: "Wins",
            value: `${summary.wins}`,
            tone: "green",
          },
          {
            key: "losses",
            label: "Losses",
            value: `${summary.losses}`,
            tone: "danger",
          },
          {
            key: "winrate",
            label: "Win Rate",
            value: formatPercentFromDecimal(winRate),
            tone: winRate >= 0.5 ? "green" : "danger",
          },
          {
            key: "confidence",
            label: "Confidence",
            value: formatPercentFromDecimal(summary.confidence),
            tone: "blue",
          },
        ],
      };

    case "Skills":
      return {
        title: "Rating Profile",
        cards: [
          {
            key: "current",
            label: "Current ELO",
            value: `${Math.round(summary.currentElo)}`,
            tone: "accent",
          },
          {
            key: "peak",
            label: "Peak ELO",
            value: `${Math.round(summary.peakElo)}`,
            tone: "blue",
          },
          {
            key: "games",
            label: "Rated Games",
            value: `${summary.gamesPlayed}`,
            tone: "default",
          },
          {
            key: "record",
            label: "Record",
            value: `${summary.wins}-${summary.losses}`,
            tone: summary.wins >= summary.losses ? "green" : "danger",
          },
          {
            key: "confidence",
            label: "Confidence",
            value: formatPercentFromDecimal(summary.confidence),
            tone: "blue",
          },
          {
            key: "winrate",
            label: "Win Rate",
            value: formatPercentFromDecimal(winRate),
            tone: winRate >= 0.5 ? "green" : "danger",
          },
        ],
      };

    case "Context":
      return {
        title: "Context Split",
        cards: [
          {
            key: "sample",
            label: opponentName ? `Games vs ${opponentName}` : "Filtered Games",
            value: `${contextRows.length}`,
            tone: "accent",
          },
          {
            key: "context-winrate",
            label: "Head-to-Head Win Rate",
            value: formatPercentFromDecimal(contextWinRate),
            tone: contextWinRate >= 0.5 ? "green" : "danger",
          },
          {
            key: "context-wins",
            label: "Filter Wins",
            value: `${contextWins}`,
            tone: "green",
          },
          {
            key: "context-losses",
            label: "Filter Losses",
            value: `${Math.max(0, contextRows.length - contextWins)}`,
            tone: "danger",
          },
          {
            key: "context-current",
            label: "Current ELO",
            value: `${Math.round(summary.currentElo)}`,
            tone: "blue",
          },
          {
            key: "context-confidence",
            label: "Confidence",
            value: formatPercentFromDecimal(summary.confidence),
            tone: "default",
          },
        ],
      };

    case "Projection":
      return {
        title: "Projection Window",
        cards: [
          {
            key: "current-proj",
            label: "Current ELO",
            value: `${Math.round(summary.currentElo)}`,
            tone: "accent",
          },
          {
            key: "next-win",
            label: "Next Win Range",
            value: `${Math.round(summary.currentElo)}`,
            tone: "green",
          },
          {
            key: "next-loss",
            label: "Next Loss Range",
            value: `${Math.round(summary.currentElo)}`,
            tone: "danger",
          },
          {
            key: "record-proj",
            label: "Record",
            value: `${summary.wins}-${summary.losses}`,
            tone: "default",
          },
          {
            key: "confidence-proj",
            label: "Confidence",
            value: formatPercentFromDecimal(summary.confidence),
            tone: "blue",
          },
          {
            key: "games-proj",
            label: "Rated Games",
            value: `${summary.gamesPlayed}`,
            tone: "default",
          },
        ],
      };

    case "Leaderboard":
    default:
      return {
        title: "Leaderboard Metrics",
        cards: [
          {
            key: "leader-current",
            label: "Current ELO",
            value: `${Math.round(summary.currentElo)}`,
            tone: "accent",
          },
          {
            key: "leader-peak",
            label: "Peak ELO",
            value: `${Math.round(summary.peakElo)}`,
            tone: "blue",
          },
          {
            key: "leader-games",
            label: "Rated Games",
            value: `${summary.gamesPlayed}`,
            tone: "default",
          },
          {
            key: "leader-record",
            label: "Record",
            value: `${summary.wins}-${summary.losses}`,
            tone: summary.wins >= summary.losses ? "green" : "danger",
          },
          {
            key: "leader-winrate",
            label: "Win Rate",
            value: formatPercentFromDecimal(winRate),
            tone: winRate >= 0.5 ? "green" : "danger",
          },
          {
            key: "leader-confidence",
            label: "Confidence",
            value: formatPercentFromDecimal(summary.confidence),
            tone: "blue",
          },
        ],
      };
  }
}

function buildInsight(
  activeTab: EloMetricTab,
  summary: PlayerSummary,
  contextRows: SimpleEloRow[],
  opponentName: string | null
): { title: string; body: string } {
  switch (activeTab) {
    case "Momentum":
      return {
        title: "Momentum Insight",
        body:
          summary.gamesPlayed === 0
            ? "No rated games yet. Finish a saved game to start real leaderboard-backed ELO tracking."
            : `${summary.name} has played ${summary.gamesPlayed} rated game${
                summary.gamesPlayed === 1 ? "" : "s"
              } with recent form ${summary.recentForm || "—"}.`,
      };

    case "Skills":
      return {
        title: "Rating Insight",
        body:
          summary.gamesPlayed === 0
            ? "This screen now uses the same ELO source as the leaderboard."
            : `${summary.name} currently sits at ${Math.round(
                summary.currentElo
              )}. The headline ELO now matches leaderboard ordering exactly.`,
      };

    case "Context":
      return {
        title: "Context Insight",
        body:
          opponentName && contextRows.length
            ? `${summary.name} has ${
                contextRows.filter((row) => row.win === 1).length
              } win${
                contextRows.filter((row) => row.win === 1).length === 1
                  ? ""
                  : "s"
              } in ${contextRows.length} rated game${
                contextRows.length === 1 ? "" : "s"
              } against ${opponentName}.`
            : "Select an opponent to isolate head-to-head results from saved game history.",
      };

    case "Projection":
      return {
        title: "Projection Insight",
        body:
          summary.gamesPlayed === 0
            ? "Projection is limited until saved games exist."
            : `Current displayed ELO is now aligned to the leaderboard source. Projection cards are informational and no longer use the old separate ELO engine.`,
      };

    case "Leaderboard":
    default:
      return {
        title: "Leaderboard Insight",
        body:
          summary.gamesPlayed === 0
            ? "Leaderboard and ELO now share the same current-rating source."
            : `${summary.name} is ranked using the same current ELO value as the leaderboard view.`,
      };
  }
}

export default function EloScreen() {
  const router = useRouter();
  const authSession = useStore((s: any) => s.authSession);
  const authProfile = useStore((s: any) => s.authProfile);
  const games = useStore((s: any) => s.games || []);
  const players = useStore((s: any) => s.players || []);

  const sortedPlayers = useMemo<StorePlayer[]>(() => {
    return [...players].sort((a: StorePlayer, b: StorePlayer) =>
      String(a?.name || "").localeCompare(String(b?.name || ""))
    );
  }, [players]);

  const gameDrivenPlayerIds = useMemo(() => {
    return new Set(
      (Array.isArray(games) ? games : []).flatMap((game: any) =>
        Array.isArray(game?.players)
          ? game.players
              .map((player: any) => normalizeId(player?.id ?? player?.playerId))
              .filter(Boolean)
          : []
      )
    );
  }, [games]);

  const analyticsPlayers = useMemo<StorePlayer[]>(() => {
    const playersWithSavedGames = sortedPlayers.filter((player) =>
      gameDrivenPlayerIds.has(normalizeId(player.id))
    );

    return playersWithSavedGames.length ? playersWithSavedGames : sortedPlayers;
  }, [gameDrivenPlayerIds, sortedPlayers]);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedOpponentId, setSelectedOpponentId] = useState<string | null>(
    null
  );
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const deferredPlayerSearchQuery = useDeferredValue(playerSearchQuery);
  const [activeTab, setActiveTab] =
    useState<EloMetricTab>("Leaderboard");

  const preferredPlayerId = useMemo(
    () =>
      resolvePreferredChartPlayerId({
        availablePlayers: analyticsPlayers,
        authProfileId: authProfile?.id,
        authSessionUserId: authSession?.user?.id,
      }),
    [analyticsPlayers, authProfile?.id, authSession?.user?.id]
  );

  useEffect(() => {
    if (!analyticsPlayers.length) {
      return;
    }

    const activeId = normalizeId(selectedPlayerId);
    const hasActivePlayer = analyticsPlayers.some(
      (player) => normalizeId(player.id) === activeId
    );

    if (!activeId || !hasActivePlayer) {
      setSelectedPlayerId(preferredPlayerId ?? normalizeId(analyticsPlayers[0].id));
    }
  }, [analyticsPlayers, preferredPlayerId, selectedPlayerId]);

  const normalizedPlayerQuery = deferredPlayerSearchQuery.trim().toLowerCase();
  const filteredPlayerOptions = useMemo(() => {
    if (!normalizedPlayerQuery) {
      return analyticsPlayers;
    }

    return analyticsPlayers.filter((player) => {
      const searchTargets = [
        String(player?.name ?? ""),
        normalizeId(player?.id),
      ]
        .filter(Boolean)
        .map((value) => value.toLowerCase());

      return searchTargets.some((value) => value.includes(normalizedPlayerQuery));
    });
  }, [analyticsPlayers, normalizedPlayerQuery]);

  useEffect(() => {
    const activeOpponentId = normalizeId(selectedOpponentId);
    const isValidOpponent = analyticsPlayers.some(
      (player) =>
        normalizeId(player.id) === activeOpponentId &&
        normalizeId(player.id) !== normalizeId(selectedPlayerId)
    );

    if (selectedOpponentId === selectedPlayerId || (activeOpponentId && !isValidOpponent)) {
      setSelectedOpponentId(null);
    }
  }, [analyticsPlayers, selectedOpponentId, selectedPlayerId]);

  const eloMap = useMemo<Record<string, number>>(() => {
    try {
      const raw = calculateElo(games);
      if (!raw || typeof raw !== "object") return {};
      return raw as Record<string, number>;
    } catch {
      return {};
    }
  }, [games]);

  const rowsByPlayer = useMemo(
    () => buildGameRowsByPlayer(games, analyticsPlayers),
    [analyticsPlayers, games]
  );

  const selectedPlayer = useMemo(
    () =>
      analyticsPlayers.find(
        (p) => normalizeId(p.id) === normalizeId(selectedPlayerId)
      ) || null,
    [analyticsPlayers, selectedPlayerId]
  );

  const opponentOptions = useMemo(
    () =>
      analyticsPlayers.filter(
        (p) => normalizeId(p.id) !== normalizeId(selectedPlayerId)
      ),
    [analyticsPlayers, selectedPlayerId]
  );

  const selectedRows = useMemo(
    () => rowsByPlayer[normalizeId(selectedPlayerId)] ?? [],
    [rowsByPlayer, selectedPlayerId]
  );

  const selectedContextRows = useMemo(
    () => buildContextRows(selectedRows, selectedOpponentId),
    [selectedRows, selectedOpponentId]
  );

  const selectedSummary = useMemo(
    () =>
      buildSummary(
        normalizeId(selectedPlayerId),
        analyticsPlayers,
        rowsByPlayer,
        eloMap
      ),
    [selectedPlayerId, analyticsPlayers, rowsByPlayer, eloMap]
  );

  const selectedOpponentName = useMemo(() => {
    return (
      analyticsPlayers.find(
        (player) =>
          normalizeId(player.id) === normalizeId(selectedOpponentId)
      )?.name || null
    );
  }, [analyticsPlayers, selectedOpponentId]);

  const topCards = useMemo(
    () => buildTopCards(selectedSummary, selectedRows, selectedContextRows),
    [selectedSummary, selectedRows, selectedContextRows]
  );

  const activeSection = useMemo(
    () =>
      buildSectionCards(
        activeTab,
        selectedSummary,
        selectedRows,
        selectedContextRows,
        selectedOpponentName
      ),
    [
      activeTab,
      selectedSummary,
      selectedRows,
      selectedContextRows,
      selectedOpponentName,
    ]
  );

  const activeInsight = useMemo(
    () =>
      buildInsight(
        activeTab,
        selectedSummary,
        selectedContextRows,
        selectedOpponentName
      ),
    [activeTab, selectedSummary, selectedContextRows, selectedOpponentName]
  );

  const hasData = selectedRows.length > 0;

  const leaderboardRows = useMemo(() => {
    return analyticsPlayers
      .map((player) => {
        const playerId = normalizeId(player.id);
        const summary = buildSummary(playerId, analyticsPlayers, rowsByPlayer, eloMap);
        return {
          rank: 0,
          playerId,
          name: player.name || "Unknown",
          currentElo: summary.currentElo,
          peakElo: summary.peakElo,
          confidence: summary.confidence,
          isSelected: playerId === normalizeId(selectedPlayerId),
        };
      })
      .sort((a, b) => {
        if (b.currentElo !== a.currentElo) return b.currentElo - a.currentElo;
        if (b.peakElo !== a.peakElo) return b.peakElo - a.peakElo;
        return a.name.localeCompare(b.name);
      })
      .map((row, index) => ({
        ...row,
        rank: index + 1,
      }));
  }, [analyticsPlayers, rowsByPlayer, eloMap, selectedPlayerId]);

  const featuredCard = topCards[0];
  const secondaryCards = topCards.slice(1, 3);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundLayer}>
        <ScreenBackground preset="analytics" />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionCompact}>
          <View style={styles.heroHeader}>
            <View style={styles.heroTitleWrap}>
              <Text style={styles.sectionTitle}>Player</Text>
              <Text style={styles.heroSub}>Select focus player</Text>
            </View>
            <TouchableOpacity
              style={styles.commandButton}
              onPress={() => router.push(APP_ROUTES.home)}
              activeOpacity={0.9}
            >
              <Text style={styles.commandButtonText}>Back to Command</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            value={playerSearchQuery}
            onChangeText={setPlayerSearchQuery}
            placeholder="Search players"
            placeholderTextColor={COLORS.muted}
            style={styles.playerSearchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.underlineSelectorRow}>
            {filteredPlayerOptions.map((player) => {
              const active =
                normalizeId(player.id) === normalizeId(selectedPlayerId);
              return (
                <TouchableOpacity
                  key={player.id}
                  style={styles.underlineTabButton}
                  onPress={() => setSelectedPlayerId(normalizeId(player.id))}
                  activeOpacity={0.9}
                >
                  <Text
                    style={[
                      styles.underlineTabText,
                      active && styles.underlineTabTextActive,
                    ]}
                  >
                    {player.name || "Unknown"}
                  </Text>
                  <View
                    style={[
                      styles.underlineTabLine,
                      active && styles.underlineTabLineActive,
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {filteredPlayerOptions.length ? null : (
            <Text style={styles.emptyText}>
              No players match that search yet.
            </Text>
          )}
        </View>

        {activeTab === "Context" ? (
          <View style={styles.sectionCompact}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Opponent</Text>
              <Text style={styles.sectionSub}>
                Optional head-to-head filter
              </Text>
            </View>

            <View style={styles.underlineSelectorRow}>
              <TouchableOpacity
                style={styles.underlineTabButton}
                onPress={() => setSelectedOpponentId(null)}
                activeOpacity={0.9}
              >
                <Text
                  style={[
                    styles.underlineTabText,
                    !selectedOpponentId && styles.underlineTabTextActive,
                  ]}
                >
                  None
                </Text>
                <View
                  style={[
                    styles.underlineTabLine,
                    !selectedOpponentId && styles.underlineTabLineActive,
                  ]}
                />
              </TouchableOpacity>

              {opponentOptions.map((player) => {
                const active =
                  normalizeId(player.id) === normalizeId(selectedOpponentId);
                return (
                  <TouchableOpacity
                    key={player.id}
                    style={styles.underlineTabButton}
                    onPress={() => setSelectedOpponentId(normalizeId(player.id))}
                    activeOpacity={0.9}
                  >
                    <Text
                      style={[
                        styles.underlineTabText,
                        active && styles.underlineTabTextActive,
                      ]}
                    >
                      {player.name || "Unknown"}
                    </Text>
                    <View
                      style={[
                        styles.underlineTabLine,
                        active && styles.underlineTabLineActive,
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.tabGrid}>
          <View style={styles.tabGridRowTwo}>
            {(["Leaderboard", "Momentum"] as EloMetricTab[]).map((tab) => {
              const active = tab === activeTab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.underlineMainTab, styles.underlineMainTabTwoCol]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.9}
                >
                  <Text
                    style={[
                      styles.underlineMainTabText,
                      active && styles.underlineMainTabTextActive,
                    ]}
                  >
                    {tab}
                  </Text>
                  <View
                    style={[
                      styles.underlineMainTabLine,
                      active && styles.underlineMainTabLineActive,
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.tabGridRowThree}>
            {(["Skills", "Context", "Projection"] as EloMetricTab[]).map(
              (tab) => {
                const active = tab === activeTab;
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.underlineMainTab,
                      styles.underlineMainTabThreeCol,
                    ]}
                    onPress={() => setActiveTab(tab)}
                    activeOpacity={0.9}
                  >
                    <Text
                      style={[
                        styles.underlineMainTabText,
                        active && styles.underlineMainTabTextActive,
                      ]}
                    >
                      {tab}
                    </Text>
                    <View
                      style={[
                        styles.underlineMainTabLine,
                        active && styles.underlineMainTabLineActive,
                      ]}
                    />
                  </TouchableOpacity>
                );
              }
            )}
          </View>
        </View>

        <View style={styles.sectionCompact}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Top 3 Winning Signals</Text>
            <Text style={styles.sectionSub}>
              {selectedPlayer?.name || "No player selected"}
            </Text>
          </View>

          {!hasData ? (
            <Text style={styles.emptyText}>
              No rated ELO rows available for this player yet.
            </Text>
          ) : (
            <View style={styles.featuredSignalsWrap}>
              {featuredCard ? (
                <View
                  style={[
                    styles.featuredSignalCard,
                    { backgroundColor: toneStyles(featuredCard.tone).bg },
                  ]}
                >
                  <Text style={styles.featuredSignalLabel} numberOfLines={1}>
                    {featuredCard.label}
                  </Text>
                  <Text
                    style={[
                      styles.featuredSignalValue,
                      { color: toneStyles(featuredCard.tone).value },
                    ]}
                  >
                    {featuredCard.value}
                  </Text>
                  {featuredCard.sub ? (
                    <Text style={styles.featuredSignalSub} numberOfLines={2}>
                      {featuredCard.sub}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.secondarySignalColumn}>
                {secondaryCards.map((card) => {
                  const tone = toneStyles(card.tone);
                  return (
                    <View
                      key={card.key}
                      style={[
                        styles.secondarySignalCard,
                        { backgroundColor: tone.bg },
                      ]}
                    >
                      <Text style={styles.metricLabelCompact} numberOfLines={1}>
                        {card.label}
                      </Text>
                      <Text
                        style={[
                          styles.metricValueCompact,
                          { color: tone.value },
                        ]}
                      >
                        {card.value}
                      </Text>
                      {card.sub ? (
                        <Text style={styles.metricSubCompact} numberOfLines={1}>
                          {card.sub}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        <View style={styles.insightCardCompact}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{activeInsight.title}</Text>
            <Text style={styles.insightChip}>{activeTab.toUpperCase()}</Text>
          </View>
          <Text style={styles.insightText}>{activeInsight.body}</Text>
        </View>

        {activeTab === "Leaderboard" ? (
          <View style={styles.sectionCompact}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Leaderboard</Text>
              <Text style={styles.sectionSub}>
                All players ranked by current ELO
              </Text>
            </View>

            <View style={styles.leaderboardList}>
              {leaderboardRows.map((row) => (
                <TouchableOpacity
                  key={row.playerId}
                  style={[
                    styles.leaderboardRow,
                    row.isSelected && styles.leaderboardRowSelected,
                  ]}
                  onPress={() => setSelectedPlayerId(row.playerId)}
                  activeOpacity={0.9}
                >
                  <View style={styles.leaderboardLeft}>
                    <View
                      style={[
                        styles.rankBadge,
                        row.isSelected && styles.rankBadgeSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.rankText,
                          row.isSelected && styles.rankTextSelected,
                        ]}
                      >
                        {row.rank}
                      </Text>
                    </View>

                    <View>
                      <Text style={styles.leaderboardName}>{row.name}</Text>
                      <Text style={styles.leaderboardMeta}>
                        Peak {Math.round(row.peakElo)}   Conf{" "}
                        {formatPercentFromDecimal(row.confidence)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.leaderboardRight}>
                    <Text style={styles.leaderboardElo}>
                      {Math.round(row.currentElo)}
                    </Text>
                    <Text style={styles.leaderboardMeta}>Current ELO</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.sectionCompact}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{activeSection.title}</Text>
            <Text style={styles.sectionSub}>Active tab metrics</Text>
          </View>

          {!hasData ? (
            <Text style={styles.emptyText}>No metric data available yet.</Text>
          ) : (
            <View style={styles.metricGridDense}>
              {activeSection.cards.slice(0, 6).map((card) => {
                const tone = toneStyles(card.tone);
                return (
                  <View
                    key={card.key}
                    style={[
                      styles.metricCardDense,
                      { backgroundColor: tone.bg },
                    ]}
                  >
                    <Text style={styles.metricLabelCompact} numberOfLines={2}>
                      {card.label}
                    </Text>
                    <Text
                      style={[
                        styles.metricValueCompact,
                        { color: tone.value },
                      ]}
                    >
                      {formatMetricValue(card.value)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 8,
    paddingBottom: 12,
  },
  sectionCompact: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  heroTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  heroSub: {
    color: COLORS.sub,
    fontSize: 10,
    lineHeight: 14,
  },
  commandButton: {
    alignSelf: "flex-start",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.28)",
    backgroundColor: "rgba(8,18,32,0.84)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commandButtonText: {
    color: "#F3E8FF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.35,
  },
  insightCardCompact: {
    backgroundColor: COLORS.cardAlt,
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
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
  playerSearchInput: {
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.whiteSoft,
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
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
  underlineTabTextActive: {
    color: COLORS.accent,
  },
  underlineTabLine: {
    marginTop: 4,
    height: 2,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  underlineTabLineActive: {
    backgroundColor: COLORS.accent,
  },
  tabGrid: {
    marginBottom: 6,
    gap: 8,
  },
  tabGridRowTwo: {
    flexDirection: "row",
    gap: 10,
  },
  tabGridRowThree: {
    flexDirection: "row",
    gap: 10,
  },
  underlineMainTab: {
    paddingBottom: 4,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  underlineMainTabTwoCol: {
    flex: 1,
  },
  underlineMainTabThreeCol: {
    flex: 1,
  },
  underlineMainTabText: {
    color: COLORS.sub,
    fontSize: 12,
    fontWeight: "800",
  },
  underlineMainTabTextActive: {
    color: COLORS.accent,
  },
  underlineMainTabLine: {
    marginTop: 5,
    height: 3,
    width: "100%",
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  underlineMainTabLineActive: {
    backgroundColor: COLORS.accent,
  },
  featuredSignalsWrap: {
    flexDirection: "row",
    gap: 4,
  },
  featuredSignalCard: {
    width: "52%",
    minHeight: 150,
    borderRadius: 14,
    padding: 10,
    justifyContent: "space-between",
  },
  featuredSignalLabel: {
    color: COLORS.sub,
    fontSize: 12,
    lineHeight: 14,
    marginBottom: 6,
  },
  featuredSignalValue: {
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 30,
    marginBottom: 6,
  },
  featuredSignalSub: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 14,
  },
  secondarySignalColumn: {
    width: "46%",
    justifyContent: "space-between",
    gap: 4,
  },
  secondarySignalCard: {
    borderRadius: 12,
    padding: 10,
    minHeight: 72,
  },
  leaderboardList: {
    gap: 4,
  },
  leaderboardRow: {
    backgroundColor: COLORS.whiteSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leaderboardRowSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
  },
  leaderboardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    paddingRight: 10,
  },
  leaderboardRight: {
    alignItems: "flex-end",
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.cardAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeSelected: {
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  rankText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "900",
  },
  rankTextSelected: {
    color: COLORS.accent,
  },
  leaderboardName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 1,
  },
  leaderboardElo: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },
  leaderboardMeta: {
    color: COLORS.sub,
    fontSize: 10,
  },
  metricGridDense: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  metricCardDense: {
    width: "32%",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 52,
    justifyContent: "center",
  },
  metricLabelCompact: {
    color: COLORS.sub,
    fontSize: 10,
    lineHeight: 12,
    marginBottom: 4,
  },
  metricValueCompact: {
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 16,
  },
  metricSubCompact: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
    lineHeight: 12,
  },
  insightChip: {
    color: COLORS.blue,
    backgroundColor: COLORS.blueSoft,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 10,
    fontWeight: "800",
  },
  insightText: {
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 15,
  },
});
