import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";

import ActionButton from "@/components/ui/ActionButton";
import AppHeader from "@/components/ui/AppHeader";
import PageShell from "@/components/ui/PageShell";
import Text from "@/components/ui/Text";
import PlayerCardIcon from "@/components/player/PlayerCardIcon";
import { useStore } from "@/store/useStore";
import {
  buildActiveGamePlayersFromTurnOrder,
  buildTurnOrderSummary,
  canSubmitGameSetup,
  type GameSetupTurnOrderPlayer,
} from "@/utils/gameSetupTurnOrder";
import { resolveStoredPlayerColor } from "@/utils/playerColor";
import { getPlayerAccentColor } from "@/utils/turnTheme";

type PlayerLike = GameSetupTurnOrderPlayer;

type GroupLike = {
  id: string;
  name?: string;
  playerIds?: string[];
};

type SetupParams = {
  selectedPlayers?: string | string[];
  selectedGroups?: string | string[];
  players?: string | string[];
  groups?: string | string[];
  mode?: string | string[];
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function safeParseArray<T>(value: string | string[] | undefined): T[] {
  const raw = firstParam(value);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function resolveDisplayName(player: PlayerLike, index: number) {
  const name = String(player.name ?? "").trim();
  return name.length ? name : `Player ${index + 1}`;
}

function getAccentColor(color?: string, index = 0) {
  return getPlayerAccentColor(resolveStoredPlayerColor(color, index));
}

function darkenHex(hex?: string, amount = 0.42) {
  if (!hex || !hex.startsWith("#")) return "#0F172A";
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;

  const num = parseInt(full, 16);
  const r = Math.max(0, Math.floor(((num >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.floor(((num >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.floor((num & 255) * (1 - amount)));

  return `rgb(${r}, ${g}, ${b})`;
}

function TurnOrderSummary({ players }: { players: PlayerLike[] }) {
  const startingPlayer = players[0] ?? null;
  const summaryText = buildTurnOrderSummary(players);
  const accent = startingPlayer ? getAccentColor(startingPlayer.color, 0) : "#7DD3FC";

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Text variant="utilityLabel" style={styles.sectionLabel}>
          First Captain
        </Text>
        <Text style={styles.summaryHint}>Top card goes first on the game screen.</Text>
      </View>

      {startingPlayer ? (
        <View
          style={[
            styles.startingCard,
            {
              borderColor: `${accent}55`,
              backgroundColor: darkenHex(accent, 0.72),
              shadowColor: accent,
            },
          ]}
        >
          <View style={styles.startingBadge}>
            <Text style={styles.startingBadgeText}>1</Text>
          </View>

          <View style={styles.startingAvatarWrap}>
            <PlayerCardIcon
              player={startingPlayer as any}
              size={52}
              showInitial={false}
            />
          </View>

          <View style={styles.startingCopy}>
            <Text style={styles.startingName} numberOfLines={1}>
              {resolveDisplayName(startingPlayer, 0)}
            </Text>
            <Text style={styles.startingMeta}>Launches the table and takes turn one.</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.summaryEmptyText}>Select players to lock in turn order.</Text>
      )}

      <View style={styles.summaryTextBlock}>
        <Text variant="utilityLabel" style={styles.summaryTextLabel}>
          Locked Order
        </Text>
        <Text style={styles.summaryTextValue}>{summaryText}</Text>
      </View>
    </View>
  );
}

function CaptainNameStrip({
  players,
  disabled,
  onSelect,
}: {
  players: PlayerLike[];
  disabled: boolean;
  onSelect: (playerId: string) => void;
}) {
  if (!players.length) return null;

  return (
    <View style={styles.nameStripBlock}>
      <View style={styles.nameStripHeader}>
        <Text variant="utilityLabel" style={styles.sectionLabel}>
          Crew Names
        </Text>
        <Text style={styles.nameStripHint}>Tap a name to make that captain go first.</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.nameStripContent}
      >
        {players.map((player, index) => {
          const accent = getAccentColor(player.color, index);
          const isLeading = index === 0;

          return (
            <Pressable
              key={player.id}
              onPress={disabled ? undefined : () => onSelect(player.id)}
              disabled={disabled}
              style={({ pressed }) => [
                styles.nameChip,
                {
                  borderColor: isLeading ? accent : `${accent}55`,
                  backgroundColor: isLeading ? `${accent}16` : "rgba(10, 18, 38, 0.94)",
                },
                pressed && !disabled ? styles.nameChipPressed : null,
              ]}
              android_ripple={{ color: "rgba(255,255,255,0.08)" }}
            >
              <View
                style={[
                  styles.nameChipBadge,
                  {
                    backgroundColor: isLeading ? accent : "rgba(148,163,184,0.22)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.nameChipBadgeText,
                    isLeading ? styles.nameChipBadgeTextActive : null,
                  ]}
                >
                  {index + 1}
                </Text>
              </View>

              <Text
                numberOfLines={1}
                style={[
                  styles.nameChipText,
                  isLeading ? { color: accent } : null,
                ]}
              >
                {resolveDisplayName(player, index)}
              </Text>

              <Text style={styles.nameChipMeta}>
                {isLeading ? "First" : "Make first"}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function TurnOrderRow({
  item,
  index,
  drag,
  isActive,
  isStartingGame,
}: RenderItemParams<PlayerLike> & {
  isStartingGame: boolean;
}) {
  const accent = getAccentColor(item.color, index);
  const displayName = resolveDisplayName(item, index);
  const isFirstCaptain = index === 0;

  return (
    <ScaleDecorator>
      <Pressable
        onLongPress={isStartingGame ? undefined : drag}
        delayLongPress={120}
        disabled={isStartingGame}
        style={({ pressed }) => [
          styles.rowPressable,
          pressed && !isActive ? styles.rowPressed : null,
        ]}
        android_ripple={{ color: "rgba(255,255,255,0.08)" }}
      >
        <View
          style={[
            styles.rowCard,
            {
              borderColor: isActive ? accent : `${accent}4A`,
              backgroundColor: isActive
                ? darkenHex(accent, 0.68)
                : darkenHex(accent, 0.8),
              shadowColor: accent,
            },
          ]}
        >
          <View style={styles.rowHeader}>
            <View
              style={[
                styles.rowOrderPill,
                isFirstCaptain ? styles.rowOrderPillPrimary : null,
              ]}
            >
              <Text style={styles.rowOrderPillText}>{index + 1}</Text>
            </View>

            {isFirstCaptain ? (
              <View
                style={[
                  styles.firstChip,
                  {
                    borderColor: `${accent}55`,
                    backgroundColor: `${accent}18`,
                  },
                ]}
              >
                <Text style={[styles.firstChipText, { color: accent }]}>FIRST CAPTAIN</Text>
              </View>
            ) : (
              <Text style={styles.rowTapMeta}>Drag this card into its snapped turn slot.</Text>
            )}
          </View>

          <Text style={styles.rowName} numberOfLines={1}>
            {displayName}
          </Text>

          <View style={[styles.rowAvatarWrap, { borderColor: `${accent}55` }]}>
            <PlayerCardIcon
              player={item as any}
              size={88}
              borderRadius={18}
              showInitial={false}
            />
          </View>

          <Text style={styles.rowMeta}>
            {isFirstCaptain
              ? "Top card starts the game. Drag another card above it to change the opener."
              : `Current seat ${index + 1}. Hold and drag to reorder.`}
          </Text>

          <Text style={styles.dragHandleText}>Hold and drag to reorder</Text>
        </View>
      </Pressable>
    </ScaleDecorator>
  );
}

export default function GameSetup() {
  const router = useRouter();
  const params = useLocalSearchParams<SetupParams>();
  const startActiveGame = useStore((state) => state.startActiveGame);

  const selectedPlayers = useMemo(
    () => safeParseArray<PlayerLike>(params.selectedPlayers),
    [params.selectedPlayers]
  );

  const selectedGroups = useMemo(
    () => safeParseArray<GroupLike>(params.selectedGroups),
    [params.selectedGroups]
  );

  const allPlayers = useMemo(
    () => safeParseArray<PlayerLike>(params.players),
    [params.players]
  );

  const modeParam = firstParam(params.mode);
  const mode: "players" | "group" =
    modeParam === "group" || selectedGroups.length > 0 ? "group" : "players";

  const selectedGroup = mode === "group" ? selectedGroups[0] ?? null : null;

  const resolvedPlayers = useMemo(() => {
    if (mode === "players") return selectedPlayers;

    if (!selectedGroup?.playerIds?.length) return [];

    const playerMap = new Map(allPlayers.map((player) => [player.id, player]));
    return selectedGroup.playerIds
      .map((playerId) => playerMap.get(playerId))
      .filter(Boolean) as PlayerLike[];
  }, [allPlayers, mode, selectedGroup, selectedPlayers]);

  const [turnOrder, setTurnOrder] = useState<PlayerLike[]>([]);
  const [isStarting, setIsStarting] = useState(false);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const overlayGlow = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setTurnOrder(
      resolvedPlayers.map((player, index) => ({
        ...player,
        color: resolveStoredPlayerColor(player.color, index),
      }))
    );
  }, [resolvedPlayers]);

  const canStart = canSubmitGameSetup(turnOrder);

  const goBack = useCallback(() => {
    if (isStarting) return;
    router.back();
  }, [isStarting, router]);

  const playStartAnimation = useCallback(async () => {
    setIsStarting(true);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentScale, {
        toValue: 0.985,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 0.88,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(overlayGlow, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(overlayGlow, {
          toValue: 0.3,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [contentOpacity, contentScale, overlayGlow, overlayOpacity]);

  const handleDragEnd = useCallback(({ data }: { data: PlayerLike[] }) => {
    Haptics.selectionAsync().catch(() => {});
    setTurnOrder(data);
  }, []);

  const handleDragBegin = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const renderItem = useCallback(
    (params: RenderItemParams<PlayerLike>) => (
      <TurnOrderRow
        {...params}
        isStartingGame={isStarting}
      />
    ),
    [isStarting]
  );

  const startGame = useCallback(async () => {
    if (!canStart || isStarting) return;

    await playStartAnimation();

    startActiveGame({
      players: buildActiveGamePlayersFromTurnOrder(turnOrder),
      groupId: selectedGroup?.id,
      groupName: selectedGroup?.name,
    });

    setTimeout(() => {
      router.replace("/game");
    }, 520);
  }, [
    canStart,
    isStarting,
    playStartAnimation,
    router,
    selectedGroup?.id,
    selectedGroup?.name,
    startActiveGame,
    turnOrder,
  ]);

  return (
    <PageShell
      preset="tactical"
      scroll={false}
      edges={["top", "left", "right", "bottom"]}
      contentContainerStyle={styles.pageContent}
    >
      <Animated.View
        style={[
          styles.mainContentWrap,
          {
            opacity: contentOpacity,
            transform: [{ scale: contentScale }],
          },
        ]}
      >
        <AppHeader
          eyebrow="Moonrakers Command"
          title="Create Game"
          subtitle="Drag players into turn order. The top captain goes first."
          identity="emblem"
          size="compact"
        />

        <View style={styles.listShell}>
          <View style={styles.listHeader}>
            <Text variant="utilityLabel" style={styles.sectionLabel}>
              Turn Order
            </Text>
            <Text style={styles.listHint}>
              Hold a player card and drag it into place. The top card starts.
            </Text>
          </View>

          <Text style={styles.inlineOrderSummary}>{buildTurnOrderSummary(turnOrder)}</Text>

          <DraggableFlatList
            data={turnOrder}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            onDragBegin={handleDragBegin}
            onDragEnd={handleDragEnd}
            activationDistance={6}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.listEmptyState}>
                <Text style={styles.summaryEmptyText}>
                  No character cards are ready yet.
                </Text>
              </View>
            }
          />
        </View>

        <View style={styles.setupFooter}>
          <ActionButton
            title="Back"
            variant="ghost"
            onPress={goBack}
            disabled={isStarting}
            style={styles.setupFooterButton}
          />
          <ActionButton
            title={isStarting ? "Starting..." : "Start Game"}
            onPress={startGame}
            disabled={!canStart || isStarting}
            style={styles.setupFooterButton}
          />
        </View>
      </Animated.View>

      {isStarting ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.launchOverlay, { opacity: overlayOpacity }]}
        >
          <Animated.View
            style={[
              styles.launchGlow,
              {
                opacity: overlayGlow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.22, 0.92],
                }),
                transform: [
                  {
                    scale: overlayGlow.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1.08],
                    }),
                  },
                ],
              },
            ]}
          />
          <View style={styles.launchCard}>
            <ActivityIndicator size="small" color="#7DD3FC" />
            <Text style={styles.launchTitle}>Launching game</Text>
            <Text style={styles.launchSubtitle} numberOfLines={2}>
              {buildTurnOrderSummary(turnOrder)}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  pageContent: {
    flex: 1,
    paddingBottom: 16,
  },
  mainContentWrap: {
    flex: 1,
    minHeight: 0,
    gap: 12,
  },
  sectionLabel: {
    color: "#7DD3FC",
  },
  summaryCard: {
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "rgba(8, 13, 34, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.24)",
    shadowColor: "#38BDF8",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
    gap: 12,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  summaryHint: {
    flex: 1,
    textAlign: "right",
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "700",
  },
  startingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  startingBadge: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  startingBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  startingAvatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    overflow: "hidden",
  },
  startingCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  startingName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  startingMeta: {
    color: "#BFDBFE",
    fontSize: 12,
    fontWeight: "700",
  },
  summaryEmptyText: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "700",
  },
  summaryTextBlock: {
    gap: 6,
  },
  summaryTextLabel: {
    color: "#93C5FD",
  },
  summaryTextValue: {
    color: "#F8FAFC",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
  },
  nameStripBlock: {
    gap: 10,
  },
  nameStripHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  nameStripHint: {
    flex: 1,
    textAlign: "right",
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "700",
  },
  nameStripContent: {
    paddingRight: 10,
    gap: 10,
  },
  nameChip: {
    minWidth: 116,
    maxWidth: 168,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 5,
  },
  nameChipPressed: {
    transform: [{ scale: 0.98 }],
  },
  nameChipBadge: {
    alignSelf: "flex-start",
    minWidth: 26,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  nameChipBadgeText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "900",
  },
  nameChipBadgeTextActive: {
    color: "#020617",
  },
  nameChipText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "900",
  },
  nameChipMeta: {
    color: "#BFDBFE",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  listShell: {
    flex: 1,
    minHeight: 280,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: "rgba(8, 13, 34, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.22)",
    shadowColor: "#38BDF8",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
    gap: 12,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  listHint: {
    flex: 1,
    textAlign: "right",
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "700",
  },
  inlineOrderSummary: {
    color: "#E2E8F0",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  listEmptyState: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  rowPressable: {
    marginBottom: 10,
  },
  rowPressed: {
    opacity: 0.98,
  },
  rowCard: {
    minHeight: 210,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "stretch",
    gap: 10,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    overflow: "hidden",
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  rowOrderPill: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.48)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  rowOrderPillPrimary: {
    borderColor: "rgba(255,255,255,0.72)",
  },
  rowOrderPillText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  rowTapMeta: {
    flex: 1,
    textAlign: "right",
    color: "#BFDBFE",
    fontSize: 12,
    fontWeight: "800",
  },
  rowAvatarWrap: {
    alignSelf: "center",
    width: 108,
    height: 146,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    overflow: "hidden",
  },
  rowName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  rowMeta: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    textAlign: "center",
  },
  firstChip: {
    minWidth: 92,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  firstChipText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  dragHandleText: {
    color: "#93C5FD",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
    textAlign: "center",
    textTransform: "uppercase",
  },
  setupFooter: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 2,
  },
  setupFooterButton: {
    flex: 1,
  },
  launchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4, 8, 22, 0.54)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  launchGlow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: "rgba(125,211,252,0.16)",
  },
  launchCard: {
    minWidth: 240,
    maxWidth: 320,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(9, 14, 34, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.24)",
  },
  launchTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  launchSubtitle: {
    color: "#BAE6FD",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
});
