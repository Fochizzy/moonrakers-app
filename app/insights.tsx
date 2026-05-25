import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CorrelationStats from "@/components/CorrelationStats";
import ScreenBackground from "@/components/ui/ScreenBackground";
import { getInsightsScreen } from "@/lib/cloud/analytics/getInsightsScreen";
import { useAnalyticsRefreshTick } from "@/lib/cloud/analytics/useAnalyticsRefreshTick";
import { formatSupabaseConfigError } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { APP_ROUTES } from "@/utils/appRoutes";

type PayloadRecord = Record<string, unknown>;

type InsightSectionTab =
  | "pairingCorrelations"
  | "macroCorrelations"
  | "topSynergyPairs";

type PlayerOption = {
  id: string;
  label: string;
  displayName: string;
  playerName: string;
};

const insightSectionTabs: Array<{
  key: InsightSectionTab;
  label: string;
}> = [
  { key: "pairingCorrelations", label: "Personal Correlations" },
  { key: "macroCorrelations", label: "Macro Correlations" },
  { key: "topSynergyPairs", label: "Top Synergy Pairs" },
];

function toRecord(value: unknown): PayloadRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as PayloadRecord)
    : {};
}

function toArray(value: unknown): PayloadRecord[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is PayloadRecord =>
          Boolean(entry) && typeof entry === "object",
      )
    : [];
}

function toStringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizePlayerOption(entry: PayloadRecord, index: number): PlayerOption {
  const label =
    toStringValue(entry.label, "") ||
    toStringValue(entry.displayName, "") ||
    toStringValue(entry.playerName, "") ||
    `Player ${index + 1}`;

  return {
    id: toStringValue(entry.id, `player-${index}`),
    label,
    displayName: toStringValue(entry.displayName, ""),
    playerName: toStringValue(entry.playerName, ""),
  };
}

function SectionTabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.sectionTabButton}>
      <Text
        numberOfLines={1}
        style={[
          styles.sectionTabButtonText,
          active && styles.sectionTabButtonTextActive,
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.sectionTabUnderline,
          active && styles.sectionTabUnderlineActive,
        ]}
      />
    </Pressable>
  );
}

