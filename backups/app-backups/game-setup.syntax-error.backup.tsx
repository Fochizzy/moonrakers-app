import React, { useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DropProvider, Draggable, Droppable } from "react-native-reanimated-dnd";

import { useStore } from "@/store/useStore";
import StarryNight from "@/components/ui/StarryNight";

const SHEET = require("@/assets/images/player-card-sheet.png");

const SHEET_COLUMNS = 5;
const SHEET_ROWS = 6;
const TOTAL_ART_CARDS = SHEET_COLUMNS * SHEET_ROWS;

const SCREEN_WIDTH = Dimensions.get("window").width;
const H_PADDING = 12;
const GRID_GAP = 8;
const GRID_COLUMNS = 5;
const MINI_CARD_WIDTH =
  (SCREEN_WIDTH - H_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
const MINI_CARD_HEIGHT = MINI_CARD_WIDTH * 1.42;

const SLOT_GAP = 8;
const SLOT_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - SLOT_GAP * 2) / 3;
const SLOT_HEIGHT = SLOT_WIDTH * 1.42;

type PlayerLike = {
  id: string;
  name?: string;
  color?: string;
};

type DragData = {
  id: string;
  name: string;
  color?: string;
  artIndex: number;
};

function shuffleNumbers(count: number) {
  const arr = Array.from({ length: count }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;

function cropPosition(index: number) {
  const normalized = ((index % TOTAL_ART_CARDS) + TOTAL_ART_CARDS) % TOTAL_ART_CARDS;
  return {
    row: Math.floor(normalized / SHEET_COLUMNS),
    col: normalized % SHEET_COLUMNS,
  };

function getInitials(name?: string) {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();

function getPlayerAccent(color?: string) {
  switch ((color ?? "").toLowerCase()) {
    case "green":
      return "#84CC16";
    case "purple":
      return "#C084FC";
    case "blue":
      return "#60A5FA";
    case "orange":
      return "#FB923C";
    case "yellow":
      return "#FACC15";
    case "red":
      return "#F87171";
    case "pink":
      return "#F472B6";
    default:
      return "#CBD5E1";
  }
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
  const { row, col } = cropPosition(artIndex);

  return (
    <View style={[styles.cropWindow, { width, height }]}>
      <Image
        source={SHEET}
        resizeMode="stretch"
        style={{
          position: "absolute",
          width: width * SHEET_COLUMNS,
          height: height * SHEET_ROWS,
          left: -(col * width),
          top: -(row * height),
        }}
      />
    </View>
  );

function MiniPlayerCard({
  data,
  assignedLabel,
}: {
  data: DragData;
  assignedLabel?: string | null;
}) {
  const accent = getPlayerAccent(data.color);
  const tint = getPlayerTint(data.color);

  return (
    <View style={styles.miniCardShell}>
      <View style={styles.miniCardBorder}>
        <CropCardArt
          artIndex={data.artIndex}
          width={MINI_CARD_WIDTH - 4}
          height={MINI_CARD_HEIGHT - 4}
        />
        
        <View style={styles.cardDim} />

        <View style={[styles.initialsBadge, { borderColor: accent }]}>
          <Text style={styles.initialsText}>{getInitials(data.name)}</Text>
        </View>

        {assignedLabel ? (
          <View style={[styles.rankBadge, { borderColor: accent }]}>
            <Text style={[styles.rankBadgeText, { color: accent }]}>{assignedLabel}</Text>
          </View>
        ) : null}

        <View style={[styles.bottomLabel, { borderColor: accent }]}>
          <Text numberOfLines={2} style={styles.bottomLabelText}>
            {data.name}
          </Text>
        </View>
      </View>
    </View>
  );

}
function PodiumSlot({
  label,
  slotIndex,
  player,
  onDropPlayer,
  onClear,
}: {
  label: string;
  slotIndex: number;
  player: DragData | null;
  onDropPlayer: (slotIndex: number, data: DragData) => void;
  onClear: (slotIndex: number) => void;
}) {
  const accent = getPlayerAccent(player?.color);
  const tint = getPlayerTint(player?.color);

  return (
    <Droppable<DragData>
      droppableId={`podium-${slotIndex}`}
      onDrop={(data) => onDropPlayer(slotIndex, data)}
      style={styles.slotCard}
      activeStyle={[
        styles.slotCard,
        {
          borderColor: accent || "#FFFFFF",
          backgroundColor: "rgba(255,255,255,0.08)",
          transform: [{ scale: 1.02 }],
        },
      ]}
    >
      <View style={styles.slotCardInner}>
        {player ? (
          <>
            <CropCardArt
              artIndex={player.artIndex}
              width={SLOT_WIDTH - 6}
              height={SLOT_HEIGHT - 6}
            />
            
            <View style={styles.slotDim} />

            <View style={[styles.slotPill, { borderColor: accent }]}>
              <Text style={[styles.slotPillText, { color: accent }]}>{label}</Text>
            </View>

            <Pressable onPress={() => onClear(slotIndex)} style={styles.clearPill}>
              <Text style={styles.clearPillText}>Clear</Text>
            </Pressable>

            <View style={[styles.slotFooter, { borderColor: accent }]}>
              <Text numberOfLines={2} style={styles.slotName}>
                {player.name}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.emptySlotInner}>
            <View style={styles.slotPillEmpty}>
              <Text style={styles.slotPillEmptyText}>{label}</Text>
            </View>
            <Text style={styles.emptySlotSub}>Drag a player card here</Text>
          </View>
        )}
      </View>
    </Droppable>
  );
}
}

export default function GameSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const storePlayers = useStore((s: any) =>
    Array.isArray(s.players) ? s.players : []
  ) as PlayerLike[];

  const paramPlayerIds = useMemo(() => {
    try {
      const raw = params?.playerIds;
      if (typeof raw !== "string") return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }, [params]);

  const players = useMemo(() => {
    if (paramPlayerIds.length === 0) return storePlayers;
    const wanted = new Set(paramPlayerIds);
    return storePlayers.filter((p) => wanted.has(String(p.id)));
  }, [storePlayers, paramPlayerIds]);

  const randomizedArtMap = useMemo(() => {
    const shuffled = shuffleNumbers(TOTAL_ART_CARDS);
    const map: Record<string, number> = {};
    players.forEach((player, index) => {
      map[String(player.id)] = shuffled[index % shuffled.length];
    });
    return map;
  }, [players]);

  const draggablePlayers = useMemo<DragData[]>(() => {
    return players.map((player) => ({
      id: String(player.id),
      name: player.name || "Unknown Player",
      color: player.color,
      artIndex: randomizedArtMap[String(player.id)],
    }));
  }, [players, randomizedArtMap]);

  const [placements, setPlacements] = useState<Array<DragData | null>>([
    null,
    null,
    null,
  ]);

  const assignToSlot = (slotIndex: number, data: DragData) => {
    setPlacements((current) => {
      const next = current.map((item) => (item?.id === data.id ? null : item));
      next[slotIndex] = data;
      return [...next];
    });
  };

  const clearSlot = (slotIndex: number) => {
    setPlacements((current) => {
      const next = [...current];
      next[slotIndex] = null;
      return next;
    });
  };

  const rankLabelByPlayerId = useMemo(() => {
    const result: Record<string, string> = {};
    placements.forEach((item, index) => {
      if (!item) return;
      result[item.id] = index === 0 ? "1st" : index === 1 ? "2nd" : "3rd";
    });
    return result;
  }, [placements]);

  const isOrderComplete = placements.every(Boolean);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DropProvider>
        <SafeAreaView style={styles.container}>
          <View style={StyleSheet.absoluteFillObject}>
            <StarryNight />
            <View style={styles.backgroundGlow} />
            <View style={styles.backgroundDim} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Set Turn Order</Text>
              <Text style={styles.subtitle}>
                Drag cards into 1st, 2nd, and 3rd from left to right
              </Text>
            </View>

            <View style={styles.podiumRow}>
              <PodiumSlot
                label="1st"
                slotIndex={0}
                player={placements[0]}
                onDropPlayer={assignToSlot}
                onClear={clearSlot}
              />
              <PodiumSlot
                label="2nd"
                slotIndex={1}
                player={placements[1]}
                onDropPlayer={assignToSlot}
                onClear={clearSlot}
              />
              <PodiumSlot
                label="3rd"
                slotIndex={2}
                player={placements[2]}
                onDropPlayer={assignToSlot}
                onClear={clearSlot}
              />
            </View>

            <Text style={styles.sectionLabel}>Players</Text>

            <View style={styles.grid}>
              {draggablePlayers.map((player) => (
                <Draggable<DragData>
                  key={player.id}
                  data={player}
                  style={styles.draggableWrap}
                >
                  <MiniPlayerCard
                    data={player}
                    assignedLabel={rankLabelByPlayerId[player.id] ?? null}
                  />
                </Draggable>
              ))}
            </View>

            <Pressable
              style={[
                styles.startButton,
                !isOrderComplete && styles.startButtonDisabled,
              ]}
              disabled={!isOrderComplete}
              onPress={() => router.push("/game" as any)}
            >
              <Text
                style={[
                  styles.startButtonText,
                  !isOrderComplete && styles.startButtonTextDisabled,
                ]}
              >
                Start Game
              </Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </DropProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },

  backgroundGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.04)",
  },

  backgroundDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,6,23,0.40)",
  },

  content: {
    paddingHorizontal: H_PADDING,
    paddingTop: 12,
    paddingBottom: 24,
  },

  header: {
    marginBottom: 12,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },

  subtitle: {
    color: "#C7D2FE",
    fontSize: 12,
    marginTop: 4,
  },

  podiumRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SLOT_GAP,
    marginBottom: 18,
  },

  sectionLabel: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  slotCard: {
    width: SLOT_WIDTH,
    height: SLOT_HEIGHT,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#000000",
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  slotCardInner: {
    flex: 1,
  },

  slotDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.16)",
  },

  emptySlotInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
  },

  emptySlotSub: {
    color: "#CBD5E1",
    fontSize: 10,
    marginTop: 6,
    textAlign: "center",
  },

  slotPill: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.80)",
  },

  slotPillText: {
    fontSize: 11,
    fontWeight: "900",
  },

  slotPillEmpty: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.80)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },

  slotPillEmptyText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },

  clearPill: {
    position: "absolute",
    top: 6,
    right: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.80)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },

  clearPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  slotFooter: {
    position: "absolute",
    left: 6,
    right: 6,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.82)",
    borderWidth: 1,
  },

  slotName: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },

  draggableWrap: {
    width: MINI_CARD_WIDTH,
    height: MINI_CARD_HEIGHT,
  },

  miniCardShell: {
    width: MINI_CARD_WIDTH,
    height: MINI_CARD_HEIGHT,
  },

  miniCardBorder: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#000000",
    backgroundColor: "#111827",
  },

  cropWindow: {
    position: "absolute",
    left: 0,
    top: 0,
    overflow: "hidden",
    backgroundColor: "#111827",
  },

  cardTint: {
    ...StyleSheet.absoluteFillObject,
  },

  cardDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },

  initialsBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 4,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.82)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  initialsText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },

  rankBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: "rgba(0,0,0,0.82)",
    borderWidth: 1,
  },

  rankBadgeText: {
    fontSize: 9,
    fontWeight: "900",
  },

  bottomLabel: {
    position: "absolute",
    left: 4,
    right: 4,
    bottom: 4,
    paddingHorizontal: 5,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.82)",
    borderWidth: 1,
  },

  bottomLabelText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 11,
    textAlign: "center",
  },

  startButton: {
    marginTop: 18,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },

  startButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.20)",
  },

  startButtonText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },

  startButtonTextDisabled: {
    color: "#CBD5E1",
  },
});





