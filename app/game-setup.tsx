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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ActionButton from "@/components/ui/ActionButton";
import AppHeader from "@/components/ui/AppHeader";
import PageShell from "@/components/ui/PageShell";
import Text from "@/components/ui/Text";
import PlayerCardIcon from "@/components/player/PlayerCardIcon";
import { useStore } from "@/store/useStore";
import { useSyncedGameDraft } from "@/lib/game-draft/useSyncedGameDraft";
import { APP_ROUTES } from "@/utils/appRoutes";
import {
  applyTurnOrderPlayerColorOverride,
  buildGameSetupDraftFromTurnOrder,
  buildGameSetupPlayersFromDraft,
  buildTurnOrderSummary,
  canSubmitGameSetup,
  type GameSetupTurnOrderPlayer,
} from "@/utils/gameSetupTurnOrder";
import type { CardColor } from "@/utils/cardAssignment";
import ProfileAppearancePicker from "@/components/player/ProfileAppearancePicker";
import { normalizePreferredProfileColor } from "@/utils/profileAppearance";
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

function withResolvedColors(players: PlayerLike[]): PlayerLike[] {
  return players.map((player, index) => ({
    ...player,
    color: resolveStoredPlayerColor(player.color, index),
  }));
}

function buildTurnOrderSignature(players: PlayerLike[]) {
  return players.map((player) => `${player.id}:${player.color ?? ""}`).join("|");
}

// The draggable list has to mount with its rows already present: a list that is
// first committed with empty data never re-measures its scroll content, which
// leaves the turn order unscrollable until something forces the cells to
// re-render. Remounting on roster membership keeps that guarantee when the
// draft or store hydrates after this screen is already on top.
function buildRosterMountKey(players: PlayerLike[]) {
  return players
    .map((player) => player.id)
    .sort()
    .join("|");
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
  const accent = startingPlayer ? getAccentColor(startingPlayer.color, 0) : "#7DD3FC";

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Text variant="utilityLabel" style={styles.sectionLabel}>
          First Captain
        </Text>
        <Text style={styles.summaryHint}>Set the first captain and lock the table order.</Text>
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.orderChipRail}
        >
          {players.map((p, index) => {
            const chipAccent = getAccentColor(p.color, index);
            return (
              <View
                key={p.id}
                style={[
                  styles.orderChip,
                  {
                    borderColor: `${chipAccent}66`,
                    backgroundColor: `${chipAccent}12`,
                  },
                ]}
              >
                <Text style={[styles.orderChipNum, { color: chipAccent }]}>
                  {index + 1}
                </Text>
                <Text style={styles.orderChipName} numberOfLines={1}>
                  {p.name ?? "?"}
                </Text>
              </View>
            );
          })}
        </ScrollView>
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
  getIndex,
  drag,
  isActive,
  isStartingGame,
  selectedPlayerId,
  onSelectPlayer,
}: RenderItemParams<PlayerLike> & {
  isStartingGame: boolean;
  selectedPlayerId: string | null;
  onSelectPlayer: (playerId: string) => void;
}) {
  const rowIndex = getIndex() ?? 0;
  const accent = getAccentColor(item.color, rowIndex);
  const displayName = resolveDisplayName(item, rowIndex);
  const isFirstCaptain = rowIndex === 0;
  const isSelected = item.id === selectedPlayerId;
  const isHighlighted = isActive || isSelected;

  return (
    <ScaleDecorator>
      <Pressable
        onPress={isStartingGame ? undefined : () => onSelectPlayer(item.id)}
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
              borderColor: isHighlighted ? accent : `${accent}4A`,
              backgroundColor: isActive
                ? darkenHex(accent, 0.68)
                : isSelected
                  ? darkenHex(accent, 0.74)
                : darkenHex(accent, 0.8),
              shadowColor: accent,
            },
          ]}
        >
          <View style={styles.rowHeader}>
            <View style={[styles.rowOrderPill, isFirstCaptain ? styles.rowOrderPillPrimary : null]}>
              <Text style={styles.rowOrderPillText}>{rowIndex + 1}</Text>
            </View>

            {isSelected ? (
              <View
                style={[
                  styles.firstChip,
                  {
                    borderColor: `${accent}AA`,
                    backgroundColor: `${accent}18`,
                  },
                ]}
              >
                <Text style={[styles.firstChipText, { color: accent }]}>Selected</Text>
              </View>
            ) : (
              <View style={styles.tapSelectChip}>
                <Text style={styles.tapSelectChipText}>Tap to select</Text>
              </View>
            )}
          </View>

          <View style={styles.rowBody}>
            <View style={[styles.rowAvatarWrap, { borderColor: `${accent}55` }]}>
              <PlayerCardIcon
                player={item as any}
                size={48}
                borderRadius={10}
                showInitial={false}
              />
            </View>

            <View style={styles.rowCopy}>
              <Text
                style={[
                  styles.rowName,
                  isFirstCaptain ? { color: accent } : null,
                ]}
                numberOfLines={1}
              >
                {displayName}
              </Text>

              <Text style={styles.rowMeta} numberOfLines={2}>
                {isSelected
                  ? "Change color from the top-right button."
                  : "Tap to select. Hold to drag."}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </ScaleDecorator>
  );
}

