
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useStore } from "@/store/useStore";
import StarryNight from "@/components/ui/StarryNight";
import Text from "@/components/ui/Text";
import PlayerCardIcon from "@/components/player/PlayerCardIcon";
import {
  getPlayerAccentColor,
  getPlayerTintColor,
} from "@/utils/turnTheme";
import {
  getCardsByColor,
  getCardByArtIndex,
  type CardColor,
} from "@/utils/playerCardCartalog";

type UiColor = "Green" | "Purple" | "Blue" | "Orange" | "Yellow";
type TabKey = "players" | "groups";

type PlayerLike = {
  id: string;
  name: string;
  color?: string;
  assignedCardArtIndex?: number | null;
  initials?: string;
};

type GroupLike = {
  id: string;
  name: string;
  playerIds: string[];
  createdAt?: number;
};

const UI_COLORS: UiColor[] = ["Green", "Purple", "Blue", "Orange", "Yellow"];

function toCatalogColor(color?: string): CardColor {
  switch (String(color ?? "").trim().toLowerCase()) {
    case "green":
      return "green";
    case "purple":
      return "purple";
    case "orange":
      return "orange";
    case "yellow":
      return "yellow";
    case "blue":
    default:
      return "blue";
  }
}

function normalizeColor(color?: string): UiColor {
  switch (String(color ?? "").trim().toLowerCase()) {
    case "green":
      return "Green";
    case "purple":
      return "Purple";
    case "orange":
      return "Orange";
    case "yellow":
      return "Yellow";
    case "blue":
    default:
      return "Blue";
  }
}

function uniqueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getInitials(name: string) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function AddPlayersScreen() {
  const router = useRouter();

  const players = (useStore((s: any) => s.players ?? []) as PlayerLike[]).slice();
  const groups = (useStore((s: any) => s.groups ?? []) as GroupLike[]).slice();

  const addPlayer = useStore((s: any) => s.addPlayer);
  const updatePlayer = useStore((s: any) => s.updatePlayer);
  const assignPlayerCard = useStore((s: any) => s.assignPlayerCard);
  const deletePlayer = useStore((s: any) => s.deletePlayer ?? s.removePlayer);

  const addGroup = useStore((s: any) => s.addGroup);
  const deleteGroup = useStore((s: any) => s.deleteGroup ?? s.removeGroup);

  const [tab, setTab] = useState<TabKey>("players");

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<UiColor>("Blue");
  const [newCardArtIndex, setNewCardArtIndex] = useState<number | null>(null);

  const [editingPlayer, setEditingPlayer] = useState<PlayerLike | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<UiColor>("Blue");
  const [editCardArtIndex, setEditCardArtIndex] = useState<number | null>(null);
  const [needsNewCard, setNeedsNewCard] = useState(false);

  const [groupName, setGroupName] = useState("");
  const [selectedGroupPlayerIds, setSelectedGroupPlayerIds] = useState<string[]>([]);

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => a.name.localeCompare(b.name)),
    [players]
  );

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.name.localeCompare(b.name)),
    [groups]
  );

  const newColorCards = useMemo(
    () => getCardsByColor(toCatalogColor(newColor)),
    [newColor]
  );

  const editColorCards = useMemo(
    () => getCardsByColor(toCatalogColor(editColor)),
    [editColor]
  );

  const openEditPlayer = (player: PlayerLike) => {
    setEditingPlayer(player);
    setEditName(player.name ?? "");
    setEditColor(normalizeColor(player.color));
    setEditCardArtIndex(
      typeof player.assignedCardArtIndex === "number" ? player.assignedCardArtIndex : null
    );
    setNeedsNewCard(false);
  };

  const closeEditPlayer = () => {
    setEditingPlayer(null);
    setEditName("");
    setEditColor("Blue");
    setEditCardArtIndex(null);
    setNeedsNewCard(false);
  };

  const onNewColorChange = (nextColor: UiColor) => {
    setNewColor(nextColor);
    if (
      newCardArtIndex != null &&
      getCardByArtIndex(newCardArtIndex)?.color !== toCatalogColor(nextColor)
    ) {
      setNewCardArtIndex(null);
    }
  };

  const onEditColorChange = (nextColor: UiColor) => {
    const prevColor = editingPlayer ? normalizeColor(editingPlayer.color) : editColor;
    setEditColor(nextColor);

    const currentCardColor =
      editCardArtIndex != null ? getCardByArtIndex(editCardArtIndex)?.color : null;

    if (prevColor !== nextColor && currentCardColor !== toCatalogColor(nextColor)) {
      setEditCardArtIndex(null);
      setNeedsNewCard(true);
      Alert.alert(
        "Pick a new card",
        "Changing a player's color requires picking a new card from that color's catalog."
      );
    }
  };

  const handleAddPlayer = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      Alert.alert("Player name required", "Enter a player name first.");
      return;
    }

    if (newCardArtIndex == null) {
      Alert.alert("Choose a card", "Pick a card for this player before saving.");
      return;
    }

    addPlayer?.({
      id: uniqueId("player"),
      name: trimmed,
      initials: getInitials(trimmed),
      color: newColor,
      assignedCardArtIndex: newCardArtIndex,
    });

    setNewName("");
    setNewColor("Blue");
    setNewCardArtIndex(null);
  };

  const handleSavePlayer = () => {
    if (!editingPlayer) return;

    const trimmed = editName.trim();
    if (!trimmed) {
      Alert.alert("Player name required", "Enter a player name first.");
      return;
    }

    if (!updatePlayer) {
      Alert.alert("Missing store action", "updatePlayer is not available in your store.");
      return;
    }

    if (editCardArtIndex == null) {
      Alert.alert("Choose a card", "Pick a card before saving this player.");
      return;
    }

    updatePlayer(editingPlayer.id, {
      name: trimmed,
      initials: getInitials(trimmed),
      color: editColor,
      assignedCardArtIndex: editCardArtIndex,
    });

    if (assignPlayerCard) {
      assignPlayerCard(editingPlayer.id, editCardArtIndex);
    }

    closeEditPlayer();
  };

  const handleDeletePlayer = () => {
    if (!editingPlayer || !deletePlayer) return;
    Alert.alert(
      "Delete player",
      `Delete ${editingPlayer.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deletePlayer(editingPlayer.id);
            closeEditPlayer();
          },
        },
      ]
    );
  };

  const toggleGroupPlayer = (playerId: string) => {
    setSelectedGroupPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : current.length >= 5
          ? current
          : [...current, playerId]
    );
  };

  const handleCreateGroup = () => {
    const trimmed = groupName.trim();
    if (!trimmed) {
      Alert.alert("Group name required", "Enter a group name first.");
      return;
    }
    if (selectedGroupPlayerIds.length < 2) {
      Alert.alert("More players needed", "Select at least 2 players for a group.");
      return;
    }

    addGroup?.({
      id: uniqueId("group"),
      name: trimmed,
      playerIds: selectedGroupPlayerIds,
      createdAt: Date.now(),
    });

    setGroupName("");
    setSelectedGroupPlayerIds([]);
  };

  const renderColorPill = (
    color: UiColor,
    active: boolean,
    onPress: () => void
  ) => {
    const accent = getPlayerAccentColor(color);
    const tint = getPlayerTintColor(color);

    return (
      <Pressable
        key={color}
        onPress={onPress}
        style={[
          styles.colorPill,
          { backgroundColor: tint, borderColor: active ? accent : "transparent" },
        ]}
      >
        <Text style={[styles.colorPillText, active && { color: "#FFFFFF" }]}>{color}</Text>
      </Pressable>
    );
  };

  const renderCardChoice = (
    artIndex: number | null,
    active: boolean,
    onPress: () => void,
    color?: string
  ) => {
    const accent = getPlayerAccentColor(color ?? "Blue");
    const previewPlayer = {
      id: "preview",
      name: "Preview",
      color: color ?? "Blue",
      assignedCardArtIndex: artIndex,
    };

    return (
      <Pressable
        key={String(artIndex)}
        onPress={onPress}
        style={[
          styles.cardChoice,
          active && {
            borderColor: accent,
            backgroundColor: `${accent}18`,
            shadowColor: accent,
            shadowOpacity: 0.28,
            shadowRadius: 10,
          },
        ]}
      >
        <PlayerCardIcon
          player={previewPlayer as any}
          size={116}
          borderRadius={18}
          showInitial={false}
        />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={StyleSheet.absoluteFillObject}>
        <StarryNight count={100} />
        <View style={styles.overlay} />
      </View>

      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </Pressable>

          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Players & Groups</Text>
            <Text style={styles.subtitle}>
              Manage player profiles, saved cards, and saved groups.
            </Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setTab("players")}
            style={[styles.tabBtn, tab === "players" && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, tab === "players" && styles.tabTextActive]}>
              Players
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setTab("groups")}
            style={[styles.tabBtn, tab === "groups" && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, tab === "groups" && styles.tabTextActive]}>
              Saved Groups
            </Text>
          </Pressable>
        </View>

        {tab === "players" ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Create player</Text>

              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Player name"
                placeholderTextColor="#6E87AE"
                style={styles.input}
              />

              <Text style={styles.smallLabel}>Choose color</Text>
              <View style={styles.colorRow}>
                {UI_COLORS.map((color) =>
                  renderColorPill(color, newColor === color, () => onNewColorChange(color))
                )}
              </View>

              <Text style={styles.smallLabel}>Choose card</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cardRow}
              >
                {newColorCards.map((card) =>
                  renderCardChoice(
                    card.artIndex,
                    newCardArtIndex === card.artIndex,
                    () => setNewCardArtIndex(card.artIndex),
                    newColor
                  )
                )}
              </ScrollView>

              <Pressable onPress={handleAddPlayer} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Save Player</Text>
              </Pressable>
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Players</Text>
              <Text style={styles.helperText}>Tap player to edit or delete</Text>

              <View style={styles.playerGrid}>
                {sortedPlayers.map((player) => (
                  <Pressable
                    key={player.id}
                    onPress={() => openEditPlayer(player)}
                    style={styles.playerTile}
                  >
                    <PlayerCardIcon
                      player={player as any}
                      size={86}
                      borderRadius={16}
                      showInitial={false}
                    />
                    <Text style={styles.playerTileName} numberOfLines={1}>
                      {player.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Create saved group</Text>

              <TextInput
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Group name"
                placeholderTextColor="#6E87AE"
                style={styles.input}
              />

              <Text style={styles.smallLabel}>
                Select players ({selectedGroupPlayerIds.length}/5)
              </Text>

              <View style={styles.groupPlayerGrid}>
                {sortedPlayers.map((player) => {
                  const active = selectedGroupPlayerIds.includes(player.id);
                  const accent = getPlayerAccentColor(player.color);

                  return (
                    <Pressable
                      key={player.id}
                      onPress={() => toggleGroupPlayer(player.id)}
                      style={[
                        styles.groupPlayerTile,
                        active && {
                          borderColor: accent,
                          backgroundColor: `${accent}18`,
                        },
                      ]}
                    >
                      <PlayerCardIcon
                        player={player as any}
                        size={72}
                        borderRadius={14}
                        showInitial={false}
                      />
                      <Text style={styles.groupPlayerName} numberOfLines={1}>
                        {player.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable onPress={handleCreateGroup} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Save Group</Text>
              </Pressable>
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Saved groups</Text>

              {sortedGroups.length === 0 ? (
                <Text style={styles.emptyText}>No saved groups yet.</Text>
              ) : (
                <View style={styles.groupList}>
                  {sortedGroups.map((group) => (
                    <View key={group.id} style={styles.groupCard}>
                      <View style={styles.groupCardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.groupName}>{group.name}</Text>
                          <Text style={styles.groupMeta}>
                            {group.playerIds.length} players
                          </Text>
                        </View>

                        <Pressable
                          onPress={() => {
                            if (!deleteGroup) return;
                            Alert.alert(
                              "Delete group",
                              `Delete ${group.name}?`,
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Delete",
                                  style: "destructive",
                                  onPress: () => deleteGroup(group.id),
                                },
                              ]
                            );
                          }}
                          style={styles.deleteSmallBtn}
                        >
                          <Text style={styles.deleteSmallBtnText}>Delete</Text>
                        </Pressable>
                      </View>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.groupCardPlayers}
                      >
                        {group.playerIds.map((id) => {
                          const player = players.find((p) => p.id === id);
                          if (!player) return null;

                          return (
                            <View key={id} style={styles.groupCardPlayer}>
                              <PlayerCardIcon
                                player={player as any}
                                size={54}
                                borderRadius={12}
                                showInitial={false}
                              />
                              <Text style={styles.groupCardPlayerName} numberOfLines={1}>
                                {player.name}
                              </Text>
                            </View>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={!!editingPlayer}
        onRequestClose={closeEditPlayer}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit player</Text>
              <Pressable onPress={closeEditPlayer}>
                <Text style={styles.modalClose}>Close</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.editPreviewWrap}>
                <PlayerCardIcon
                  player={{
                    id: editingPlayer?.id ?? "preview",
                    name: editName || editingPlayer?.name || "Player",
                    color: editColor,
                    assignedCardArtIndex: editCardArtIndex,
                  } as any}
                  size={116}
                  borderRadius={18}
                  showInitial={false}
                />
              </View>

              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Player name"
                placeholderTextColor="#6E87AE"
                style={styles.input}
              />

              <Text style={styles.smallLabel}>Choose color</Text>
              <View style={styles.colorRow}>
                {UI_COLORS.map((color) =>
                  renderColorPill(color, editColor === color, () => onEditColorChange(color))
                )}
              </View>

              <Text style={styles.smallLabel}>Choose card</Text>
              {needsNewCard ? (
                <Text style={styles.warningText}>
                  Color changed. Pick a new card from this color before saving.
                </Text>
              ) : null}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cardRow}
              >
                {editColorCards.map((card) =>
                  renderCardChoice(
                    card.artIndex,
                    editCardArtIndex === card.artIndex,
                    () => {
                      setEditCardArtIndex(card.artIndex);
                      setNeedsNewCard(false);
                    },
                    editColor
                  )
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable onPress={handleSavePlayer} style={styles.primaryBtnHalf}>
                  <Text style={styles.primaryBtnText}>Save Player</Text>
                </Pressable>

                <Pressable onPress={handleDeletePlayer} style={styles.deleteBtnHalf}>
                  <Text style={styles.deleteBtnText}>Delete Player</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#030712",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,6,17,0.58)",
  },
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 6,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
  },
  subtitle: {
    color: "#8FAED7",
    fontSize: 13,
    marginTop: 2,
  },
  tabRow: {
    flexDirection: "row",
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(7,15,31,0.88)",
    borderWidth: 1,
    borderColor: "rgba(67,117,183,0.24)",
  },
  tabBtnActive: {
    backgroundColor: "rgba(11,23,48,0.96)",
    borderColor: "rgba(57,148,255,0.55)",
  },
  tabText: {
    color: "#AFC6E9",
    fontSize: 16,
    fontWeight: "900",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 24,
    gap: 12,
  },
  panel: {
    backgroundColor: "rgba(5,12,28,0.94)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(50,104,180,0.18)",
    padding: 14,
    gap: 12,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  helperText: {
    color: "#7D9BC4",
    fontSize: 11,
    marginTop: -4,
  },
  smallLabel: {
    color: "#E8F1FF",
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    backgroundColor: "#081426",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(67,117,183,0.18)",
    color: "#FFFFFF",
    fontSize: 17,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorPill: {
    minWidth: 76,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  colorPillText: {
    color: "#F3F7FF",
    fontSize: 13,
    fontWeight: "900",
  },
  cardRow: {
    gap: 12,
    paddingRight: 8,
  },
  cardChoice: {
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 8,
  },
  primaryBtn: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: "#F4F7FB",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#020814",
    fontSize: 17,
    fontWeight: "900",
  },
  playerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  playerTile: {
    width: "22.8%",
    alignItems: "center",
    gap: 6,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  playerTileName: {
    color: "#F3F7FF",
    fontSize: 11,
    fontWeight: "800",
    width: "100%",
    textAlign: "center",
  },
  groupPlayerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  groupPlayerTile: {
    width: "22.8%",
    alignItems: "center",
    gap: 6,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: "rgba(255,255,255,0.025)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  groupPlayerName: {
    color: "#F3F7FF",
    fontSize: 10,
    fontWeight: "800",
    width: "100%",
    textAlign: "center",
  },
  groupList: {
    gap: 10,
  },
  groupCard: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    gap: 10,
  },
  groupCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  groupName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  groupMeta: {
    color: "#84A3CC",
    fontSize: 12,
    marginTop: 2,
  },
  deleteSmallBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.26)",
  },
  deleteSmallBtnText: {
    color: "#F6A3A3",
    fontSize: 12,
    fontWeight: "900",
  },
  groupCardPlayers: {
    gap: 10,
    paddingRight: 6,
  },
  groupCardPlayer: {
    width: 62,
    alignItems: "center",
    gap: 4,
  },
  groupCardPlayerName: {
    color: "#E8F1FF",
    fontSize: 9,
    fontWeight: "700",
    width: "100%",
    textAlign: "center",
  },
  emptyText: {
    color: "#8FAED7",
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 14,
  },
  modalCard: {
    maxHeight: "88%",
    backgroundColor: "#030C1D",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(67,117,183,0.26)",
    padding: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  modalClose: {
    color: "#B8CCEA",
    fontSize: 14,
    fontWeight: "800",
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    gap: 12,
    paddingBottom: 4,
  },
  editPreviewWrap: {
    alignItems: "flex-start",
  },
  warningText: {
    color: "#FACC15",
    fontSize: 12,
    fontWeight: "800",
    marginTop: -4,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  primaryBtnHalf: {
    flex: 1,
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: "#F4F7FB",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnHalf: {
    flex: 1,
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: "rgba(87,12,21,0.72)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.28)",
  },
  deleteBtnText: {
    color: "#EAB1B1",
    fontSize: 17,
    fontWeight: "900",
  },
});

