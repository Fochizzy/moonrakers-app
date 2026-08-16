import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ScreenBackground from "@/components/ui/ScreenBackground";
import Text from "@/components/ui/Text";
import { useSyncedGameDraft } from "@/lib/game-draft/useSyncedGameDraft";
import { useActiveGame } from "@/store/useStore";
import { APP_ROUTES } from "@/utils/appRoutes";
import {
  hasHeadToHeadSelection,
  sanitizeHeadToHeadSelection,
} from "@/utils/headToHeadMission";

const UI = {
  background: "#071016",
  card: "rgba(9, 14, 24, 0.94)",
  border: "rgba(45, 212, 191, 0.28)",
  borderStrong: "rgba(45, 212, 191, 0.58)",
  text: "#ffffff",
  textMuted: "rgba(255,255,255,0.68)",
  accent: "#2dd4bf",
  accentSoft: "rgba(45, 212, 191, 0.14)",
  danger: "#ef4444",
} as const;

const EMPTY_CURRENT_STATE = {
  prestige: 0,
  contracts: 0,
  failures: 0,
  assistRecipients: {},
  assistPrestigeRecipients: {},
  objectiveCount: 0,
  headToHeadFirstPlaceId: null as string | null,
  headToHeadSecondPlaceId: null as string | null,
} as const;

type MissionPlayer = {
  id: string;
  name?: string;
};

function PlayerOption({
  player,
  selected,
  disabled,
  onPress,
}: {
  player: MissionPlayer;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.playerOption,
        selected && styles.playerOptionSelected,
        disabled && styles.playerOptionDisabled,
      ]}
    >
      <Text style={[styles.playerOptionText, disabled && styles.playerOptionTextDisabled]}>
        {player.name ?? "Unknown Player"}
      </Text>
    </Pressable>
  );
}

