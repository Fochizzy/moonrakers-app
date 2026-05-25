import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { PlayerCard as ColorPlayerCard } from "@/components/ColorPlayerCard";
import ActionButton from "@/components/ui/ActionButton";
import DefinitionsJumpLink from "@/components/ui/DefinitionsJumpLink";
import HeroCard from "@/components/ui/HeroCard";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import Text from "@/components/ui/Text";
import {
  useAuthProfile,
  useAuthSession,
  useGames,
  usePlayers,
  useSelectedPlayerId,
  useSetSelectedPlayerId,
} from "@/store/useStore";
import { APP_ROUTES, buildPlayerProfileRoute } from "@/utils/appRoutes";
import { COLORS } from "@/utils/colors";
import { buildPlayerCardEloMap, resolvePlayerCardElo } from "@/utils/playerCardElo";
import { toNumber } from "@/utils/numbers";

type PlayerLike = {
  id: string;
  name: string;
  displayName?: string;
  color?: string;
  initials?: string;
  assignedCardArtIndex?: number | null;
  artIndex?: number | null;
  elo?: number;
  rating?: number;
  wins?: number;
  gamesPlayed?: number;
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  contractsSucceeded?: number;
  contractsFailed?: number;
  objectivesCompleted?: number;
  assists?: number;
  failures?: number;
  score?: number;
  rank?: number;
  title?: string;
  subtitle?: string;
};

function getWinnerId(game: any) {
  return game?.winnerId ?? game?.selectedWinnerId ?? game?.manualWinnerId;
}

function getGameEntryForPlayer(game: any, playerId: string) {
  const gamePlayers = Array.isArray(game?.players) ? game.players : [];
  return gamePlayers.find((player: any) => player?.id === playerId || player?.playerId === playerId);
}

function getGameTotalsForPlayer(game: any, playerId: string) {
  return game?.totals?.[playerId];
}

function getPrestigeFromGame(game: any, playerId: string) {
  const totals = getGameTotalsForPlayer(game, playerId);
  if (totals) {
    const explicit = totals?.totalPrestige ?? totals?.prestige;
    if (typeof explicit === "number" && Number.isFinite(explicit)) {
      return explicit;
    }

    return toNumber(totals?.directPrestige) + toNumber(totals?.assistPrestigeReceived);
  }

  const entry = getGameEntryForPlayer(game, playerId);
  return toNumber(
    entry?.totalPrestige ?? entry?.prestige ?? entry?.finalPrestige ?? entry?.score,
  );
}

function getScoreFromGame(game: any, playerId: string) {
  const totals = getGameTotalsForPlayer(game, playerId);
  if (totals) {
    return toNumber(totals?.score);
  }

  const entry = getGameEntryForPlayer(game, playerId);
  return toNumber(entry?.score);
}

function derivePlayerCardStats(player: PlayerLike, games: any[]) {
  const savedWins = toNumber(player.wins);
  const savedGames = toNumber(player.gamesPlayed);
  const savedPrestige = toNumber(player.totalPrestige ?? player.prestige);
  const savedScore = toNumber(player.score);

  let winsFromGames = 0;
  let gamesFromGames = 0;
  let prestigeFromGames = 0;
  let scoreFromGames = 0;

  for (const game of Array.isArray(games) ? games : []) {
    const entry = getGameEntryForPlayer(game, player.id);
    const totals = getGameTotalsForPlayer(game, player.id);
    if (!entry && !totals) continue;

    gamesFromGames += 1;
    prestigeFromGames += getPrestigeFromGame(game, player.id);
    scoreFromGames += getScoreFromGame(game, player.id);

    const placement = toNumber(entry?.placement ?? entry?.place ?? entry?.rank);
    const isWinner =
      getWinnerId(game) === player.id ||
      entry?.isWinner === true ||
      entry?.won === true ||
      placement === 1;

    if (isWinner) winsFromGames += 1;
  }

  const totalGames = savedGames + gamesFromGames;
  const totalWins = savedWins + winsFromGames;
  const totalPrestige = savedPrestige + prestigeFromGames;
  const totalScore = savedScore + scoreFromGames;
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  return {
    wins: totalWins,
    gamesPlayed: totalGames,
    totalPrestige,
    score: totalScore,
    title:
      totalWins > 0
        ? `${totalWins} wins | ${winRate}% win rate`
        : "Rising fleet commander",
    subtitle:
      totalGames > 0
        ? `${totalGames} games logged across saved and new results`
        : "No logged games yet",
  };
}

function normalizeRoutePlayerId(value: string | string[] | undefined) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
    return value[0];
  }

  return null;
}

function MetricPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.metricPill}>
      <Text variant="metricLabel">{label}</Text>
      <Text variant="metricValue">{value}</Text>
    </View>
  );
}