function GameOnlyColorOverlay({
  player,
  index,
  onClose,
  onSelectColor,
}: {
  player: PlayerLike;
  index: number;
  onClose: () => void;
  onSelectColor: (color: CardColor) => void;
}) {
  const accent = getAccentColor(player.color, index);

  return (
    <View style={styles.colorOverlay} pointerEvents="box-none">
      <Pressable style={styles.colorOverlayScrim} onPress={onClose} />

      <View
        style={[
          styles.colorOverlayCard,
          {
            borderColor: `${accent}66`,
            shadowColor: accent,
          },
        ]}
      >
        <View style={styles.colorOverlayHeader}>
          <View style={styles.colorOverlayTitleBlock}>
            <Text variant="utilityLabel" style={styles.colorOverlayEyebrow}>
              Selected Captain
            </Text>
            <Text style={styles.colorOverlayName}>{resolveDisplayName(player, index)}</Text>
          </View>

          <ActionButton
            title="Close"
            variant="ghost"
            onPress={onClose}
            style={styles.colorOverlayCloseButton}
          />
        </View>

        <ProfileAppearancePicker
          title="Game-only color"
          subtitle="Changes this session only. Saved player colors stay the same."
          favoriteColor={normalizePreferredProfileColor(player.color)}
          onSelectFavoriteColor={onSelectColor}
          autoAssignHint="Pick a different color for this game only."
        />
      </View>
    </View>
  );
}