export default function HeadToHeadMissionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const activeGame = useActiveGame();
  const { updateGameplay } = useSyncedGameDraft();

  const players = useMemo<MissionPlayer[]>(
    () =>
      Array.isArray(activeGame?.players)
        ? activeGame.players.map((player) => ({
            id: String(player?.id ?? "").trim(),
            name: String(player?.name ?? "").trim() || "Player",
          }))
        : [],
    [activeGame?.players],
  );

  const current = activeGame?.current ?? EMPTY_CURRENT_STATE;
  const [firstPlaceId, setFirstPlaceId] = useState(
    String(current?.headToHeadFirstPlaceId ?? "").trim(),
  );
  const [secondPlaceId, setSecondPlaceId] = useState(
    String(current?.headToHeadSecondPlaceId ?? "").trim(),
  );
  const selectionReady = hasHeadToHeadSelection({
    headToHeadFirstPlaceId: firstPlaceId,
    headToHeadSecondPlaceId: secondPlaceId,
  });

  async function persistSelection(nextFirstPlaceId: string | null, nextSecondPlaceId: string | null) {
    if (!activeGame) {
      router.replace(APP_ROUTES.game);
      return;
    }

    const nextSelection = sanitizeHeadToHeadSelection(
      nextFirstPlaceId,
      nextSecondPlaceId,
    );
    const nextGameplay = {
      turnIndex: activeGame.turnIndex,
      rounds: activeGame.rounds ?? [],
      totals: activeGame.totals ?? {},
      current: {
        ...EMPTY_CURRENT_STATE,
        ...current,
        headToHeadFirstPlaceId: nextSelection.firstPlaceId,
        headToHeadSecondPlaceId: nextSelection.secondPlaceId,
      },
      roundCount: activeGame.roundCount ?? (activeGame.rounds ?? []).length,
      selectedWinnerId: activeGame.selectedWinnerId ?? null,
    };

    // The draft is the only durable home for this selection; activeGame is a
    // pure projection of it, refreshed synchronously by updateGameplay. Patching
    // activeGame directly would be overwritten by that projection, and would be
    // silently lost on the next hydration if the draft write never happened.
    const savedDraft = await updateGameplay(nextGameplay, "in_progress");

    if (!savedDraft) {
      Alert.alert(
        "Couldn't save placements",
        "This game is no longer open for edits, so the mission placements were not saved.",
      );
      return;
    }

    router.back();
  }

  async function applySelection() {
    const nextSelection = sanitizeHeadToHeadSelection(firstPlaceId, secondPlaceId);
    if (!nextSelection.firstPlaceId || !nextSelection.secondPlaceId) {
      Alert.alert(
        "Select both placements",
        "Choose a distinct 1st-place and 2nd-place player before applying the mission.",
      );
      return;
    }

    await persistSelection(nextSelection.firstPlaceId, nextSelection.secondPlaceId);
  }

  async function clearSelection() {
    setFirstPlaceId("");
    setSecondPlaceId("");
    await persistSelection(null, null);
  }

  if (!activeGame || players.length < 2) {
    return (
      <View style={styles.screen}>
        <ScreenBackground preset="tactical" />
        <View style={[styles.emptyState, { paddingTop: insets.top + 24 }]}>
          <Text style={styles.title}>No active game</Text>
          <Text style={styles.subtitle}>
            Start a tracked game before setting a head-to-head mission.
          </Text>
          <Pressable onPress={() => router.replace(APP_ROUTES.game)} style={styles.primaryAction}>
            <Text style={styles.primaryActionText}>Back to Game</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenBackground preset="tactical" />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 14,
          paddingBottom: Math.max(insets.bottom, 14) + 14,
          paddingHorizontal: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Mission Bonus</Text>
          <Text style={styles.title}>Head to Head Mission</Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Choose 1st Player</Text>
            <Text style={styles.sectionMeta}>1 Direct Prestige</Text>
          </View>
          <View style={styles.optionStack}>
            {players.map((player) => (
              <PlayerOption
                key={`first-${player.id}`}
                player={player}
                selected={player.id === firstPlaceId}
                disabled={false}
                onPress={() => {
                  setFirstPlaceId(player.id);
                  if (secondPlaceId === player.id) {
                    setSecondPlaceId("");
                  }
                }}
              />
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Choose 2nd Place</Text>
          <View style={styles.optionStack}>
            {players.map((player) => {
              const disabled = player.id === firstPlaceId;
              return (
                <PlayerOption
                  key={`second-${player.id}`}
                  player={player}
                  selected={player.id === secondPlaceId}
                  disabled={disabled}
                  onPress={() => setSecondPlaceId(player.id)}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable onPress={() => router.back()} style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={clearSelection} style={styles.clearAction}>
            <Text style={styles.clearActionText}>Clear</Text>
          </Pressable>
        </View>

        <Pressable
          disabled={!selectionReady}
          onPress={applySelection}
          style={[styles.primaryAction, !selectionReady && styles.primaryActionDisabled]}
        >
          <Text style={styles.primaryActionText}>Save</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: UI.background,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 14,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.card,
    padding: 14,
    gap: 4,
    marginBottom: 8,
  },
  eyebrow: {
    color: UI.accent,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  title: {
    color: UI.text,
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    color: UI.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.card,
    padding: 12,
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    color: UI.text,
    fontSize: 16,
    fontWeight: "800",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionMeta: {
    color: UI.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },
  optionStack: {
    gap: 6,
  },
  playerOption: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  playerOptionSelected: {
    borderColor: UI.borderStrong,
    backgroundColor: UI.accentSoft,
  },
  playerOptionDisabled: {
    opacity: 0.42,
  },
  playerOptionText: {
    color: UI.text,
    fontSize: 15,
    fontWeight: "700",
  },
  playerOptionTextDisabled: {
    color: UI.textMuted,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  secondaryAction: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    color: UI.text,
    fontSize: 15,
    fontWeight: "700",
  },
  clearAction: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.32)",
    backgroundColor: "rgba(239,68,68,0.08)",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  clearActionText: {
    color: "#fecaca",
    fontSize: 15,
    fontWeight: "700",
  },
  primaryAction: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.borderStrong,
    backgroundColor: UI.accentSoft,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionDisabled: {
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    opacity: 0.6,
  },
  primaryActionText: {
    color: UI.text,
    fontSize: 16,
    fontWeight: "800",
  },
});
