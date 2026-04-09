import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import StarryNight from "@/components/ui/StarryNight";
import Text from "@/components/ui/Text";
import PlayerCardIcon from "@/components/player/PlayerCardIcon";
import { buttonSystem } from "@/utils/buttonSystem";
import { useStore } from "@/store/useStore";
import { resolveStoredPlayerColor } from "@/utils/playerColor";
import { getPlayerAccentColor } from "@/utils/turnTheme";

type PlayerLike = {
  id: string;
  name?: string;
  color?: string;
  initials?: string;
  assignedCardArtIndex?: number | null;
  artIndex?: number | null;
};

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

function initialsFromName(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to) return list;
  if (from < 0 || to < 0 || from >= list.length || to >= list.length) return list;

  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function animateLayout() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

function getAccentColor(color?: string, index = 0) {
  return getPlayerAccentColor(resolveStoredPlayerColor(color, index));
}

function darkenHex(hex?: string, amount = 0.45) {
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

function TurnOrderMiniRow({ players }: { players: PlayerLike[] }) {
  if (!players.length) return null;

  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>Turn Order</Text>

      <View style={styles.miniOrderWrap}>
        {players.map((player, index) => {
          const accent = getAccentColor(player.color, index);
          const artIndex =
            player.assignedCardArtIndex ?? player.artIndex ?? undefined;

          return (
            <React.Fragment key={player.id}>
              <View
                style={[
                  styles.miniOrderItem,
                  {
                    borderColor: `${accent}55`,
                    backgroundColor: darkenHex(accent, 0.72),
                    shadowColor: accent,
                  },
                  index === 0 && styles.miniOrderItemFirst,
                ]}
              >
                <View style={styles.miniOrderBadge}>
                  <Text style={styles.miniOrderBadgeText}>{index + 1}</Text>
                </View>

                <View style={styles.miniAvatarWrap}>
                  <PlayerCardIcon
                    player={player as any}
                    color={accent}
                    artIndex={artIndex}
                    size={34}
                  />
                </View>

                <Text style={styles.miniOrderName} numberOfLines={1}>
                  {player.name || initialsFromName(player.name)}
                </Text>
              </View>

              {index < players.length - 1 ? (
                <Text style={styles.miniOrderArrow}>?</Text>
              ) : null}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

function BottomPlayerCard({
  player,
  index,
  onMoveLeft,
  onMoveRight,
  isLeftDisabled,
  isRightDisabled,
  isStarting,
}: {
  player: PlayerLike;
  index: number;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  isLeftDisabled: boolean;
  isRightDisabled: boolean;
  isStarting: boolean;
}) {
  const accent = getAccentColor(player.color, index);
  const artIndex = player.assignedCardArtIndex ?? player.artIndex ?? undefined;
  const displayName = player.name || initialsFromName(player.name);

  return (
    <View
      style={[
        styles.bottomCard,
        {
          borderColor: `${accent}80`,
          shadowColor: accent,
        },
      ]}
    >
      <View style={[styles.bottomCardTopGlow, { backgroundColor: `${accent}15` }]} />
      <View style={[styles.bottomCardAccentLine, { backgroundColor: accent }]} />

      <View style={styles.orderBadge}>
        <Text style={styles.orderBadgeText}>{index + 1}</Text>
      </View>

      <View style={styles.bottomArtFrame}>
        <View style={styles.bottomArtInner}>
          <PlayerCardIcon
            player={player as any}
            color={accent}
            artIndex={artIndex}
            size={104}
          />
        </View>
      </View>

      <View style={styles.bottomNamePlate}>
        <Text style={styles.bottomName} numberOfLines={1}>
          {displayName}
        </Text>
      </View>

      <View style={styles.integratedArrowRail}>
        <Pressable
          onPress={onMoveLeft}
          disabled={isLeftDisabled || isStarting}
          style={[
            styles.integratedArrowButton,
            styles.integratedArrowButtonLeft,
            (isLeftDisabled || isStarting) && styles.arrowButtonDisabled,
          ]}
        >
          <Text style={styles.integratedArrowText}>�</Text>
        </Pressable>

        <View style={styles.arrowRailCenter}>
          <Text style={styles.arrowRailCenterText}>Move</Text>
        </View>

        <Pressable
          onPress={onMoveRight}
          disabled={isRightDisabled || isStarting}
          style={[
            styles.integratedArrowButton,
            styles.integratedArrowButtonRight,
            (isRightDisabled || isStarting) && styles.arrowButtonDisabled,
          ]}
        >
          <Text style={styles.integratedArrowText}>�</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function GameSetup() {
  const router = useRouter();
  const params = useLocalSearchParams<SetupParams>();
  const startActiveGame = useStore((s) => s.startActiveGame);

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

  const playerCount = turnOrder.length;
  const canStart = playerCount >= 2 && playerCount <= 5;

  const goBack = useCallback(() => {
    if (isStarting) return;
    router.back();
  }, [isStarting, router]);

  const moveLeft = useCallback(
    (index: number) => {
      if (index <= 0 || isStarting) return;
      animateLayout();
      Haptics.selectionAsync().catch(() => {});
      setTurnOrder((current) => moveItem(current, index, index - 1));
    },
    [isStarting]
  );

  const moveRight = useCallback(
    (index: number) => {
      if (index >= turnOrder.length - 1 || isStarting) return;
      animateLayout();
      Haptics.selectionAsync().catch(() => {});
      setTurnOrder((current) => moveItem(current, index, index + 1));
    },
    [isStarting, turnOrder.length]
  );

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

  const startGame = useCallback(async () => {
    if (!canStart || isStarting) return;

    await playStartAnimation();

    startActiveGame({
      players: turnOrder.map((player, index) => ({
        id: player.id,
        name: player.name ?? `Player ${index + 1}`,
        initials: player.initials ?? initialsFromName(player.name),
        color: resolveStoredPlayerColor(player.color, index),
        assignedCardArtIndex: player.assignedCardArtIndex ?? null,
        startOrder: index,
      })),
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
    <View style={styles.screen}>
      <StarryNight />
      <View style={styles.scrim} />
      <View style={styles.topGlow} />

      <Animated.View
        style={[
          styles.mainContentWrap,
          {
            opacity: contentOpacity,
            transform: [{ scale: contentScale }],
          },
        ]}
      >
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.moonDot} />
              <Text style={styles.title}>Game Setup</Text>
            </View>
            <Text style={styles.subtitle}>
              {playerCount} Player{playerCount === 1 ? "" : "s"} Selected � Set Turn Order
            </Text>
          </View>

          <View style={styles.centerSection}>
            <TurnOrderMiniRow players={turnOrder} />
          </View>

          <View style={styles.bottomRailWrap}>
            <View style={styles.bottomRailHeader}>
              <Text style={styles.sectionLabel}>Order Players</Text>
              <Text style={styles.bottomRailHint}>Premium card controls</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bottomRailContent}
              style={styles.bottomRailScroll}
            >
              {turnOrder.map((player, index) => (
                <BottomPlayerCard
                  key={player.id}
                  player={player}
                  index={index}
                  onMoveLeft={() => moveLeft(index)}
                  onMoveRight={() => moveRight(index)}
                  isLeftDisabled={index === 0}
                  isRightDisabled={index === turnOrder.length - 1}
                  isStarting={isStarting}
                />
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Animated.View>

      <View pointerEvents="box-none" style={styles.floatingFooterWrap}>
        <View style={styles.floatingFooter}>
          <Pressable
            onPress={goBack}
            disabled={isStarting}
            style={[
              styles.floatingButton,
              styles.floatingSecondaryButton,
              isStarting && styles.disabledDim,
            ]}
          >
            <Text style={styles.floatingSecondaryButtonText}>Back</Text>
          </Pressable>

          <Pressable
            onPress={startGame}
            disabled={!canStart || isStarting}
            style={[
              styles.floatingButton,
              styles.floatingPrimaryButton,
              canStart
                ? styles.floatingPrimaryButtonEnabled
                : styles.floatingPrimaryButtonDisabled,
              isStarting && styles.startingButton,
            ]}
          >
            <Text
              style={[
                styles.floatingPrimaryButtonText,
                canStart && styles.floatingPrimaryButtonTextEnabled,
              ]}
            >
              {isStarting ? "Starting..." : "Start"}
            </Text>
          </Pressable>
        </View>
      </View>

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
              {turnOrder.map((p) => p.name || "Unnamed").join("  ?  ")}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#03060F",
  },
  safeArea: {
    flex: 1,
  },
  mainContentWrap: {
    flex: 1,
    minHeight: 0,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 16, 0.56)",
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: "rgba(56,189,248,0.05)",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 6,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  moonDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#38BDF8",
    shadowColor: "#38BDF8",
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  title: {
    color: "#A855F7",
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
    textShadowColor: "rgba(168,85,247,0.3)",
    textShadowRadius: 14,
  },
  subtitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
  },
  centerSection: {
    paddingHorizontal: 20,
    paddingBottom: 8,
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
  },
  summaryLabel: {
    color: "#7DD3FC",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  miniOrderWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    rowGap: 8,
    columnGap: 6,
  },
  miniOrderItem: {
    minWidth: 88,
    maxWidth: 124,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 16,
    borderWidth: 1,
    paddingLeft: 6,
    paddingRight: 8,
    paddingVertical: 6,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  miniOrderItemFirst: {
    borderColor: "rgba(255,255,255,0.85)",
  },
  miniOrderBadge: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  miniOrderBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  miniAvatarWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  miniOrderName: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  miniOrderArrow: {
    color: "#7DD3FC",
    fontSize: 14,
    fontWeight: "900",
    marginHorizontal: 2,
  },
  bottomRailWrap: {
    flex: 1,
    minHeight: 0,
    paddingTop: 10,
    paddingBottom: 0,
  },
  bottomRailHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: {
    color: "#7DD3FC",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  bottomRailHint: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "700",
  },
  bottomRailScroll: {
    flexGrow: 0,
  },
  bottomRailContent: {
    paddingHorizontal: 20,
    gap: 14,
    paddingBottom: 116,
    alignItems: "flex-start",
  },
  bottomCard: {
    width: 170,
    borderRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderWidth: 1.4,
    backgroundColor: "#0A1020",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    position: "relative",
    overflow: "hidden",
    marginBottom: 8,
  },
  bottomCardTopGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 72,
  },
  bottomCardAccentLine: {
    position: "absolute",
    top: 0,
    left: 18,
    right: 18,
    height: 3,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
  },
  orderBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 3,
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  orderBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  bottomArtFrame: {
    marginTop: 10,
    marginBottom: 12,
    borderRadius: 22,
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  bottomArtInner: {
    borderRadius: 18,
    minHeight: 132,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.24)",
  },
  bottomNamePlate: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.46)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 12,
    minHeight: 46,
    justifyContent: "center",
  },
  bottomName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  integratedArrowRail: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  integratedArrowButton: {
    width: 48,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  integratedArrowButtonLeft: {
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.10)",
  },
  integratedArrowButtonRight: {
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.10)",
  },
  arrowRailCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 42,
  },
  arrowRailCenterText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  integratedArrowText: {
    color: "#FFFFFF",
    fontSize: 26,
    lineHeight: 26,
    fontWeight: "900",
  },
  arrowButtonDisabled: {
    opacity: 0.3,
  },

  floatingFooterWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 18,
    paddingHorizontal: 20,
  },
  floatingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    alignSelf: "center",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(5, 10, 24, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.16)",
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  floatingButton: {
    minWidth: 96,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    ...buttonSystem.shadow,
  },
  floatingSecondaryButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  floatingSecondaryButtonText: {
    color: "#F5F3FF",
    fontSize: 13,
    fontWeight: "800",
  },
  floatingPrimaryButton: {
    borderWidth: 1,
  },
  floatingPrimaryButtonEnabled: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  floatingPrimaryButtonDisabled: {
    backgroundColor: "rgba(196,181,253,0.18)",
    borderColor: "rgba(196,181,253,0.24)",
  },
  floatingPrimaryButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "rgba(255,255,255,0.58)",
    textAlign: "center",
  },
  floatingPrimaryButtonTextEnabled: {
    color: "#24123A",
  },

  startingButton: {
    shadowColor: "#7DD3FC",
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  disabledDim: {
    opacity: 0.45,
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