export default function InsightsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const authSession = useStore((state: any) => state.authSession);
  const analyticsRefreshTick = useAnalyticsRefreshTick();
  const authProfileId = String(authSession?.user?.id ?? "").trim() || null;
  const [activeSectionTab, setActiveSectionTab] =
    useState<InsightSectionTab>("pairingCorrelations");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const deferredPlayerSearchQuery = useDeferredValue(playerSearchQuery);
  const [payload, setPayload] = useState<PayloadRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authProfileId) {
      setSelectedProfileId(null);
      return;
    }

    setSelectedProfileId((current) => current ?? authProfileId ?? null);
  }, [authProfileId]);

  const activeProfileId = String(selectedProfileId ?? authProfileId ?? "").trim();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!activeProfileId) {
        if (!cancelled) {
          setPayload(null);
          setError(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextPayload = await getInsightsScreen({
          profileId: activeProfileId,
        });

        if (!cancelled) {
          setPayload(toRecord(nextPayload));
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            formatSupabaseConfigError(nextError) || "Failed to load insights.",
          );
          setPayload(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [activeProfileId, analyticsRefreshTick]);

  const correlationPayload = toRecord(payload?.correlations);
  const playerOptions = useMemo(() => {
    const source = toArray(correlationPayload.players).length
      ? toArray(correlationPayload.players)
      : toArray(correlationPayload.playerOptions);

    return source.map(normalizePlayerOption);
  }, [correlationPayload.playerOptions, correlationPayload.players]);

  useEffect(() => {
    if (!playerOptions.length) {
      return;
    }

    if (
      selectedProfileId &&
      playerOptions.some((player) => player.id === selectedProfileId)
    ) {
      return;
    }

    const fallbackId =
      playerOptions.find((player) => player.id === authProfileId)?.id ??
      playerOptions[0]?.id ??
      null;

    if (fallbackId) {
      setSelectedProfileId(fallbackId);
    }
  }, [authProfileId, playerOptions, selectedProfileId]);

  const normalizedQuery = deferredPlayerSearchQuery.trim().toLowerCase();
  const filteredPlayerOptions = useMemo(() => {
    if (!normalizedQuery) {
      return playerOptions;
    }

    return playerOptions.filter((player) => {
      const searchTargets = [
        player.label,
        player.displayName,
        player.playerName,
      ]
        .filter(Boolean)
        .map((value) => value.toLowerCase());

      return searchTargets.some((value) => value.includes(normalizedQuery));
    });
  }, [normalizedQuery, playerOptions]);

  const selectedPlayer = useMemo(
    () =>
      playerOptions.find((player) => player.id === selectedProfileId) ?? null,
    [playerOptions, selectedProfileId],
  );

  const correlationPlayers = useMemo(
    () =>
      playerOptions.map((player) => ({
        id: player.id,
        name: player.label,
      })),
    [playerOptions],
  );

  const heroSubtitle = error
    ? error
    : loading
      ? "Loading Supabase-authored insights."
      : selectedPlayer?.label
        ? `Server-authored correlation clues and synergy trends for ${selectedPlayer.label}.`
        : "Server-authored correlation clues and synergy trends.";

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundLayer}>
        <ScreenBackground preset="analytics" />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: 14 + insets.top,
            paddingBottom: 28 + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.title}>Insights Hub</Text>
            <Pressable
              style={styles.commandButton}
              onPress={() => router.push(APP_ROUTES.home)}
            >
              <Text style={styles.commandButtonText}>Back to Command</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>{heroSubtitle}</Text>

          <View style={styles.linkRow}>
            <Pressable
              style={styles.linkButton}
              onPress={() => router.push(APP_ROUTES.compare)}
            >
              <Text style={styles.linkButtonText}>Compare</Text>
            </Pressable>

            <Pressable
              style={styles.linkButton}
              onPress={() => router.push(APP_ROUTES.stats)}
            >
              <Text style={styles.linkButtonText}>Stats</Text>
            </Pressable>

            <Pressable
              style={styles.linkButton}
              onPress={() =>
                router.push({
                  pathname: "/charts/[chartKey]",
                  params: { chartKey: "elo" },
                } as any)
              }
            >
              <Text style={styles.linkButtonText}>Elo</Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            contentContainerStyle={styles.sectionTabRail}
            showsHorizontalScrollIndicator={false}
          >
            {insightSectionTabs.map((tab) => (
              <SectionTabButton
                key={tab.key}
                label={tab.label}
                active={activeSectionTab === tab.key}
                onPress={() => setActiveSectionTab(tab.key)}
              />
            ))}
          </ScrollView>
        </View>

        {activeSectionTab === "pairingCorrelations" && (
          <>
            <View style={styles.playerSearchPanel}>
              <Text style={styles.playerSearchLabel}>Correlation Player</Text>
              <Text style={styles.playerSearchHint}>
                {selectedPlayer?.id === authProfileId
                  ? "Opened on your profile. Search to switch whose personal correlations you are viewing."
                  : "Search and tap a player to switch whose personal correlations are shown here."}
              </Text>
              <TextInput
                value={playerSearchQuery}
                onChangeText={setPlayerSearchQuery}
                placeholder="Search players"
                placeholderTextColor="rgba(148,163,184,0.75)"
                style={styles.playerSearchInput}
              />
              <ScrollView
                style={styles.playerSearchResults}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.playerSearchResultsContent}>
                  {filteredPlayerOptions.length > 0 ? (
                    filteredPlayerOptions.map((player) => {
                      const active = selectedProfileId === player.id;
                      const meta =
                        player.displayName ||
                        player.playerName ||
                        (player.id === authProfileId
                          ? "Signed-in player"
                          : "Shared-network player");

                      return (
                        <Pressable
                          key={player.id}
                          style={[
                            styles.playerSearchResult,
                            active && styles.playerSearchResultActive,
                          ]}
                          onPress={() => setSelectedProfileId(player.id)}
                        >
                          <View style={styles.playerSearchResultTextWrap}>
                            <Text style={styles.playerSearchResultName}>
                              {player.label}
                            </Text>
                            <Text style={styles.playerSearchResultMeta}>
                              {meta}
                            </Text>
                          </View>
                          <Text style={styles.playerSearchResultAction}>
                            {active ? "Selected" : "View"}
                          </Text>
                        </Pressable>
                      );
                    })
                  ) : (
                    <Text style={styles.playerSearchEmpty}>
                      No players match this search.
                    </Text>
                  )}
                </View>
              </ScrollView>
            </View>

            <CorrelationStats
              players={correlationPlayers}
              serverData={correlationPayload}
              serverOnly
              view="pairing"
            />
          </>
        )}

        {activeSectionTab === "macroCorrelations" && (
          <CorrelationStats
            players={correlationPlayers}
            serverData={correlationPayload}
            serverOnly
            view="macro"
          />
        )}

        {activeSectionTab === "topSynergyPairs" && (
          <CorrelationStats
            players={correlationPlayers}
            serverData={correlationPayload}
            serverOnly
            view="synergy"
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#081120",
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    padding: 14,
    gap: 12,
  },
  heroCard: {
    backgroundColor: "#162033",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#253247",
    gap: 10,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f8fafc",
    flex: 1,
  },
  commandButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#0f172a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  commandButtonText: {
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: "#cbd5e1",
  },
  linkRow: {
    flexDirection: "row",
    gap: 8,
  },
  linkButton: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  linkButtonText: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  sectionTabRail: {
    paddingTop: 4,
    paddingRight: 8,
    gap: 14,
    alignItems: "flex-end",
  },
  sectionTabButton: {
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 6,
  },
  sectionTabButtonText: {
    color: "#AFC3E8",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.15,
  },
  sectionTabButtonTextActive: {
    color: "#f8fafc",
  },
  sectionTabUnderline: {
    width: "100%",
    minWidth: 40,
    height: 2,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  sectionTabUnderlineActive: {
    backgroundColor: "#67e8f9",
  },
  playerSearchPanel: {
    gap: 6,
    borderRadius: 14,
    padding: 10,
    backgroundColor: "rgba(12,20,36,0.94)",
    borderWidth: 1,
    borderColor: "#253247",
  },
  playerSearchLabel: {
    color: "#67e8f9",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  playerSearchHint: {
    color: "#94a3b8",
    fontSize: 11,
    lineHeight: 17,
  },
  playerSearchInput: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#253247",
    backgroundColor: "rgba(255,255,255,0.04)",
    color: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: "700",
  },
  playerSearchResults: {
    maxHeight: 210,
  },
  playerSearchResultsContent: {
    gap: 6,
    paddingBottom: 2,
  },
  playerSearchResult: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#253247",
    backgroundColor: "rgba(15,23,42,0.92)",
  },
  playerSearchResultActive: {
    borderColor: "#67e8f9",
  },
  playerSearchResultTextWrap: {
    flex: 1,
    gap: 2,
  },
  playerSearchResultName: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "800",
  },
  playerSearchResultMeta: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "700",
  },
  playerSearchResultAction: {
    color: "#67e8f9",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  playerSearchEmpty: {
    color: "#94a3b8",
    fontSize: 11,
    lineHeight: 17,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
});
