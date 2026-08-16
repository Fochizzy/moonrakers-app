import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import ActionButton from "@/components/ui/ActionButton";
import HeroCard from "@/components/ui/HeroCard";
import HubTileCard from "@/components/ui/HubTileCard";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import Text from "@/components/ui/Text";
import { useStore } from "@/store/useStore";
import { getPlayersHubCards } from "@/utils/appHubs";
import { APP_ROUTES } from "@/utils/appRoutes";

export default function PlayersScreen() {
  const router = useRouter();
  const cards = useMemo(() => getPlayersHubCards(), []);
  const players = useStore((state) => (Array.isArray(state?.players) ? state.players : []));
  const groups = useStore((state) => (Array.isArray(state?.groups) ? state.groups : []));

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

      <View style={styles.quickActionsRow}>
        <ActionButton
          title="Search player"
          variant="secondary"
          style={styles.quickAction}
          onPress={() => router.push(APP_ROUTES.playerDirectory)}
        />
        <ActionButton
          title="Add player"
          variant="secondary"
          style={styles.quickAction}
          onPress={() => router.push(APP_ROUTES.roster)}
        />
      </View>

      {players.length === 0 ? (
        <SectionCard title="No roster yet">
          <Pressable
            onPress={() => router.push(APP_ROUTES.roster)}
            style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}
          >
            <Text style={styles.primaryActionText}>Open roster</Text>
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
              layout={card.key === "cards" ? "graphic-horizontal" : card.iconKey ? "graphic" : "text"}
              title={card.title}
              badge={card.bestFor}
              style={[
                card.iconKey ? styles.surfaceTileGraphic : styles.surfaceTileText,
                card.key === "cards" ? styles.surfaceTileWide : null,
              ]}
              onPress={() => router.push(card.route)}
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
  quickActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  quickAction: {
    flex: 1,
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
  surfaceTileWide: {
    flexBasis: "100%",
    minHeight: 164,
  },
});
