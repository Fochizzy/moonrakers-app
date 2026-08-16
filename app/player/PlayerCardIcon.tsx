import React, { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { PLAYER_CARD_IMAGE_BY_FILE } from "@/utils/playerCardAssets";
import { getCardArtIndicesForColor } from "@/utils/playerCards";

type PlayerLike = {
  id?: string;
  name?: string;
  color?: string;
  initials?: string;
  assignedCardArtIndex?: number | null;
  artIndex?: number | null;
};

type Props = {
  player?: PlayerLike | null;
  size?: number;
  borderRadius?: number;
  showInitial?: boolean;
  showBorder?: boolean;
};

const PLAYER_CARD_FILES = Object.keys(
  PLAYER_CARD_IMAGE_BY_FILE
).sort() as Array<keyof typeof PLAYER_CARD_IMAGE_BY_FILE>;

// Resets whenever the app process / session restarts.
const sessionRandomArtIndexByPlayerKey = new Map<string, number>();

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

function getSessionPlayerKey(player?: PlayerLike | null) {
  return String(player?.id ?? player?.name ?? "anonymous-player");
}

function pickSessionRandomArtIndex(player?: PlayerLike | null) {
  const key = getSessionPlayerKey(player);

  const existing = sessionRandomArtIndexByPlayerKey.get(key);
  if (typeof existing === "number" && isValidArtIndex(existing)) {
    return existing;
  }

  const colorIndices = getCardArtIndicesForColor(player?.color);

  let nextIndex: number;
  if (colorIndices.length > 0) {
    nextIndex = colorIndices[Math.floor(Math.random() * colorIndices.length)];
  } else {
    nextIndex = Math.floor(Math.random() * PLAYER_CARD_FILES.length);
  }

  sessionRandomArtIndexByPlayerKey.set(key, nextIndex);
  return nextIndex;
}

// Always random per login/session.
// Ignores assignedCardArtIndex and artIndex on purpose.
function resolveRenderableCardArtIndex(player?: PlayerLike | null) {
  return pickSessionRandomArtIndex(player);
}

function resolveCardSource(player?: PlayerLike | null) {
  const artIndex = resolveRenderableCardArtIndex(player);
  const fileName = PLAYER_CARD_FILES[artIndex] ?? PLAYER_CARD_FILES[0];
  return PLAYER_CARD_IMAGE_BY_FILE[fileName];
}

export default function PlayerCardIcon({
  player,
  size = 44,
  borderRadius = 12,
  showInitial = true,
  showBorder = true,
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
          width: size,
          height: Math.round(size * 1.35),
          borderRadius,
          borderColor: showBorder ? `${accent}55` : "transparent",
        },
      ]}
    >
      <Image source={source} resizeMode="cover" style={styles.image} />
      <View style={styles.dim} />

      {showInitial ? (
        <View style={[styles.initialBadge, { borderColor: `${accent}88` }]}>
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
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(8,17,32,0.84)",
    alignItems: "center",
    justifyContent: "center",
  },
  initialText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
});
