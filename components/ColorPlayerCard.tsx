import React, { useMemo } from "react";
import {
  Pressable,
  View,
  StyleSheet,
  ScrollView,
  Image,
  type ViewStyle,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import {
  useGames,
  usePlayers,
  useSelectedPlayerId,
  useSetSelectedPlayerId,
} from "@/store/useStore";
import { getPlayerColors } from "@/utils/colors";
import { buildPlayerIdentity } from "@/utils/playerIdentity";
import { buildPlayerCardEloMap, resolvePlayerCardElo } from "@/utils/playerCardElo";
import DefinitionTermText from "@/components/ui/DefinitionTermText";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Text from "@/components/ui/Text";
import { getPlayerCardSourceByArtIndex } from "@/utils/playerCardAssets";

type PlayerStats = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  contracts?: number;
  assists?: number;
  failures?: number;
  score?: number;
  wins?: number;
  gamesPlayed?: number;
};

type Player = {
  id?: string;
  name?: string;
  initials?: string;
  color?: string;
  assignedCardArtIndex?: number | null;
  artIndex?: number | null;
  elo?: number;
  prestige?: number;
  totalPrestige?: number;
  score?: number;
  wins?: number;
  gamesPlayed?: number;
  title?: string;
  subtitle?: string;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  contractsSucceeded?: number;
  contractsFailed?: number;
  objectivesCompleted?: number;
  contracts?: number;
  assists?: number;
  failures?: number;
  rank?: number;
  stats?: PlayerStats;
};

type Totals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  objectivePrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeBySource?: Record<string, number>;
  contracts?: number;
  assists?: number;
  failures?: number;
  score?: number;
};

type Game = {
  id?: string;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  totals?: Record<string, Totals>;
};

type CardProps = {
  player?: Player | null;
  isSelected?: boolean;
  onPress?: () => void;
};

type ResolvedPlayerStats = {
  totalPrestige: number;
  score: number;
  wins: number;
  gamesPlayed: number;
  directPrestige: number;
  assistPrestigeReceived: number;
  contractsSucceeded: number;
  contractsFailed: number;
  objectivesCompleted: number;
  assists: number;
};

const localButtonSystem = {
  base: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
  } satisfies ViewStyle,
};

function buildChartButton(isSelected = false, accent = "#8B5CF6"): ViewStyle {
  return {
    borderColor: isSelected ? `${accent}AA` : `${accent}55`,
    backgroundColor: isSelected ? `${accent}18` : `${accent}12`,
  };
}

function buildChartGhostButton(disabled = false): ViewStyle {
  return {
    borderColor: "rgba(148,163,184,0.22)",
    backgroundColor: disabled
      ? "rgba(255,255,255,0.02)"
      : "rgba(255,255,255,0.04)",
    opacity: disabled ? 0.55 : 1,
  };
}

function getColorColumn(color?: string) {
  switch ((color ?? "").toLowerCase()) {
    case "blue":
      return 0;
    case "green":
      return 1;
    case "purple":
      return 2;
    case "orange":
      return 3;
    case "yellow":
      return 4;
    default:
      return 2;
  }
}

function buildCardArtIndex(color?: string, seed = 0) {
  const column = getColorColumn(color);
  const row = Math.abs(seed) % 6;
  return row * 5 + column;
}

function resolveRenderableCardArtIndex(player?: Player | null) {
  return typeof player?.assignedCardArtIndex === "number" &&
    Number.isFinite(player.assignedCardArtIndex)
    ? player.assignedCardArtIndex
    : typeof player?.artIndex === "number" &&
        Number.isFinite(player.artIndex)
      ? player.artIndex
      : typeof player?.id === "string" || typeof player?.id === "number"
        ? buildCardArtIndex(
            player?.color,
            Number(String(player?.id).replace(/\D/g, "").slice(-3) || 0)
          )
        : buildCardArtIndex(player?.color, 0);
}

