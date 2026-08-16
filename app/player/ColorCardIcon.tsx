import React, { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import {
  getCardArtIndicesForColor,
  pickRandomCardArtIndexForColor,
} from "@/utils/playerCards";
import { PLAYER_CARD_IMAGE_BY_FILE } from "@/utils/playerCardAssets";

type PlayerCardLike = {
  id?: string;
  name?: string;
  color?: string;
  initials?: string;
  assignedCardArtIndex?: number | null;
  artIndex?: number | null;
};

type Props = {
  player?: PlayerCardLike | null;
  width?: number;
  height?: number;
  borderRadius?: number;
  showInitialBadge?: boolean;
};

const PLAYER_CARD_FILES = Object.keys(
  PLAYER_CARD_IMAGE_BY_FILE
).sort() as Array<keyof typeof PLAYER_CARD_IMAGE_BY_FILE>;

function getSingleInitial(value?: string) {
  const safe = typeof value === "string" ? value.trim() : "";
  return safe ? safe.charAt(0).toUpperCase() : "?";
}

function getAccent(color?: string) {
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

function isValidArtIndex(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < PLAYER_CARD_FILES.length
  );
}

function fallbackIndexFromStableKey(player?: PlayerCardLike | null) {
  const colorIndices = getCardArtIndicesForColor(player?.color);
  const seedSource = String(player?.id ?? player?.name ?? "");
  let hash = 0;

  for (let i = 0; i < seedSource.length; i += 1) {
    hash = (hash * 31 + seedSource.charCodeAt(i)) >>> 0;
  }

  if (colorIndices.length > 0) {
    return colorIndices[hash % colorIndices.length];
  }

  return hash % PLAYER_CARD_FILES.length;
}

function resolveRenderableCardArtIndex(player?: PlayerCardLike | null) {
  if (isValidArtIndex(player?.assignedCardArtIndex)) {
    return player!.assignedCardArtIndex!;
  }

  if (isValidArtIndex(player?.artIndex)) {
    return player!.artIndex!;
  }

  const colorMatched = pickRandomCardArtIndexForColor(player?.color);
  if (typeof colorMatched === "number" && isValidArtIndex(colorMatched)) {
    return colorMatched;
  }

  return fallbackIndexFromStableKey(player);
}

function resolveCardSource(player?: PlayerCardLike | null) {
  const artIndex = resolveRenderableCardArtIndex(player);
  const fileName = PLAYER_CARD_FILES[artIndex] ?? PLAYER_CARD_FILES[0];
  return PLAYER_CARD_IMAGE_BY_FILE[fileName];
}

export default function ColorCardIcon({
  player,
  width = 64,
  height = 88,
  borderRadius = 12,
  showInitialBadge = true,
}: Props) {
  const source = useMemo(() => resolveCardSource(player), [player]);
  const accent = getAccent(player?.color);
  const initial = getSingleInitial(
    typeof player?.initials === "string" && player.initials.trim()
      ? player.initials
      : player?.name
  );

  return (
    <View
      style={[
        styles.shell,
        {
          width,
          height,
          borderRadius,
          borderColor: `${accent}44`,
        },
      ]}
    >
      <Image source={source} resizeMode="cover" style={styles.image} />
      <View style={styles.dim} />

      {showInitialBadge ? (
        <View style={[styles.initialBadge, { borderColor: `${accent}66` }]}>
          <Text style={styles.initialText}>{initial}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    borderWidth: 1,
    backgroundColor: "#0F172A",
    position: "relative",
  },
  image: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
  },
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.10)",
  },
  initialBadge: {
    position: "absolute",
    left: 4,
    top: 4,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(8,17,32,0.82)",
    alignItems: "center",
    justifyContent: "center",
  },
  initialText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
});


