import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import PlayerCardIcon from "@/components/player/PlayerCardIcon";
import Text from "@/components/ui/Text";
import { resolvePlayerDisplayName } from "@/utils/playerDisplayName";
import { getPlayerAccentColor } from "@/utils/turnTheme";
import { SelectionShimmer } from "./SelectionShimmer";
import type { PlayerLike } from "./homeTypes";

export function PlayerSelectionCard({
  player,
  selected,
  dimmed,
  locked,
  onPress,
  onLongPress,
  showInitial = false,
}: {
  player: PlayerLike;
  selected: boolean;
  dimmed: boolean;
  locked: boolean;
  onPress: () => void;
  onLongPress: () => void;
  showInitial?: boolean;
}) {
  const accent = getPlayerAccentColor(player.color);

  return (
    <Pressable
      onPress={locked ? undefined : onPress}
      onLongPress={locked ? undefined : onLongPress}
      delayLongPress={250}
      style={({ pressed }) => [
        styles.playerListItemCompact,
        { borderColor: `${accent}88` },
        selected && [
          styles.playerListItemCompactSelected,
          {
            borderColor: accent,
            shadowColor: accent,
            backgroundColor: `${accent}14`,
            transform: [{ scale: 1.04 }],
          },
        ],
        dimmed && styles.playerListItemDimmed,
        locked && styles.playerListItemLocked,
        pressed && !locked && styles.pressScaleSm,
      ]}
    >
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: accent,
        }}
      />
      <SelectionShimmer visible={selected} borderRadius={10} />

      <View style={styles.playerCompactInner}>
        <View style={styles.playerCompactCopy}>
          <Text
            style={[
              styles.playerCompactName,
              selected && { color: accent },
              locked && styles.lockedText,
            ]}
            numberOfLines={1}
          >
            {resolvePlayerDisplayName(player)}
          </Text>
        </View>

        <PlayerCardIcon
          player={player}
          size={58}
          borderRadius={12}
          showInitial={showInitial}
        />
      </View>

      {locked ? (
        <View style={styles.lockBadge}>
          <Text style={styles.lockBadgeText}>FULL</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  playerListItemCompact: {
    width: "48.5%",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "rgba(9,14,28,0.96)",
    borderWidth: 1,
    overflow: "hidden",
    minHeight: 96,
  },
  playerListItemCompactSelected: {
    shadowOpacity: 0.34,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  playerListItemDimmed: {
    opacity: 0.42,
  },
  playerListItemLocked: {
    opacity: 0.36,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  playerCompactInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  playerCompactCopy: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  playerCompactName: {
    color: "#EAF2FF",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "left",
    width: "100%",
  },
  lockedText: {
    color: "#94A3B8",
  },
  lockBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    borderRadius: 999,
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.22)",
  },
  lockBadgeText: {
    color: "#94A3B8",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  pressScaleSm: {
    transform: [{ scale: 0.975 }],
  },
});
