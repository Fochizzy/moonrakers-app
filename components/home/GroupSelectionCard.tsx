import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import Text from "@/components/ui/Text";
import { resolvePlayerInitials } from "@/utils/playerDisplayName";
import { SelectionShimmer } from "./SelectionShimmer";
import type { GroupLike, PlayerLike } from "./homeTypes";

export function GroupSelectionCard({
  group,
  selected,
  onPress,
  playersById,
}: {
  group: GroupLike;
  selected: boolean;
  onPress: () => void;
  playersById: Record<string, PlayerLike>;
}) {
  const visiblePlayers = group.playerIds
    .map((id) => playersById[id])
    .filter((player): player is PlayerLike => Boolean(player))
    .slice(0, 5);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.groupCardCompact,
        selected && styles.groupCardCompactActive,
        pressed && styles.pressScaleSm,
      ]}
    >
      <SelectionShimmer visible={selected} borderRadius={10} />

      <View style={styles.groupRowUltraCompact}>
        <Text style={styles.groupNameUltraCompact} numberOfLines={1}>
          {group.name}
        </Text>

        <View style={styles.groupInitialsRow}>
          <Text style={styles.groupInitialsText} numberOfLines={1} ellipsizeMode="tail">
            {visiblePlayers.map((p) => resolvePlayerInitials(p)).join(" ")}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  groupCardCompact: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "rgba(5,9,20,0.98)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.18)",
    overflow: "hidden",
  },
  groupCardCompactActive: {
    borderColor: "rgba(96,165,250,0.78)",
    backgroundColor: "rgba(96,165,250,0.08)",
    shadowColor: "#60A5FA",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  groupRowUltraCompact: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  groupNameUltraCompact: {
    flexShrink: 1,
    minWidth: 0,
    color: "#E9D5FF",
    fontSize: 11,
    fontWeight: "900",
    marginRight: 6,
  },
  groupInitialsRow: {
    flexShrink: 1,
    maxWidth: "50%",
    alignItems: "flex-end",
  },
  groupInitialsText: {
    color: "#60A5FA",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  pressScaleSm: {
    transform: [{ scale: 0.975 }],
  },
});