function CropCardArt({
  artIndex,
  width,
  height,
}: {
  artIndex: number;
  width: number;
  height: number;
}) {
  const source = getPlayerCardSourceByArtIndex(artIndex);

  return (
    <View style={[styles.cropWindow, { width, height }]}>
      <Image
        source={source}
        resizeMode="cover"
        style={styles.cropImage}
      />
    </View>
  );
}

function SmallPlayerArt({
  player,
  size = 58,
}: {
  player: Player;
  size?: number;
}) {
  const artIndex = resolveRenderableCardArtIndex(player);

  return (
    <View
      style={[
        styles.smallArtFrame,
        {
          width: size,
          height: Math.round(size * 1.44),
        },
      ]}
    >
      <CropCardArt
        artIndex={artIndex}
        width={size}
        height={Math.round(size * 1.44)}
      />
      <View style={styles.smallArtDim} />
      <View style={styles.smallArtInitialWrap}>
        <Text style={styles.smallArtInitialText}>{getInitials(player.name)}</Text>
      </View>
    </View>
  );
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function safeDivide(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function getInitials(name?: string) {
  if (!name?.trim()) return "?";
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const [first, second] = parts;
  if (first === undefined) return "?";
  if (second === undefined) return first.slice(0, 1).toUpperCase();
  return `${first[0]}${second[0]}`.toUpperCase();
}

function safeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getEfficiencyTier(value: number) {
  if (value >= 2) return "Elite";
  if (value >= 1.5) return "Strong";
  if (value >= 1) return "Average";
  return "Inefficient";
}

function getWinnerId(game?: Game): string | undefined {
  if (!game) return undefined;
  return game.winnerId ?? game.selectedWinnerId ?? game.manualWinnerId;
}

function getPlayerStat(player: Player, key: keyof PlayerStats) {
  const nested = player.stats?.[key];
  const direct = player[key as keyof Player] as unknown;
  return toNumber(nested ?? direct);
}

function getPlayerTotalPrestige(player: Player) {
  const explicit =
    player.stats?.totalPrestige ??
    player.totalPrestige ??
    player.stats?.prestige ??
    player.prestige;

  if (typeof explicit === "number" && Number.isFinite(explicit)) {
    return explicit;
  }

  const direct = getPlayerStat(player, "directPrestige");
  const assist = getPlayerStat(player, "assistPrestigeReceived");
  return direct + assist;
}

function getTotalPrestige(totals?: Totals) {
  const direct = toNumber(totals?.directPrestige);
  const assist = toNumber(totals?.assistPrestigeReceived);
  const objective = toNumber(totals?.objectivePrestige);
  const explicit = totals?.totalPrestige ?? totals?.prestige;

  if (typeof explicit === "number" && Number.isFinite(explicit)) {
    return explicit;
  }

  return direct + assist + objective;
}

function resolvePlayerStats(
  player: Player | null,
  games: Game[]
): ResolvedPlayerStats {
  if (!player?.id) {
    return {
      totalPrestige: 0,
      score: 0,
      wins: 0,
      gamesPlayed: 0,
      directPrestige: 0,
      assistPrestigeReceived: 0,
      contractsSucceeded: 0,
      contractsFailed: 0,
      objectivesCompleted: 0,
      assists: 0,
    };
  }

  let gameGamesPlayed = 0;
  let gameWins = 0;
  let gameTotalPrestige = 0;
  let gameDirectPrestige = 0;
  let gameAssistPrestigeReceived = 0;
  let gameObjectivesCompleted = 0;
  let gameTotalContracts = 0;
  let gameTotalAssists = 0;
  let gameTotalFailures = 0;
  let gameTotalScore = 0;

  for (const game of games) {
    const totals = game.totals?.[String(player.id)];
    if (!totals) continue;

    gameGamesPlayed += 1;

    const prestige = getTotalPrestige(totals);
    const direct = toNumber(totals.directPrestige);
    const objective = toNumber(totals.objectivePrestige);
    const assistReceived =
      typeof totals.assistPrestigeReceived === "number" &&
      Number.isFinite(totals.assistPrestigeReceived)
        ? toNumber(totals.assistPrestigeReceived)
        : Math.max(0, prestige - direct - objective);

    const contracts = toNumber(totals.contracts);
    const assists = toNumber(totals.assists);
    const failures = toNumber(totals.failures);
    const score = toNumber(totals.score);

    gameTotalPrestige += prestige;
    gameDirectPrestige += direct;
    gameAssistPrestigeReceived += assistReceived;
    gameObjectivesCompleted += objective;
    gameTotalContracts += contracts;
    gameTotalAssists += assists;
    gameTotalFailures += failures;
    gameTotalScore += score;

    if (getWinnerId(game) === String(player.id)) {
      gameWins += 1;
    }
  }

  const savedGamesPlayed = getPlayerStat(player, "gamesPlayed");
  const savedWins = getPlayerStat(player, "wins");
  const savedTotalPrestige = getPlayerTotalPrestige(player);
  const savedDirectPrestige = getPlayerStat(player, "directPrestige");
  const savedAssistPrestigeReceived = getPlayerStat(
    player,
    "assistPrestigeReceived"
  );
  const savedContracts =
    toNumber(player.contractsSucceeded) || getPlayerStat(player, "contracts");
  const savedAssists = getPlayerStat(player, "assists");
  const savedFailures =
    toNumber(player.contractsFailed) || getPlayerStat(player, "failures");
  const savedScore = getPlayerStat(player, "score");
  const savedObjectives = toNumber(player.objectivesCompleted);

  const totalPrestige =
    gameTotalPrestige > 0 ? gameTotalPrestige : savedTotalPrestige;
  const directPrestige =
    gameDirectPrestige > 0 ? gameDirectPrestige : savedDirectPrestige;
  const assistPrestigeReceived =
    gameAssistPrestigeReceived > 0
      ? gameAssistPrestigeReceived
      : savedAssistPrestigeReceived > 0
        ? savedAssistPrestigeReceived
        : Math.max(0, totalPrestige - directPrestige - gameObjectivesCompleted);

  const contractsSucceeded =
    gameTotalContracts > 0 ? gameTotalContracts : savedContracts;
  const assists = gameTotalAssists > 0 ? gameTotalAssists : savedAssists;
  const contractsFailed =
    gameTotalFailures > 0 ? gameTotalFailures : savedFailures;
  const score = gameTotalScore > 0 ? gameTotalScore : savedScore;
  const wins = gameWins > 0 || gameGamesPlayed > 0 ? gameWins : savedWins;
  const gamesPlayed =
    gameGamesPlayed > 0 ? gameGamesPlayed : savedGamesPlayed;
  const objectivesCompleted =
    gameObjectivesCompleted > 0 ? gameObjectivesCompleted : savedObjectives;

  return {
    totalPrestige,
    score,
    wins,
    gamesPlayed,
    directPrestige,
    assistPrestigeReceived,
    contractsSucceeded,
    contractsFailed,
    objectivesCompleted,
    assists,
  };
}

function buildEfficiencyStats(resolved: ResolvedPlayerStats) {
  const allEff = safeDivide(
    resolved.directPrestige + resolved.assistPrestigeReceived,
    resolved.contractsSucceeded + resolved.assists
  );

  const assistEff = safeDivide(
    resolved.assistPrestigeReceived,
    resolved.assists
  );

  const directEff = safeDivide(
    resolved.directPrestige,
    resolved.contractsSucceeded
  );

  return {
    allEff,
    assistEff,
    directEff,
    allTier: getEfficiencyTier(allEff),
  };
}

function IdentityBadge({
  name,
  accent,
}: {
  name: string;
  accent: string;
}) {
  return (
    <View style={[styles.identityBadge, { borderColor: `${accent}55` }]}>
      <Text style={[styles.identityBadgeText, { color: accent }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

function StatTile({
  label,
  metric = null,
  value,
  accent,
}: {
  label: string;
  metric?: string | null;
  value: string | number;
  accent: string;
}) {
  return (
    <View style={[styles.statTile, { borderColor: `${accent}24` }]}>
      <DefinitionTermText
        label={label}
        metric={metric}
        style={styles.statTileLabel}
      />
      <Text style={[styles.statTileValue, { color: accent }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function PlayerCard({
  player,
  games,
  isSelected = false,
  onPress,
}: CardProps & { games: Game[] }) {
  const router = useRouter();
  const scale = useSharedValue(1);
  const safePlayer = player ?? null;

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const palette = useMemo(() => {
    const raw = getPlayerColors?.(safePlayer?.color);

    return {
      base: safeString(raw?.base, "#8B5CF6"),
      text: safeString(raw?.text, "#F8FAFC"),
      border: safeString(raw?.border, "rgba(148,163,184,0.16)"),
      muted: safeString(raw?.subtext, "#94A3B8"),
    };
  }, [safePlayer?.color]);

  const accent = palette.base;
  const elo = Math.round(toNumber(safePlayer?.elo) || 1000);
  const rank = toNumber(safePlayer?.rank);

  const resolved = useMemo(
    () => resolvePlayerStats(safePlayer, games),
    [safePlayer, games]
  );

  const winRate =
    resolved.gamesPlayed > 0
      ? Math.round((resolved.wins / resolved.gamesPlayed) * 100)
      : 0;

  const eff = useMemo(() => buildEfficiencyStats(resolved), [resolved]);

  const identity = useMemo(() => {
    if (!safePlayer) {
      return {
        displayName: "Unknown Player",
        subtitle: "No player data",
      };
    }

    try {
      const built = buildPlayerIdentity(safePlayer);
      return {
        displayName:
          safeString(built.displayName, "") ||
          safeString(safePlayer.name, "Unknown Player"),
        subtitle:
          safeString(built.subtitle, "") ||
          safeString(
            safePlayer.subtitle,
            `Callsign ${getInitials(safePlayer.name)}`
          ),
      };
    } catch {
      return {
        displayName: safeString(safePlayer.name, "Unknown Player"),
        subtitle: safeString(
          safePlayer.subtitle,
          `Callsign ${getInitials(safePlayer.name)}`
        ),
      };
    }
  }, [safePlayer]);

  const displayName = safeString(identity.displayName, "Unknown Player");
  const subtitle = safeString(identity.subtitle, "No player data");
  const featuredStats = `${resolved.gamesPlayed} Games • ${resolved.wins} Wins • ${winRate}% WR`;

  const artIndex = resolveRenderableCardArtIndex(safePlayer);

  const openPlayerProfile = () => {
    if (!safePlayer?.id) return;

    if (onPress) {
      onPress();
      return;
    }

    router.push({
      pathname: "/player-profile/[playerId]",
      params: { playerId: String(safePlayer.id) },
    });
  };

  const openCompare = () => {
    if (!safePlayer?.id) return;

    router.push({
      pathname: "/charts/compare",
      params: { playerId: String(safePlayer.id) },
    });
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={openPlayerProfile}
        onPressIn={() => {
          scale.value = withSpring(0.988, {
            damping: 18,
            stiffness: 220,
          });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, {
            damping: 18,
            stiffness: 220,
          });
        }}
      >
        <Animated.View
          style={[
            styles.card,
            {
              borderColor: isSelected ? `${accent}88` : palette.border,
              shadowColor: accent,
            },
            isSelected && styles.cardSelected,
            anim,
          ]}
        >
          <View style={[styles.topGlow, { backgroundColor: `${accent}14` }]} />
          <View style={[styles.sideGlow, { backgroundColor: `${accent}10` }]} />
          <View style={[styles.cardAccentRail, { backgroundColor: accent }]} />

          <View style={styles.headerRow}>
            <IdentityBadge name={displayName} accent={accent} />

            <View style={styles.headerTextWrap}>
              <View style={styles.nameRow}>
                <Text
                  style={[styles.name, { color: palette.text }]}
                  numberOfLines={1}
                >
                  {displayName}
                </Text>

                {rank > 0 ? (
                  <View
                    style={[
                      styles.rankBadge,
                      {
                        borderColor: `${accent}44`,
                        backgroundColor: `${accent}14`,
                      },
                    ]}
                  >
                    <Text style={[styles.rankBadgeText, { color: accent }]}>
                      #{rank}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text
                style={[styles.subtitle, { color: palette.muted }]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>

              <View
                style={[
                  styles.featuredStatRow,
                  {
                    borderColor: `${accent}24`,
                    backgroundColor: "rgba(255,255,255,0.04)",
                  },
                ]}
              >
                <View style={[styles.featuredDot, { backgroundColor: accent }]} />
                <Text style={styles.featuredStatText} numberOfLines={1}>
                  {featuredStats}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.heroSection}>
            <View style={styles.heroLeft}>
              <View
                style={[
                  styles.eloBanner,
                  {
                    borderColor: `${accent}30`,
                    backgroundColor: `${accent}12`,
                  },
                ]}
              >
                <Text style={styles.eloLabel}>ELO RATING</Text>
                <Text style={[styles.eloValue, { color: accent }]}>{elo}</Text>
              </View>

              <View style={styles.heroMiniGrid}>
                <View style={styles.heroMiniCard}>
                  <Text style={styles.heroMiniLabel}>Prestige</Text>
                  <Text style={styles.heroMiniValue}>{resolved.totalPrestige}</Text>
                </View>
                <View style={styles.heroMiniCard}>
                  <Text style={styles.heroMiniLabel}>Score</Text>
                  <Text style={styles.heroMiniValue}>{resolved.score}</Text>
                </View>
              </View>
            </View>

            <View style={styles.heroArtWrap}>
              <View style={styles.heroArtFrame}>
                <CropCardArt artIndex={artIndex} width={86} height={124} />
                <View style={styles.heroArtDim} />
                <View style={styles.heroInitialWrap}>
                  <Text style={styles.heroInitialText}>
                    {safePlayer?.initials || getInitials(safePlayer?.name)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>Performance Snapshot</Text>
          </View>

          <View style={styles.grid}>
            <StatTile label="Score" metric="score" value={resolved.score} accent={accent} />
            <StatTile label="Wins" metric="wins" value={resolved.wins} accent={accent} />
            <StatTile label="Win Rate" metric="winRate" value={`${winRate}%`} accent={accent} />
            <StatTile label="Games" metric="games" value={resolved.gamesPlayed} accent={accent} />
            <StatTile
              label="Objectives"
              value={resolved.objectivesCompleted}
              accent={accent}
            />
            <StatTile
              label="Direct"
              value={resolved.directPrestige}
              accent={accent}
            />
            <StatTile
              label="Assist"
              value={resolved.assistPrestigeReceived}
              accent={accent}
            />
            <StatTile
              label="Contracts"
              value={`${resolved.contractsSucceeded}-${resolved.contractsFailed}`}
              accent={accent}
            />
            <StatTile
              label="Efficiency"
              metric="allContractsEfficiency"
              value={eff.allEff.toFixed(2)}
              accent={accent}
            />
            <StatTile
              label="Assist Eff"
              metric="assistEfficiency"
              value={eff.assistEff.toFixed(2)}
              accent={accent}
            />
            <StatTile
              label="Direct Eff"
              metric="directEfficiency"
              value={eff.directEff.toFixed(2)}
              accent={accent}
            />
            <StatTile label="Tier" value={eff.allTier} accent={accent} />
          </View>
        </Animated.View>
      </Pressable>

      <View style={styles.actionRow}>
        <Pressable
          onPress={openPlayerProfile}
          style={[
            styles.actionButtonPrimary,
            buildChartButton(isSelected, accent),
          ]}
        >
          <Text
            style={[
              styles.actionButtonPrimaryText,
              { color: isSelected ? accent : "#F8FAFC" },
            ]}
          >
            Player Card
          </Text>
        </Pressable>

        <Pressable
          onPress={openCompare}
          style={[
            styles.actionButtonSecondary,
            buildChartGhostButton(false),
          ]}
        >
          <Text style={styles.actionButtonSecondaryText}>Compare</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ColorPlayerCardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ playerId?: string | string[] }>();

  const players = (usePlayers() ?? []) as Player[];
  const games = (useGames() ?? []) as Game[];
  const selectedPlayerIdFromStore = useSelectedPlayerId();
  const setSelectedPlayerId = useSetSelectedPlayerId();

  const eloMap = useMemo(() => {
    return buildPlayerCardEloMap(games);
  }, [games]);

  const routePlayerId =
    typeof params.playerId === "string"
      ? params.playerId
      : Array.isArray(params.playerId) && typeof params.playerId[0] === "string"
        ? params.playerId[0]
        : null;

  const effectivePlayerId =
    routePlayerId ||
    (typeof selectedPlayerIdFromStore === "string" &&
    selectedPlayerIdFromStore.trim()
      ? selectedPlayerIdFromStore
      : null) ||
    (players[0]?.id ? String(players[0].id) : null);

  const selectedPlayer = useMemo(
    () => players.find((p) => String(p.id) === String(effectivePlayerId)) ?? null,
    [players, effectivePlayerId]
  );

  const rankedPlayers = useMemo(() => {
    return [...players]
      .map((player) => {
        const resolved = resolvePlayerStats(player, games);

        return {
          ...player,
          totalPrestige: resolved.totalPrestige,
          score: resolved.score,
          wins: resolved.wins,
          gamesPlayed: resolved.gamesPlayed,
          directPrestige: resolved.directPrestige,
          assistPrestigeReceived: resolved.assistPrestigeReceived,
          contractsSucceeded: resolved.contractsSucceeded,
          contractsFailed: resolved.contractsFailed,
          objectivesCompleted: resolved.objectivesCompleted,
          assists: resolved.assists,
          elo: resolvePlayerCardElo(String(player.id), eloMap),
        };
      })
      .sort((a, b) => {
        if ((b.elo ?? 0) !== (a.elo ?? 0)) return (b.elo ?? 0) - (a.elo ?? 0);
        if ((b.wins ?? 0) !== (a.wins ?? 0)) return (b.wins ?? 0) - (a.wins ?? 0);
        if ((b.totalPrestige ?? 0) !== (a.totalPrestige ?? 0)) {
          return (b.totalPrestige ?? 0) - (a.totalPrestige ?? 0);
        }
        return String(a.name ?? "").localeCompare(String(b.name ?? ""));
      })
      .map((player, index) => ({ ...player, rank: index + 1 }));
  }, [players, games, eloMap]);

  const rankedSelectedPlayer = useMemo(
    () =>
      rankedPlayers.find((p) => String(p.id) === String(selectedPlayer?.id)) ??
      selectedPlayer,
    [rankedPlayers, selectedPlayer]
  );

  const handleSelectPlayer = (playerId: string) => {
    if (typeof setSelectedPlayerId === "function") {
      setSelectedPlayerId(playerId);
    }

    router.replace({
      pathname: "/player-cards",
      params: { playerId: String(playerId) },
    });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundLayer}>
        <ScreenBackground preset="quiet" />
        <View style={styles.backgroundDim} />
      </View>

      <ScrollView
        contentContainerStyle={styles.screenContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>Player Card</Text>
        </View>

        {players.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No players found</Text>
            <Text style={styles.emptyStateText}>
              Add a player first so the card has data to display.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.selectorShell}>
              <Text style={styles.selectorLabel}>Select Player</Text>

              <View style={styles.selectorRow}>
                {rankedPlayers.map((player) => {
                  const active =
                    String(player.id) === String(rankedSelectedPlayer?.id);

                  const rawPalette = getPlayerColors?.(player.color);
                  const accent = safeString(rawPalette?.base, "#8B5CF6");
                  const textColor = safeString(rawPalette?.text, "#F8FAFC");

                  return (
                    <Pressable
                      key={String(player.id)}
                      onPress={() => handleSelectPlayer(String(player.id))}
                      style={[
                        styles.selectorCard,
                        {
                          borderColor: active
                            ? `${accent}99`
                            : "rgba(148,163,184,0.18)",
                          backgroundColor: active
                            ? `${accent}18`
                            : "rgba(255,255,255,0.04)",
                        },
                      ]}
                    >
                      <SmallPlayerArt player={player} size={50} />
                      <Text
                        style={[
                          styles.selectorCardText,
                          { color: active ? textColor : "#CBD5E1" },
                        ]}
                        numberOfLines={1}
                      >
                        {safeString(player.name, "Unknown")}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <PlayerCard player={rankedSelectedPlayer} games={games} isSelected />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#081120",
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFill,
  },
  backgroundDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  screenContent: {
    padding: 16,
    paddingBottom: 28,
  },
  screenHeader: {
    marginBottom: 14,
  },
  screenTitle: {
    color: "#F8FAFC",
    fontSize: 28,
    fontWeight: "900",
  },
  selectorShell: {
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: "rgba(10,16,32,0.76)",
    padding: 12,
  },
  selectorLabel: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  selectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectorCard: {
    width: "31.8%",
    minHeight: 106,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  selectorCardText: {
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    width: "100%",
  },
  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: "rgba(10,16,32,0.76)",
    padding: 16,
  },
  emptyStateTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
  },
  emptyStateText: {
    color: "#94A3B8",
    marginTop: 6,
    fontSize: 13,
  },
  wrapper: {
    marginBottom: 18,
  },
  card: {
    position: "relative",
    overflow: "hidden",
    minHeight: 420,
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    backgroundColor: "#08101f",
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  cardSelected: {
    borderWidth: 1.5,
  },
  topGlow: {
    position: "absolute",
    top: -45,
    right: -25,
    width: 190,
    height: 190,
    borderRadius: 999,
  },
  sideGlow: {
    position: "absolute",
    bottom: -50,
    left: -30,
    width: 160,
    height: 160,
    borderRadius: 999,
  },
  cardAccentRail: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    zIndex: 1,
  },
  identityBadge: {
    width: 70,
    height: 70,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
  },
  identityBadgeText: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  name: {
    flex: 1,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  rankBadge: {
    minWidth: 54,
    height: 32,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  rankBadgeText: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  subtitle: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: "600",
  },
  featuredStatRow: {
    marginTop: 12,
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featuredDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  featuredStatText: {
    flex: 1,
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  heroSection: {
    marginTop: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  },
  heroLeft: {
    flex: 1,
    gap: 10,
  },
  eloBanner: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  eloLabel: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  eloValue: {
    marginTop: 4,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38,
  },
  heroMiniGrid: {
    flexDirection: "row",
    gap: 10,
  },
  heroMiniCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  heroMiniLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroMiniValue: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: "900",
    color: "#F8FAFC",
  },
  heroArtWrap: {
    width: 102,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  heroArtFrame: {
    width: 86,
    height: 124,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "#0f172a",
    position: "relative",
  },
  heroArtDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  heroInitialWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  heroInitialText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cropWindow: {
    position: "absolute",
    left: 0,
    top: 0,
    overflow: "hidden",
    backgroundColor: "#111827",
  },
  cropImage: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
  },
  smallArtFrame: {
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#0f172a",
    position: "relative",
  },
  smallArtDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  smallArtInitialWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  smallArtInitialText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  sectionHeader: {
    marginTop: 18,
    marginBottom: 10,
  },
  sectionHeaderText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statTile: {
    width: "31.5%",
    minWidth: 92,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  statTileLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  statTileValue: {
    marginTop: 7,
    fontSize: 18,
    fontWeight: "900",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  actionButtonPrimary: {
    ...localButtonSystem.base,
    flex: 1,
  },
  actionButtonSecondary: {
    ...localButtonSystem.base,
    flex: 1,
  },
  actionButtonPrimaryText: {
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 0.2,
  },
  actionButtonSecondaryText: {
    color: "#F8FAFC",
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