export default function PlayerCardsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ playerId?: string | string[] }>();
  const [playerQuery, setPlayerQuery] = useState("");

  const players = (usePlayers() ?? []) as PlayerLike[];
  const games = (useGames() ?? []) as any[];
  const authSession = useAuthSession();
  const authProfile = useAuthProfile();
  const selectedPlayerIdFromStore = useSelectedPlayerId();
  const setSelectedPlayerId = useSetSelectedPlayerId();

  const routePlayerId = normalizeRoutePlayerId(params.playerId);
  const eloMap = useMemo(() => buildPlayerCardEloMap(games), [games]);

  const rankedPlayers = useMemo(() => {
    return players
      .map((player) => ({
        ...player,
        ...derivePlayerCardStats(player, games),
        elo: resolvePlayerCardElo(
          String(player.id),
          eloMap,
          toNumber(player.elo ?? player.rating) || 1000,
        ),
      }))
      .sort((left, right) => {
        if ((right.elo ?? 0) !== (left.elo ?? 0)) return (right.elo ?? 0) - (left.elo ?? 0);
        if ((right.wins ?? 0) !== (left.wins ?? 0)) return (right.wins ?? 0) - (left.wins ?? 0);
        if ((right.totalPrestige ?? 0) !== (left.totalPrestige ?? 0)) {
          return (right.totalPrestige ?? 0) - (left.totalPrestige ?? 0);
        }
        return left.name.localeCompare(right.name);
      })
      .map((player, index) => ({
        ...player,
        rank: index + 1,
      }));
  }, [eloMap, games, players]);

  const activePlayerId = authProfile?.id ?? authSession?.user?.id ?? null;
  const effectivePlayerId =
    routePlayerId ||
    (activePlayerId &&
    rankedPlayers.some((player) => String(player.id) === String(activePlayerId))
      ? activePlayerId
      : null) ||
    (typeof selectedPlayerIdFromStore === "string" && selectedPlayerIdFromStore.trim()
      ? selectedPlayerIdFromStore
      : null) ||
    (rankedPlayers[0]?.id ? String(rankedPlayers[0].id) : null);

  const focusedPlayer = useMemo(
    () =>
      rankedPlayers.find((player) => String(player.id) === String(effectivePlayerId)) ??
      rankedPlayers[0] ??
      null,
    [effectivePlayerId, rankedPlayers],
  );

  const normalizedQuery = playerQuery.trim().toLowerCase();
  const filteredPlayers = useMemo(() => {
    if (!normalizedQuery) return [];

    return rankedPlayers.filter((player) => {
      const targets = [player.name, player.displayName, player.initials]
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map((value) => value.toLowerCase());

      return targets.some((value) => value.includes(normalizedQuery));
    });
  }, [normalizedQuery, rankedPlayers]);

  const isViewingLoggedInPlayer = Boolean(
    activePlayerId &&
      focusedPlayer &&
      String(focusedPlayer.id) === String(activePlayerId),
  );

  const handleSelectPlayer = (playerId: string) => {
    if (typeof setSelectedPlayerId === "function") {
      setSelectedPlayerId(playerId);
    }

    setPlayerQuery("");
    router.replace({
      pathname: APP_ROUTES.playerCards,
      params: { playerId: String(playerId) },
    });
  };

  const openFocusedProfile = () => {
    if (!focusedPlayer?.id) return;
    router.push(buildPlayerProfileRoute(String(focusedPlayer.id)));
  };

  return (
    <PageShell preset="quiet" density="compact">
      <HeroCard
        eyebrow="Fleet Roster"
        title="Player Cards"
        subtitle="Search players, switch the focused commander, and jump into a full profile from the same surface."
        size="compact"
        variant="stat"
        actions={
          <ActionButton
            title="Manage roster"
            variant="secondary"
            onPress={() => router.push(APP_ROUTES.roster)}
          />
        }
      >
        <View style={styles.heroMetaRow}>
          <MetricPill label="Players" value={rankedPlayers.length} />
          <MetricPill
            label="Focused Rank"
            value={focusedPlayer?.rank ? `#${focusedPlayer.rank}` : "None"}
          />
          <MetricPill
            label="Mode"
            value={normalizedQuery ? "Searching" : "Roster"}
          />
        </View>
      </HeroCard>

      <SectionCard
        title="Search"
        subtitle="Filter by player name or initials, then load that card below."
        actions={<DefinitionsJumpLink label="Definition" category="elo" />}
      >
        <TextInput
          value={playerQuery}
          onChangeText={setPlayerQuery}
          placeholder="Search players"
          placeholderTextColor={COLORS.muted}
          autoCapitalize="words"
          autoCorrect={false}
          style={styles.searchInput}
        />

        {focusedPlayer ? (
          <View style={styles.currentPlayerCard}>
            <View style={styles.currentPlayerCopy}>
              <Text style={styles.currentPlayerEyebrow}>
                {isViewingLoggedInPlayer ? "Logged-in commander" : "Currently viewing"}
              </Text>
              <Text style={styles.currentPlayerName}>{focusedPlayer.name}</Text>
            </View>

            <View style={styles.currentPlayerBadge}>
              <Text style={styles.currentPlayerBadgeText}>
                #{focusedPlayer.rank ?? 0}
              </Text>
            </View>
          </View>
        ) : null}

        {normalizedQuery ? (
          <ScrollView
            style={styles.searchResults}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.searchResultsContent}>
              {filteredPlayers.length ? (
                filteredPlayers.map((player) => {
                  const active = String(player.id) === String(focusedPlayer?.id);
                  return (
                    <PressableRow
                      key={player.id}
                      active={active}
                      label={player.name}
                      meta={active ? "Current card" : "Tap to view this card"}
                      action={active ? "Viewing" : "View"}
                      onPress={() => handleSelectPlayer(String(player.id))}
                    />
                  );
                })
              ) : (
                <View style={styles.searchEmpty}>
                  <Text style={styles.searchEmptyText}>No players match this search.</Text>
                </View>
              )}
            </View>
          </ScrollView>
        ) : (
          <Text style={styles.searchHint}>
            Search to switch which player card is on screen.
          </Text>
        )}
      </SectionCard>

      <SectionCard
        title="Current Card"
        subtitle="The selected commander card uses the same fallback ELO source across player-card surfaces."
        actions={<DefinitionsJumpLink label="Definition" category="elo" />}
      >
        {focusedPlayer ? (
          <ColorPlayerCard
            player={focusedPlayer}
            games={games}
            isSelected
            onPress={openFocusedProfile}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No player selected</Text>
            <Text style={styles.emptyText}>Search for a player to load their card.</Text>
            <ActionButton
              title="Open roster"
              onPress={() => router.push(APP_ROUTES.roster)}
            />
          </View>
        )}
      </SectionCard>
    </PageShell>
  );
}

