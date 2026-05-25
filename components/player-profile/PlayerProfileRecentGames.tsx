import React from "react";
import { StyleSheet, View } from "react-native";

import Text from "@/components/ui/Text";
import { COLORS } from "@/utils/colors";

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
  if (!recentGames.length) {
    return <Text style={styles.emptyText}>{emptyText}</Text>;
  }

  return (
    <View style={styles.gameList}>
      {recentGames.map((game, index) => {
        const participants = toArray(game.players);
        const participantNames = participants
          .map((participant) => String(participant.name ?? "Unknown"))
          .join(" • ");
        const winnerId = String(game.winnerId ?? "").trim();
        const isWin = winnerId === String(playerId);

        return (
          <View
            key={String(game.id ?? game.gameId ?? index)}
            style={styles.gameRow}
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
              <Text style={styles.gameMeta}>
                {String(game.id ?? game.gameId ?? "Tracked")}
              </Text>
            </View>
          </View>
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
  gameResultWin: {
    color: COLORS.green,
  },
  gameResultLoss: {
    color: COLORS.blue,
  },
});
