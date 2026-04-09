import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { useStore } from "@/store/useStore";
import StarryNight from "@/components/ui/StarryNight";


function getPlayerInitials(name?: string) {
  const safe = (name ?? "").trim();
  if (!safe) return "?";

  const parts = safe.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return (parts[0][0] + parts[1][0]).toUpperCase();
}
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
  blue: "#3B82F6",
  blueSoft: "rgba(59,130,246,0.18)",
  red: "#EF4444",
  redSoft: "rgba(239,68,68,0.16)",
  border: "rgba(255,255,255,0.08)",
  whiteSoft: "rgba(255,255,255,0.06)",
};

type PlayerLike = {
  id: string;
  name: string;
  color?: string;
};

type GroupLike = {
  id: string;
  name: string;
  playerIds?: string[];
  createdAt?: number;
};

function getPlayerColor(color?: string) {
  switch ((color ?? "").toLowerCase()) {
    case "green":
      return "#22C55E";
    case "purple":
      return "#A855F7";
    case "blue":
      return "#3B82F6";
    case "orange":
      return "#F97316";
    case "yellow":
      return "#EAB308";
    case "red":
      return "#EF4444";
    case "pink":
      return "#EC4899";
    default:
      return "#94A3B8";
  }
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export default function ManagePlayersGroupsScreen() {
  const router = useRouter();

  const players = useStore((s: any) => (Array.isArray(s.players) ? s.players : [])) as PlayerLike[];
  const groups = useStore((s: any) => (Array.isArray(s.groups) ? s.groups : [])) as GroupLike[];

  const addPlayer = useStore((s: any) => s.addPlayer);
  const removePlayer = useStore((s: any) => s.removePlayer);
  const addGroup = useStore((s: any) => s.addGroup);
  const removeGroup = useStore((s: any) => s.removeGroup);

  const [playerName, setPlayerName] = useState("");
  const [playerColor, setPlayerColor] = useState("purple");

  const [groupName, setGroupName] = useState("");
  const [draftGroupPlayerIds, setDraftGroupPlayerIds] = useState<string[]>([]);

  const orderedPlayers = useMemo(() => {
    return [...players].sort((a, b) => a.name.localeCompare(b.name));
  }, [players]);

  const orderedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      const aTime = typeof a.createdAt === "number" ? a.createdAt : 0;
      const bTime = typeof b.createdAt === "number" ? b.createdAt : 0;
      return bTime - aTime;
    });
  }, [groups]);

  const toggleDraftPlayer = (playerId: string) => {
    setDraftGroupPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId]
    );
  };

  const handleAddPlayer = () => {
    const name = normalizeName(playerName);

    if (!name) {
      Alert.alert("Missing player name", "Enter a player name first.");
      return;
    }

    if (typeof addPlayer !== "function") {
      Alert.alert("Store error", "addPlayer is not available in the store.");
      return;
    }

    addPlayer({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      initials: getPlayerInitials(name),
      color: playerColor,
      assignedCardArtIndex: null,
    });

    setPlayerName("");
  };

  const handleRemovePlayer = (player: PlayerLike) => {
    Alert.alert(
      "Delete Player",
      `Remove ${player.name}? This will also clean up dependent groups and game references.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (typeof removePlayer === "function") {
              removePlayer(player.id);
              setDraftGroupPlayerIds((current) => current.filter((id) => id !== player.id));
            }
          },
        },
      ]
    );
  };

  const handleAddGroup = () => {
    const name = normalizeName(groupName);

    if (!name) {
      Alert.alert("Missing group name", "Enter a group name first.");
      return;
    }

    if (draftGroupPlayerIds.length < 2) {
      Alert.alert("Need more players", "Select at least 2 players for a group.");
      return;
    }

    if (typeof addGroup !== "function") {
      Alert.alert("Store error", "addGroup is not available in the store.");
      return;
    }

    addGroup({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      playerIds: draftGroupPlayerIds,
      createdAt: Date.now(),
    });

    setGroupName("");
    setDraftGroupPlayerIds([]);
  };

  const handleRemoveGroup = (group: GroupLike) => {
    Alert.alert("Delete Group", `Remove ${group.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          if (typeof removeGroup === "function") {
            removeGroup(group.id);
          }
        },
      },
    ]);
  };

  const colorOptions = ["blue", "green", "purple", "orange", "yellow", "red", "pink"];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundLayer}>
        <StarryNight />
        <View style={styles.backgroundDim} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.kicker}>Moonrakers</Text>
            <Text style={styles.title}>Manage Players / Groups</Text>
            <Text style={styles.subtitle}>
              Add, delete, and save the roster used by Home and Game Setup.
            </Text>
          </View>

          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        </View>

        <View style={styles.panel}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Add Player</Text>
            <Text style={styles.sectionSub}>Create roster entries</Text>
          </View>

          <TextInput
            value={playerName}
            onChangeText={setPlayerName}
            placeholder="Player name"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
          />

          <View style={styles.colorRow}>
            {colorOptions.map((color) => {
              const active = playerColor === color;
              const accent = getPlayerColor(color);

              return (
                <Pressable
                  key={color}
                  onPress={() => setPlayerColor(color)}
                  style={[
                    styles.colorChip,
                    active && {
                      borderColor: accent,
                      backgroundColor: `${accent}22`,
                    },
                  ]}
                >
                  <View style={[styles.colorDot, { backgroundColor: accent }]} />
                  <Text style={[styles.colorChipText, active && { color: accent }]}>
                    {color}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={handleAddPlayer} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Add Player</Text>
          </Pressable>
        </View>

        <View style={styles.panel}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Players</Text>
            <Text style={styles.sectionSub}>{orderedPlayers.length} total</Text>
          </View>

          <View style={styles.list}>
            {orderedPlayers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No players yet</Text>
              </View>
            ) : (
              orderedPlayers.map((player) => {
                const accent = getPlayerColor(player.color);

                return (
                  <View key={player.id} style={styles.rowCard}>
                    <View style={styles.rowLeft}>
                      <View
                        style={[
                          styles.initialCircle,
                          { borderColor: accent, backgroundColor: `${accent}22` },
                        ]}
                      >
                        <Text style={styles.initialCircleText}>
                          {getPlayerInitials(player.name)}
                        </Text>
                      </View>

                      <View>
                        <Text style={styles.rowTitle}>{player.name}</Text>
                        <Text style={styles.rowMeta}>{player.color ?? "No color"}</Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => handleRemovePlayer(player)}
                      style={styles.deleteButton}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Create Group</Text>
            <Text style={styles.sectionSub}>Save formations</Text>
          </View>

          <TextInput
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Group name"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
          />

          <View style={styles.selectorGrid}>
            {orderedPlayers.map((player) => {
              const selected = draftGroupPlayerIds.includes(player.id);
              const accent = getPlayerColor(player.color);

              return (
                <Pressable
                  key={player.id}
                  onPress={() => toggleDraftPlayer(player.id)}
                  style={[
                    styles.selectorChip,
                    selected && {
                      borderColor: accent,
                      backgroundColor: `${accent}22`,
                    },
                  ]}
                >
                  <Text style={[styles.selectorChipText, selected && { color: accent }]}>
                    {player.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={handleAddGroup} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Save Group</Text>
          </Pressable>
        </View>

        <View style={styles.panel}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Groups</Text>
            <Text style={styles.sectionSub}>{orderedGroups.length} saved</Text>
          </View>

          <View style={styles.list}>
            {orderedGroups.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No groups saved yet</Text>
              </View>
            ) : (
              orderedGroups.map((group) => (
                <View key={group.id} style={styles.rowCard}>
                  <View style={styles.rowLeft}>
                    <View style={styles.groupCapsule}>
                      <Text style={styles.groupCapsuleText}>
                        {(group.playerIds?.length ?? 0)}
                      </Text>
                    </View>

                    <View>
                      <Text style={styles.rowTitle}>{group.name}</Text>
                      <Text style={styles.rowMeta}>
                        {(group.playerIds?.length ?? 0)} player
                        {(group.playerIds?.length ?? 0) === 1 ? "" : "s"}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => handleRemoveGroup(group)}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
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

  backgroundDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,6,23,0.34)",
  },

  contentContainer: {
    padding: 8,
    paddingBottom: 20,
    gap: 8,
  },

  headerCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  headerTextWrap: {
    flex: 1,
    paddingRight: 12,
  },

  kicker: {
    color: COLORS.blue,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 4,
  },

  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24,
  },

  subtitle: {
    color: COLORS.sub,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 6,
  },

  backButton: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.whiteSoft,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  backButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },

  panel: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 8,
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

  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardAlt,
    color: COLORS.text,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 10,
  },

  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },

  colorChip: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardAlt,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },

  colorChipText: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "capitalize",
  },

  primaryButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  list: {
    gap: 8,
  },

  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.whiteSoft,
    padding: 12,
  },

  emptyText: {
    color: COLORS.sub,
    fontSize: 12,
    fontWeight: "700",
  },

  rowCard: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardAlt,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },

  initialCircle: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },

  initialCircleText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "900",
  },

  rowTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },

  rowMeta: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },

  deleteButton: {
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.34)",
    backgroundColor: "rgba(239,68,68,0.14)",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  deleteButtonText: {
    color: COLORS.red,
    fontSize: 11,
    fontWeight: "800",
  },

  selectorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },

  selectorChip: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardAlt,
    paddingHorizontal: 10,
    justifyContent: "center",
  },

  selectorChipText: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "800",
  },

  groupCapsule: {
    minWidth: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  groupCapsuleText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "900",
  },
});



