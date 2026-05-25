import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import PlayerCardIcon from "@/components/player/PlayerCardIcon";
import ActionButton from "@/components/ui/ActionButton";
import HeroCard from "@/components/ui/HeroCard";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import Text from "@/components/ui/Text";
import { usePlayers } from "@/store/useStore";
import { APP_ROUTES, buildPlayerProfileRoute } from "@/utils/appRoutes";
import { COLORS } from "@/utils/colors";
import { getPlayerAccentColor } from "@/utils/turnTheme";

type Player = {
  id: string;
  name?: string;
  initials?: string;
  color?: string;
  assignedCardArtIndex?: number | null;
  artIndex?: number | null;
};

export default function PlayerIndexScreen() {
  const router = useRouter();
  const rawPlayers = usePlayers() ?? [];
  const [playerSearch, setPlayerSearch] = useState("");

  const players = useMemo<Player[]>(
    () =>
      rawPlayers
        .filter((player: any) => player?.id)
        .sort((a: any, b: any) =>
          String(a?.name ?? "").localeCompare(String(b?.name ?? ""))
        ),
    [rawPlayers]
  );

  const normalizedSearch = playerSearch.trim().toLowerCase();
  const filteredPlayers = useMemo(() => {
    if (!normalizedSearch) {
      return players;
    }

    return players.filter((player) => {
      const name = String(player.name ?? "").toLowerCase();
      const initials = String(player.initials ?? "").toLowerCase();
      return name.includes(normalizedSearch) || initials.includes(normalizedSearch);
    });
  }, [normalizedSearch, players]);

  const resultsSubtitle = players.length
    ? `${filteredPlayers.length} shown${normalizedSearch ? ` for "${playerSearch.trim()}"` : ""}.`
    : "Add players or import a backup to populate this page.";

  return (
    <PageShell preset="quiet" density="compact">
      <HeroCard
        eyebrow="Player Directory"
        title="Select a Player"
        subtitle="Search the roster and jump straight into a full profile."
        size="compact"
        variant="stat"
        actions={
          <ActionButton
            title="Manage roster"
            variant="secondary"
            onPress={() => router.push(APP_ROUTES.roster)}
          />
        }
      >
        <View style={styles.heroMetaRow}>
          <MetricPill label="Players" value={players.length} />
          <MetricPill label="Results" value={filteredPlayers.length} />
          <MetricPill
            label="Search"
            value={normalizedSearch ? "Filtered" : "All"}
          />
        </View>
      </HeroCard>

      <SectionCard
        title="Search"
        subtitle="Filter by player name or initials."
      >
        <TextInput
          value={playerSearch}
          onChangeText={setPlayerSearch}
          placeholder="Search players"
          placeholderTextColor={COLORS.muted}
          style={styles.searchInput}
        />
      </SectionCard>

      <SectionCard title="Players" subtitle={resultsSubtitle}>
        {players.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No players found</Text>
            <Text style={styles.emptyText}>
              Add players or import a backup, then come back here to open a full
              profile.
            </Text>
            <ActionButton
              title="Open roster"
              onPress={() => router.push(APP_ROUTES.roster)}
            />
          </View>
        ) : filteredPlayers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No matching players</Text>
            <Text style={styles.emptyText}>
              Try a different player name or initials.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredPlayers.map((player) => {
              const accent = getPlayerAccentColor(player.color);

              return (
                <Pressable
                  key={player.id}
                  onPress={() => router.push(buildPlayerProfileRoute(player.id))}
                  style={({ pressed }) => [
                    styles.card,
                    {
                      borderColor: `${accent}55`,
                      shadowColor: accent,
                    },
                    pressed && styles.cardPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.cardGlow,
                      { backgroundColor: `${accent}20` },
                    ]}
                  />
                  <View
                    style={[
                      styles.cardTopAccent,
                      { backgroundColor: `${accent}D9` },
                    ]}
                  />

                  <View style={styles.iconWrap}>
                    <PlayerCardIcon
                      player={player}
                      size={88}
                      borderRadius={16}
                      showInitial={false}
                    />
                  </View>

                  <View style={styles.nameBlock}>
                    <Text style={styles.cardName} numberOfLines={2}>
                      {player.name ?? "Unknown Player"}
                    </Text>

                    <View
                      style={[
                        styles.cardPill,
                        {
                          borderColor: `${accent}55`,
                          backgroundColor: `${accent}16`,
                        },
                      ]}
                    >
                      <Text style={[styles.cardMeta, { color: accent }]}>
                        Open Profile
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
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
    minWidth: 92,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 4,
  },
  searchInput: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyState: {
    gap: 10,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    width: "48.2%",
    minHeight: 188,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: COLORS.cardAlt,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    gap: 12,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  cardPressed: {
    transform: [{ scale: 0.97 }],
  },
  cardGlow: {
    position: "absolute",
    top: -24,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 999,
  },
  cardTopAccent: {
    position: "absolute",
    top: 0,
    left: 14,
    right: 14,
    height: 3,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
  },
  iconWrap: {
    marginTop: 2,
    padding: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: COLORS.whiteSoft,
  },
  nameBlock: {
    width: "100%",
    alignItems: "center",
    gap: 8,
  },
  cardName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  cardPill: {
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMeta: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
});
