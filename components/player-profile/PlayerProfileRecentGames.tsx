import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import Text from "@/components/ui/Text";
import { COLORS } from "@/utils/colors";
import { formatDate } from "@/utils/formatters";
import { buildSummaryRoute } from "@/utils/appRoutes";

type PlayerProfileRecentGamesProps = {
  emptyText?: string;
  playerId: string;
  recentGames: Array<Record<string, unknown>>;
  renderBadge: () => React.ReactNode;
};

function toArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === "object",
      )
    : [];
}

export default function PlayerProfileRecentGames({
  emptyText = "No recent games found for this player.",
  playerId,
  recentGames,
  renderBadge,
}: PlayerProfileRecentGamesProps) {
  const router = useRouter();

  if (!recentGames.length) {
    return <Text style={styles.emptyText}>{emptyText}</Text>;
  }

  return (
    <View style={styles.gameList}>
      {recentGames.map((game, index) => {
        const gameId = String(game.id ?? game.gameId ?? "").trim();
        const participants = toArray(game.players);
        const participantNames = participants
          .map((participant) => String(participant.name ?? "Unknown"))
          .join(" • ");
        const winnerId = String(game.winnerId ?? "").trim();
        const isWin = winnerId === String(playerId);
        const dateLabel =
          (game.createdAt != null
            ? formatDate(game.createdAt as string | number)
            : null) || "Tracked game";

        return (
          <Pressable
            key={String(game.id ?? game.gameId ?? index)}
            style={({ pressed }) => [styles.gameRow, pressed && styles.gameRowPressed]}
            onPress={() => {
              if (gameId) router.push(buildSummaryRoute(gameId) as any);
            }}
          >
            <View style={styles.gameLeft}>
              <View style={styles.gameTitleRow}>
                {renderBadge()}
                <Text style={styles.gameTitle}>Game {recentGames.length - index}</Text>
              </View>

              <Text style={styles.gameMeta} numberOfLines={1}>
                {participantNames || "Tracked game"}
              </Text>
            </View>

            <View style={styles.gameRight}>
              <Text
                style={[
                  styles.gameResult,
                  isWin ? styles.gameResultWin : styles.gameResultLoss,
                ]}
              >
                {isWin ? "WIN" : "LOSS"}
              </Text>
              <Text style={styles.gameMeta}>{dateLabel}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    color: COLORS.sub,
    fontSize: 11,
  },
  gameList: {
    gap: 4,
  },
  gameRow: {
    backgroundColor: COLORS.whiteSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gameLeft: {
    flex: 1,
    paddingRight: 10,
  },
  gameRight: {
    alignItems: "flex-end",
    maxWidth: "40%",
  },
  gameTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  gameTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 1,
  },
  gameMeta: {
    color: COLORS.sub,
    fontSize: 10,
  },
  gameResult: {
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 2,
  },
  gameRowPressed: {
    opacity: 0.8,
  },
  gameResultWin: {
    color: COLORS.green,
  },
  gameResultLoss: {
    color: COLORS.danger,
  },
});
