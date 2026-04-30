import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import HeroCard from "@/components/ui/HeroCard";
import HubTileCard from "@/components/ui/HubTileCard";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import Text from "@/components/ui/Text";
import { useStore } from "@/store/useStore";
import { getPlayersHubCards } from "@/utils/appHubs";
import { APP_ROUTES, buildPlayerProfileRoute } from "@/utils/appRoutes";

type ResumeRecommendation = {
  eyebrow: string;
  title: string;
  body: string;
  route: any;
};

export default function PlayersScreen() {
  const router = useRouter();
  const cards = useMemo(() => getPlayersHubCards(), []);
  const players = useStore((state: any) => (Array.isArray(state?.players) ? state.players : []));
  const groups = useStore((state: any) => (Array.isArray(state?.groups) ? state.groups : []));
  const games = useStore((state: any) => (Array.isArray(state?.games) ? state.games : []));

  const resumeRecommendation = useMemo<ResumeRecommendation | null>(() => {
    const groupUsage = new Map<string, number>();

    for (const game of games) {
      const key = String(game?.groupId ?? game?.groupName ?? "").trim();
      if (!key) continue;
      groupUsage.set(key, (groupUsage.get(key) ?? 0) + 1);
    }

    const mostUsedGroup = [...groups]
      .map((group: any) => ({
        group,
        score:
          groupUsage.get(String(group?.id ?? "").trim()) ??
          groupUsage.get(String(group?.name ?? "").trim()) ??
          0,
      }))
      .sort((a, b) => b.score - a.score)[0];

    if (mostUsedGroup?.group && mostUsedGroup.score > 0) {
      return {
        eyebrow: "Most-used group",
        title: mostUsedGroup.group.name ?? "Saved group",
        body: `${mostUsedGroup.score} logged missions.`,
        route: APP_ROUTES.roster,
      };
    }

    const latestGame = [...games]
      .filter((game: any) => typeof game?.createdAt === "number")
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0];

    const recentPlayerId = String(
      latestGame?.manualWinnerId ??
        latestGame?.selectedWinnerId ??
        latestGame?.winnerId ??
        latestGame?.players?.[0]?.id ??
        latestGame?.players?.[0]?.playerId ??
        ""
    ).trim();

    const recentPlayer = players.find((player: any) => String(player?.id) === recentPlayerId);
    if (recentPlayer?.id) {
      return {
        eyebrow: "Recent player",
        title: recentPlayer.name ?? "Recent player",
        body: "Jump back into this profile.",
        route: buildPlayerProfileRoute(String(recentPlayer.id)),
      };
    }

    const newestGroup = [...groups]
      .filter((group: any) => typeof group?.createdAt === "number")
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0];

    if (newestGroup?.id) {
      return {
        eyebrow: "Newest saved group",
        title: newestGroup.name ?? "Saved group",
        body: "Your latest saved table.",
        route: APP_ROUTES.roster,
      };
    }

    return null;
  }, [games, groups, players]);

  return (
    <PageShell preset="quiet" density="compact">
      <HeroCard
        eyebrow="Players"
        title="Roster"
        size="compact"
        variant="stat"
      >
        <View style={styles.heroMetaRow}>
          <MetricPill label="Players" value={players.length} />
          <MetricPill label="Groups" value={groups.length} />
          <MetricPill label="Profiles" value={players.length > 0 ? "Ready" : "Empty"} />
        </View>
      </HeroCard>

      {resumeRecommendation ? (
        <SectionCard title="Resume">
          <Pressable
            onPress={() => router.push(resumeRecommendation.route)}
            style={({ pressed }) => [
              styles.resumeActionCard,
              pressed && styles.resumeActionCardPressed,
            ]}
          >
            <Text style={styles.resumeEyebrow}>{resumeRecommendation.eyebrow}</Text>
            <Text style={styles.resumeTitle}>{resumeRecommendation.title}</Text>
            <Text style={styles.resumeBody}>{resumeRecommendation.body}</Text>
          </Pressable>
        </SectionCard>
      ) : null}

      {players.length === 0 ? (
        <SectionCard title="No roster yet">
          <Pressable
            onPress={() => router.push(APP_ROUTES.roster)}
            style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}
          >
            <Text style={styles.primaryActionText}>Open Roster Tools</Text>
          </Pressable>
        </SectionCard>
      ) : null}

      <SectionCard title="Surfaces">
        <View style={styles.grid}>
          {cards.map((card) => (
            <HubTileCard
              key={card.key}
              description={card.description}
              iconKey={card.iconKey ?? null}
              layout={card.iconKey ? "graphic" : "text"}
              title={card.title}
              badge={card.bestFor}
              style={card.iconKey ? styles.surfaceTileGraphic : styles.surfaceTileText}
              onPress={() => router.push(card.route as any)}
            />
          ))}
        </View>
      </SectionCard>
    </PageShell>
  );
}

function MetricPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.metricPill}>
      <Text variant="metricLabel">{label}</Text>
      <Text variant="metricValue">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricPill: {
    minWidth: 94,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 4,
  },
  resumeActionCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(59,130,246,0.12)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.32)",
    gap: 6,
  },
  resumeActionCardPressed: {
    transform: [{ scale: 0.985 }],
  },
  resumeEyebrow: {
    color: "#93C5FD",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  resumeTitle: {
    color: "#F8FBFF",
    fontSize: 18,
    fontWeight: "900",
  },
  resumeBody: {
    color: "#C7D6F3",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  primaryAction: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(96,165,250,0.18)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.45)",
  },
  primaryActionPressed: {
    transform: [{ scale: 0.985 }],
  },
  primaryActionText: {
    color: "#EAF2FF",
    fontSize: 13,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  surfaceTileGraphic: {
    minHeight: 172,
  },
  surfaceTileText: {
    minHeight: 144,
  },
});