function PressableRow({
  active,
  label,
  meta,
  action,
  onPress,
}: {
  active: boolean;
  label: string;
  meta: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <ActionLikeCard active={active} onPress={onPress}>
      <View style={styles.searchResultCopy}>
        <Text style={[styles.searchResultName, active && styles.searchResultNameActive]}>
          {label}
        </Text>
        <Text style={styles.searchResultMeta}>{meta}</Text>
      </View>
      <Text style={[styles.searchResultAction, active && styles.searchResultActionActive]}>
        {action}
      </Text>
    </ActionLikeCard>
  );
}

function ActionLikeCard({
  active,
  children,
  onPress,
}: {
  active: boolean;
  children: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.searchResultCard,
        active && styles.searchResultCardActive,
        pressed && styles.searchResultCardPressed,
      ]}
    >
      <View style={styles.searchResultOverlay}>
        {children}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricPill: {
    minWidth: 92,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 4,
  },
  searchInput: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currentPlayerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(12,18,30,0.82)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.18)",
  },
  currentPlayerCopy: {
    flex: 1,
    gap: 4,
  },
  currentPlayerEyebrow: {
    color: "#93C5FD",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  currentPlayerName: {
    color: "#F8FBFF",
    fontSize: 18,
    fontWeight: "900",
  },
  currentPlayerBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(96,165,250,0.16)",
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.26)",
  },
  currentPlayerBadgeText: {
    color: "#BFDBFE",
    fontSize: 12,
    fontWeight: "900",
  },
  searchHint: {
    color: COLORS.sub,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  searchResults: {
    maxHeight: 220,
  },
  searchResultsContent: {
    gap: 8,
    paddingBottom: 2,
  },
  searchResultCard: {
    minHeight: 70,
    borderRadius: 16,
    backgroundColor: "rgba(12,18,30,0.82)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  searchResultCardActive: {
    borderColor: "rgba(96,165,250,0.42)",
    backgroundColor: "rgba(37,99,235,0.14)",
  },
  searchResultCardPressed: {
    opacity: 0.92,
  },
  searchResultOverlay: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  searchResultCopy: {
    flex: 1,
    gap: 4,
  },
  searchResultName: {
    color: "#E5EEF9",
    fontSize: 14,
    fontWeight: "900",
  },
  searchResultNameActive: {
    color: "#F8FBFF",
  },
  searchResultMeta: {
    color: "#9FB3D9",
    fontSize: 11,
    fontWeight: "700",
  },
  searchResultAction: {
    color: "#C7D6F3",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  searchResultActionActive: {
    color: "#BFDBFE",
  },
  searchEmpty: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: "rgba(12,18,30,0.72)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  searchEmptyText: {
    color: COLORS.sub,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyState: {
    gap: 10,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});