export default function GameSetup() {
  const router = useRouter();
  const params = useLocalSearchParams<SetupParams>();
  const insets = useSafeAreaInsets();
  const storedPlayers = useStore((state) => state.players ?? []);
  const storedGroups = useStore((state) => state.groups ?? []);
  const { gameDraft, replaceDraft, beginGameplay } = useSyncedGameDraft();

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
    gameDraft?.selectedGroupId || modeParam === "group" || selectedGroups.length > 0
      ? "group"
      : "players";

  const selectedGroup =
    mode === "group"
      ? (storedGroups.find((group: any) => group.id === gameDraft?.selectedGroupId) as GroupLike) ??
        selectedGroups[0] ??
        null
      : null;

  const resolvedPlayers = useMemo(() => {
    const availablePlayers = Array.isArray(storedPlayers) && storedPlayers.length
      ? (storedPlayers as PlayerLike[])
      : allPlayers;

    const draftPlayerIds =
      gameDraft?.turnOrder?.length
        ? gameDraft.turnOrder
        : gameDraft?.selectedPlayerIds ?? [];

    if (draftPlayerIds.length > 0) {
      return buildGameSetupPlayersFromDraft({
        availablePlayers,
        orderedPlayerIds: draftPlayerIds,
        playerSnapshots: gameDraft?.playerSnapshots ?? [],
      });
    }

    const playerMap = new Map(availablePlayers.map((player) => [player.id, player]));

    if (mode === "players") return selectedPlayers;

    if (!selectedGroup?.playerIds?.length) return [];

    return selectedGroup.playerIds
      .map((playerId) => playerMap.get(playerId))
      .filter(Boolean) as PlayerLike[];
  }, [allPlayers, gameDraft, mode, selectedGroup, selectedPlayers, storedPlayers]);

  const [turnOrder, setTurnOrder] = useState<PlayerLike[]>(() =>
    withResolvedColors(resolvedPlayers)
  );
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const overlayGlow = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const nextTurnOrder = withResolvedColors(resolvedPlayers);

    // Draft saves echo the same roster straight back through the store, so only
    // replace local state when the players or their game colors actually moved.
    setTurnOrder((current) =>
      buildTurnOrderSignature(current) === buildTurnOrderSignature(nextTurnOrder)
        ? current
        : nextTurnOrder
    );
    setSelectedPlayerId((current) =>
      current && nextTurnOrder.some((player) => player.id === current) ? current : null
    );
    setIsColorPickerOpen(false);
  }, [resolvedPlayers]);

  const canStart = canSubmitGameSetup(turnOrder);

  const startGameSubtitle = useMemo(() => {
    const count = turnOrder.filter((p) => String(p?.id ?? "").trim().length > 0).length;
    if (count === 0) return "Select 2–5 players to begin.";
    if (count === 1) return "Add at least 1 more player (2–5 required).";
    if (count > 5) return "Too many players — remove some (max 5).";
    return buildTurnOrderSummary(turnOrder);
  }, [turnOrder]);
  const selectedPlayerIndex = useMemo(
    () => turnOrder.findIndex((player) => player.id === selectedPlayerId),
    [selectedPlayerId, turnOrder]
  );
  const selectedPlayer =
    selectedPlayerIndex >= 0 ? turnOrder[selectedPlayerIndex] ?? null : null;
  const turnOrderListBottomInset = Math.max(insets.bottom, 14) + 8;
  const turnOrderListMountKey = useMemo(
    () => buildRosterMountKey(turnOrder),
    [turnOrder]
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

  const handleDragEnd = useCallback(({ data }: { data: PlayerLike[] }) => {
    Haptics.selectionAsync().catch(() => {});
    setTurnOrder(data);
    if (!gameDraft) {
      return;
    }

    void replaceDraft(
      buildGameSetupDraftFromTurnOrder({
        draft: gameDraft,
        players: data,
      })
    );
  }, [gameDraft, replaceDraft]);

  const handleDragBegin = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const handleSelectPlayer = useCallback((playerId: string) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedPlayerId(playerId);
  }, []);

  const openColorPicker = useCallback(() => {
    if (!selectedPlayer || isStarting) return;
    Haptics.selectionAsync().catch(() => {});
    setIsColorPickerOpen(true);
  }, [isStarting, selectedPlayer]);

  const closeColorPicker = useCallback(() => {
    setIsColorPickerOpen(false);
  }, []);

  const handleSelectGameColor = useCallback((nextColor: CardColor) => {
    if (!selectedPlayerId) return;
    const nextPlayers = applyTurnOrderPlayerColorOverride(
      turnOrder,
      selectedPlayerId,
      nextColor
    );

    setTurnOrder(nextPlayers);
    if (gameDraft) {
      void replaceDraft(
        buildGameSetupDraftFromTurnOrder({
          draft: gameDraft,
          players: nextPlayers,
        })
      );
    }
    Haptics.selectionAsync().catch(() => {});
    setIsColorPickerOpen(false);
  }, [gameDraft, replaceDraft, selectedPlayerId, turnOrder]);

  const renderItem = useCallback(
    (params: RenderItemParams<PlayerLike>) => (
      <TurnOrderRow
        {...params}
        isStartingGame={isStarting}
        selectedPlayerId={selectedPlayerId}
        onSelectPlayer={handleSelectPlayer}
      />
    ),
    [handleSelectPlayer, isStarting, selectedPlayerId]
  );

  const startGame = useCallback(async () => {
    if (!canStart || isStarting) return;

    await playStartAnimation();
    await beginGameplay();

    setTimeout(() => {
      router.push(APP_ROUTES.game as any);
    }, 520);
  }, [
    beginGameplay,
    canStart,
    isStarting,
    playStartAnimation,
    router,
  ]);

  return (
    <PageShell
      preset="tactical"
      scroll={false}
      edges={["top", "left", "right", "bottom"]}
      contentContainerStyle={styles.pageContent}
      >
        <AppHeader title="Create Game" size="compact" />
        <Animated.View
          style={[
            styles.mainContentWrap,
          {
            opacity: contentOpacity,
            transform: [{ scale: contentScale }],
          },
        ]}
      >
        <View style={styles.topActionRow}>
          <ActionButton
            title="Start Game"
            subtitle={buildTurnOrderSummary(turnOrder)}
            onPress={startGame}
            disabled={!canStart || isStarting}
            style={styles.topActionButton}
          />
        </View>

        <View style={styles.listShell}>
          <View style={styles.listHeader}>
            <View style={styles.listHeaderCopy}>
              <Text variant="utilityLabel" style={styles.sectionLabel}>
                Turn Order
              </Text>
              <Text style={styles.listHint}>
                Tap a Player to Change Color, Drag to Reorder
              </Text>
            </View>

            <ActionButton
              title="Change Color"
              subtitle={
                selectedPlayer
                  ? resolveDisplayName(selectedPlayer, selectedPlayerIndex)
                  : "Select a player"
              }
              onPress={openColorPicker}
              disabled={!selectedPlayer || isStarting}
              variant="secondary"
              style={styles.colorActionButton}
            />
          </View>

          <DraggableFlatList
            key={turnOrderListMountKey}
            data={turnOrder}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            onDragBegin={handleDragBegin}
            onDragEnd={handleDragEnd}
            activationDistance={6}
            containerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContent,
              {
                paddingBottom: turnOrderListBottomInset,
              },
            ]}
            ListEmptyComponent={<View style={styles.listEmptyState} />}
          />
        </View>
      </Animated.View>

      {isColorPickerOpen && selectedPlayer ? (
        <GameOnlyColorOverlay
          player={selectedPlayer}
          index={selectedPlayerIndex}
          onClose={closeColorPicker}
          onSelectColor={handleSelectGameColor}
        />
      ) : null}

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
          </View>
        </Animated.View>
      ) : null}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  pageContent: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 32,
  },
  mainContentWrap: {
    flex: 1,
    minHeight: 0,
    gap: 12,
  },
  topActionRow: {
    paddingTop: 0,
  },
  topActionButton: {
    width: "100%",
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
    paddingTop: 12,
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  listHeaderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  listHint: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  colorActionButton: {
    minWidth: 154,
    alignSelf: "flex-start",
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
  },
  listEmptyState: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  rowPressable: {
    marginBottom: 6,
  },
  rowPressed: {
    opacity: 0.98,
  },
  rowCard: {
    minHeight: 92,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "stretch",
    justifyContent: "center",
    gap: 6,
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
    width: "100%",
    gap: 8,
  },
  rowOrderPill: {
    width: 22,
    height: 22,
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
    fontSize: 11,
    fontWeight: "900",
  },
  rowAvatarWrap: {
    width: 58,
    height: 74,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    overflow: "hidden",
  },
  rowBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    justifyContent: "center",
  },
  rowName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "left",
  },
  rowMeta: {
    color: "#CBD5E1",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
    textAlign: "left",
  },
  firstChip: {
    minWidth: 76,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  firstChipText: {
    fontSize: 9,
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
  colorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 24,
    zIndex: 20,
  },
  colorOverlayScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3, 8, 22, 0.78)",
  },
  colorOverlayCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    backgroundColor: "rgba(8, 13, 34, 0.98)",
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
    gap: 14,
  },
  colorOverlayHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  colorOverlayTitleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  colorOverlayEyebrow: {
    color: "#7DD3FC",
  },
  colorOverlayName: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
  },
  colorOverlayCloseButton: {
    alignSelf: "flex-start",
  },
  tapSelectChip: {
    minWidth: 76,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  tapSelectChipText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
    color: "#94A3B8",
  },
  orderChipRail: {
    gap: 6,
    paddingRight: 4,
  },
  orderChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  orderChipNum: {
    fontSize: 10,
    fontWeight: "900",
  },
  orderChipName: {
    color: "#F8FAFC",
    fontSize: 11,
    fontWeight: "800",
    maxWidth: 72,
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
    width: 96,
    height: 96,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
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
