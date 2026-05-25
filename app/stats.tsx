import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ScreenBackground from "@/components/ui/ScreenBackground";
import Text from "@/components/ui/Text";
import { getStatsScreen } from "@/lib/cloud/analytics/getStatsScreen";
import { useAnalyticsRefreshTick } from "@/lib/cloud/analytics/useAnalyticsRefreshTick";
import { formatSupabaseConfigError } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { formatDate } from "@/utils/formatters";
import { APP_ROUTES } from "@/utils/appRoutes";

type StatsTab = "overview" | "players" | "playstyle" | "correlations" | "games";

type PayloadRecord = Record<string, unknown>;

const COLORS = {
  bg: "#040814",
  surface: "#0A1428",
  surfaceAlt: "#0F172A",
  surfaceGlass: "#0B1323",
  borderSoft: "rgba(148, 163, 184, 0.18)",
  borderStrong: "rgba(139, 92, 246, 0.36)",
  textPrimary: "#F8FBFF",
  textSecondary: "#C7D6F3",
  textMuted: "#8EA6C8",
  cyan: "#67E8F9",
  success: "#22c55e",
  danger: "#ef4444",
  gold: "#FBBF24",
  purple: "#A855F7",
  blueGlow: "#60A5FA",
};

function toRecord(value: unknown): PayloadRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as PayloadRecord)
    : {};
}

function toArray(value: unknown): PayloadRecord[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is PayloadRecord => Boolean(entry) && typeof entry === "object")
    : [];
}

function toStringValue(value: unknown, fallback = "—") {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

function toNumberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toDisplayValue(value: unknown, fallback = "—") {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  return fallback;
}

function normalizeStatsList(value: unknown) {
  return Object.entries(toRecord(value)).map(([key, entry]) => ({
    key,
    label: key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " "),
    value: toDisplayValue(entry),
  }));
}

function normalizePlayerOption(entry: PayloadRecord, index: number) {
  const id = toStringValue(entry.id, `player-${index}`);
  const displayName = toStringValue(entry.displayName, "");
  const playerName = toStringValue(entry.playerName, "");
  const label = toStringValue(entry.label, "") || displayName || playerName || `Player ${index + 1}`;

  return {
    id,
    label,
    playerName,
    displayName,
  };
}

function formatGeneratedAtValue(value: unknown) {
  if (
    typeof value !== "string" &&
    typeof value !== "number" &&
    !(value instanceof Date)
  ) {
    return null;
  }

  const formatted = formatDate(value);
  return formatted === "Invalid Date" ? null : formatted;
}

function normalizeTopSignals(value: unknown, generatedAt: unknown) {
  const formattedGeneratedAt = formatGeneratedAtValue(generatedAt);
  const topSignals = toArray(value).map((signal) => {
    const signalKey = toStringValue(signal.key, "");
    if (signalKey !== "refresh-status" && signalKey !== "last-refreshed") {
      return signal;
    }

    return {
      ...signal,
      label: "Last refreshed",
      value: formattedGeneratedAt ?? "Unavailable",
    };
  });

  if (!formattedGeneratedAt) {
    return topSignals;
  }

  const hasRefreshSignal = topSignals.some((signal) => {
    const signalKey = toStringValue(signal.key, "");
    return signalKey === "refresh-status" || signalKey === "last-refreshed";
  });

  if (hasRefreshSignal) {
    return topSignals;
  }

  return [
    {
      key: "last-refreshed",
      label: "Last refreshed",
      value: formattedGeneratedAt,
    },
    ...topSignals,
  ];
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.tabButton}>
      <Text
        numberOfLines={1}
        style={[styles.tabButtonText, active && styles.tabButtonTextActive]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.tabButtonUnderline,
          active && styles.tabButtonUnderlineActive,
        ]}
      />
    </Pressable>
  );
}

function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <View
      style={[
        styles.statPill,
        accent
          ? { borderColor: `${accent}88`, backgroundColor: `${accent}12` }
          : null,
      ]}
    >
      <Text style={styles.statPillLabel}>{label}</Text>
      <Text style={styles.statPillValue}>{value}</Text>
    </View>
  );
}

function EmptyCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{body}</Text>
    </View>
  );
}

function SectionTitle({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string;
  title: string;
  meta?: string | null;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      {meta ? <Text style={styles.subtitle}>{meta}</Text> : null}
    </View>
  );
}

export default function StatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const authSession = useStore((state: any) => state.authSession);
  const analyticsRefreshTick = useAnalyticsRefreshTick();
  const [activeTab, setActiveTab] = useState<StatsTab>("overview");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const deferredPlayerSearchQuery = useDeferredValue(playerSearchQuery);
  const [payload, setPayload] = useState<PayloadRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const profileId = String(authSession?.user?.id ?? "").trim();
      if (!profileId) {
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
        const nextPayload = await getStatsScreen({
          profileId,
        });

        if (!cancelled) {
          setPayload(toRecord(nextPayload));
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(formatSupabaseConfigError(nextError) || "Failed to load stats.");
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
  }, [authSession?.user?.id, analyticsRefreshTick]);

  const overview = toRecord(payload?.overview);
  const hero = toRecord(overview.hero);
  const heroHighlights = [
    { label: "Players", value: toDisplayValue(hero.players, "0") },
    { label: "Games", value: toDisplayValue(hero.games, "0") },
    { label: "Takeaway", value: toStringValue(hero.takeaway, "Awaiting analytics") },
  ];
  const overviewCards = toArray(overview.cards);
  const topSignals = normalizeTopSignals(overview.topSignals, payload?.generatedAt);
  const playersSection = toRecord(payload?.players);
  const playstyleSection = toRecord(payload?.playstyle);
  const correlationsSection = toRecord(payload?.correlations);
  const gamesSection = toRecord(payload?.games);
  const playerOptions = toArray(playersSection.options).map(normalizePlayerOption);

  useEffect(() => {
    const preferredPlayerId = toStringValue(playersSection.selectedPlayerId, "");
    if (!preferredPlayerId) {
      if (!selectedPlayerId && playerOptions[0]?.id) {
        setSelectedPlayerId(playerOptions[0].id);
      }
      return;
    }

    setSelectedPlayerId((current) => current ?? preferredPlayerId);
  }, [playerOptions, playersSection.selectedPlayerId, selectedPlayerId]);

  const normalizedQuery = deferredPlayerSearchQuery.trim().toLowerCase();
  const filteredPlayerOptions = useMemo(() => {
    if (!normalizedQuery) {
      return playerOptions;
    }

    return playerOptions.filter((player) =>
      player.label.toLowerCase().includes(normalizedQuery),
    );
  }, [normalizedQuery, playerOptions]);

  const selectedPlayerDetail = useMemo(() => {
    const detail = toRecord(playersSection.detail);
    const detailPlayerId = toStringValue(detail.playerId, "");
    if (!detailPlayerId || !selectedPlayerId || detailPlayerId === selectedPlayerId) {
      return detail;
    }

    const selectedPlayer = playerOptions.find((player) => player.id === selectedPlayerId);
    return {
      playerId: selectedPlayerId,
      label: selectedPlayer?.label ?? "Selected player",
      summary: "This Supabase payload does not yet expose a separate detail card for the selected player.",
      stats: {},
    };
  }, [playerOptions, playersSection.detail, selectedPlayerId]);

  const playstyleHighlights = toArray(playstyleSection.highlights);
  const correlationItems = [
    ...toArray(correlationsSection.items),
    ...toArray(correlationsSection.pairing),
    ...toArray(correlationsSection.macro),
  ];
  const gamesItems = toArray(gamesSection.items);
  const detailStats = normalizeStatsList(selectedPlayerDetail.stats);

  function renderOverviewTab() {
    if (loading) {
      return (
        <EmptyCard
          title="Loading stats"
          body="Pulling the latest Supabase-authored statistics payload."
        />
      );
    }

    if (error) {
      return <EmptyCard title="Stats unavailable" body={error} />;
    }

    return (
      <View style={styles.card}>
        <SectionTitle
          eyebrow="Overview"
          title={toStringValue(hero.title, "Mission Snapshot")}
          meta={toStringValue(hero.takeaway, "Supabase is the source of truth for these summaries.")}
        />

        <View style={styles.compactGrid}>
          {overviewCards.length > 0 ? (
            overviewCards.map((card, index) => (
              <StatPill
                key={toStringValue(card.key, `overview-card-${index}`)}
                label={toStringValue(card.title ?? card.label, `Card ${index + 1}`)}
                value={toDisplayValue(card.value)}
                accent={index % 2 === 0 ? COLORS.cyan : COLORS.blueGlow}
              />
            ))
          ) : (
            heroHighlights.map((item) => (
              <StatPill
                key={item.label}
                label={item.label}
                value={item.value}
                accent={COLORS.cyan}
              />
            ))
          )}
        </View>

        <View style={styles.signalSection}>
          <Text style={styles.compactSectionTitle}>Top Signals</Text>
          {topSignals.length > 0 ? (
            topSignals.map((signal, index) => (
              <View key={toStringValue(signal.key, `signal-${index}`)} style={styles.signalCard}>
                <Text style={styles.signalRank}>#{index + 1}</Text>
                <View style={styles.signalBody}>
                  <Text style={styles.signalLabel}>
                    {toStringValue(signal.label, `Signal ${index + 1}`)}
                  </Text>
                  <Text style={styles.signalValue}>{toDisplayValue(signal.value)}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyInlineText}>
              Supabase has not returned any top signals yet.
            </Text>
          )}
        </View>
      </View>
    );
  }

  function renderPlayersTab() {
    if (loading) {
      return (
        <EmptyCard
          title="Loading player analytics"
          body="Refreshing player cards from the Supabase stats payload."
        />
      );
    }

    if (error) {
      return <EmptyCard title="Player analytics unavailable" body={error} />;
    }

    if (!playerOptions.length) {
      return (
        <EmptyCard
          title="No player analytics yet"
          body="Supabase has not returned any player options for this account yet."
        />
      );
    }

    return (
      <View style={styles.playersList}>
        <View style={styles.playerSearchPanel}>
          <Text style={styles.playerSearchLabel}>Player Directory</Text>
          <TextInput
            value={playerSearchQuery}
            onChangeText={setPlayerSearchQuery}
            placeholder="Search players"
            placeholderTextColor={COLORS.textMuted}
            style={styles.playerSearchInput}
          />
          <ScrollView
            style={styles.playerSearchResults}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.playerSearchResultsContent}>
              {filteredPlayerOptions.map((player) => {
                const active = player.id === selectedPlayerId;
                return (
                  <Pressable
                    key={player.id}
                    style={[styles.playerSearchResult, active && styles.playerSearchResultActive]}
                    onPress={() => setSelectedPlayerId(player.id)}
                  >
                    <View style={styles.playerSearchResultTextWrap}>
                      <Text style={styles.playerSearchResultName}>{player.label}</Text>
                      <Text style={styles.playerSearchResultMeta}>
                        {player.displayName || player.playerName || "Supabase-authored player entry"}
                      </Text>
                    </View>
                    <Text style={styles.playerSearchResultAction}>
                      {active ? "Selected" : "View"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View style={styles.card}>
          <SectionTitle
            eyebrow="Player Detail"
            title={toStringValue(selectedPlayerDetail.label, "Selected player")}
            meta={toStringValue(
              selectedPlayerDetail.summary,
              "Supabase will populate this panel with richer player detail as analytics contracts expand.",
            )}
          />

          {detailStats.length > 0 ? (
            <View style={styles.compactGrid}>
              {detailStats.map((item) => (
                <StatPill
                  key={item.key}
                  label={item.label}
                  value={item.value}
                  accent={COLORS.purple}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.emptyInlineText}>
              No detailed player stats were returned in the current Supabase payload.
            </Text>
          )}
        </View>
      </View>
    );
  }

  function renderPlaystyleTab() {
    if (loading) {
      return (
        <EmptyCard
          title="Loading playstyle"
          body="Fetching playstyle summaries from Supabase."
        />
      );
    }

    if (error) {
      return <EmptyCard title="Playstyle unavailable" body={error} />;
    }

    return (
      <View style={styles.card}>
        <SectionTitle
          eyebrow="Playstyle"
          title="Server-authored profile"
          meta={toStringValue(
            playstyleSection.summary,
            "Supabase will expand this area with richer playstyle breakdowns over time.",
          )}
        />

        {playstyleHighlights.length > 0 ? (
          <View style={styles.signalSection}>
            {playstyleHighlights.map((entry, index) => (
              <View key={toStringValue(entry.key, `playstyle-${index}`)} style={styles.signalCard}>
                <Text style={styles.signalRank}>#{index + 1}</Text>
                <View style={styles.signalBody}>
                  <Text style={styles.signalLabel}>
                    {toStringValue(entry.label, `Highlight ${index + 1}`)}
                  </Text>
                  <Text style={styles.signalValue}>{toDisplayValue(entry.value)}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyInlineText}>
            No playstyle highlights are available in the current Supabase payload.
          </Text>
        )}
      </View>
    );
  }

  function renderCorrelationsTab() {
    if (loading) {
      return (
        <EmptyCard
          title="Loading correlations"
          body="Waiting for Supabase-authored correlation data."
        />
      );
    }

    if (error) {
      return <EmptyCard title="Correlations unavailable" body={error} />;
    }

    return (
      <View style={styles.card}>
        <SectionTitle
          eyebrow="Insights"
          title="Correlation feed"
          meta={toStringValue(
            correlationsSection.summary,
            "These correlation summaries now come from Supabase instead of local derivation.",
          )}
        />

        {correlationItems.length > 0 ? (
          <View style={styles.signalSection}>
            {correlationItems.map((entry, index) => (
              <View key={toStringValue(entry.key, `correlation-${index}`)} style={styles.signalCard}>
                <Text style={styles.signalRank}>#{index + 1}</Text>
                <View style={styles.signalBody}>
                  <Text style={styles.signalLabel}>
                    {toStringValue(entry.label, `Correlation ${index + 1}`)}
                  </Text>
                  <Text style={styles.signalValue}>{toDisplayValue(entry.value)}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyInlineText}>
            Supabase has not returned any correlation entries yet.
          </Text>
        )}
      </View>
    );
  }

  function renderGamesTab() {
    if (loading) {
      return (
        <EmptyCard
          title="Loading game summaries"
          body="Requesting server-authored game analytics."
        />
      );
    }

    if (error) {
      return <EmptyCard title="Game analytics unavailable" body={error} />;
    }

    return (
      <View style={styles.card}>
        <SectionTitle
          eyebrow="Games"
          title="Supabase summary"
          meta="Any game-level summaries on this screen now come from Supabase."
        />

        {gamesItems.length > 0 ? (
          <View style={styles.signalSection}>
            {gamesItems.map((entry, index) => (
              <View key={toStringValue(entry.id ?? entry.key, `game-${index}`)} style={styles.signalCard}>
                <Text style={styles.signalRank}>#{index + 1}</Text>
                <View style={styles.signalBody}>
                  <Text style={styles.signalLabel}>
                    {toStringValue(entry.label ?? entry.title, `Game ${index + 1}`)}
                  </Text>
                  <Text style={styles.signalValue}>{toDisplayValue(entry.value)}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyInlineText}>
            No game-specific analytics items were returned in the current payload.
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.backgroundLayer}>
        <ScreenBackground preset="analytics" />
        <View style={styles.backgroundDim} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 8 + insets.top,
            paddingBottom: 20 + insets.bottom,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroTitleWrap}>
              <Text style={styles.heroEyebrow}>Statistics</Text>
              <Text style={styles.heroTitle}>Mission Snapshot</Text>
              <Text style={styles.heroSubtitle}>
                {error
                  ? error
                  : loading
                    ? "Loading Supabase-authored statistics."
                    : toStringValue(
                        hero.takeaway,
                        "Supabase now authors the statistics payload for this screen.",
                      )}
              </Text>
            </View>

            <Pressable
              style={styles.commandButton}
              onPress={() => router.push(APP_ROUTES.home)}
            >
              <Text style={styles.commandButtonText}>Back to Command</Text>
            </Pressable>
          </View>

          <View style={styles.statsHeroHighlights}>
            {heroHighlights.map((item) => (
              <View key={item.label} style={styles.heroHighlightPill}>
                <Text style={styles.heroHighlightLabel}>{item.label}</Text>
                <Text style={styles.heroHighlightValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.primaryTabRail}>
          <TabButton
            label="Home"
            active={activeTab === "overview"}
            onPress={() => setActiveTab("overview")}
          />
          <TabButton
            label="Players"
            active={activeTab === "players"}
            onPress={() => setActiveTab("players")}
          />
          <TabButton
            label="Playstyle"
            active={activeTab === "playstyle"}
            onPress={() => setActiveTab("playstyle")}
          />
          <TabButton
            label="Insights"
            active={activeTab === "correlations"}
            onPress={() => setActiveTab("correlations")}
          />
          <TabButton
            label="Games"
            active={activeTab === "games"}
            onPress={() => setActiveTab("games")}
          />
        </View>

        {activeTab === "overview" && renderOverviewTab()}
        {activeTab === "players" && renderPlayersTab()}
        {activeTab === "playstyle" && renderPlaystyleTab()}
        {activeTab === "correlations" && renderCorrelationsTab()}
        {activeTab === "games" && renderGamesTab()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.20)",
  },
  content: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 8,
  },
  heroCard: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    gap: 6,
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  commandButton: {
    alignSelf: "flex-start",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(103, 232, 249, 0.28)",
    backgroundColor: "rgba(8, 18, 32, 0.84)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commandButtonText: {
    color: "#DFF6FF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.35,
  },
  heroEyebrow: {
    color: COLORS.cyan,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "900",
  },
  heroSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  statsHeroHighlights: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
  },
  heroHighlightPill: {
    minWidth: 92,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    gap: 4,
  },
  heroHighlightLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  heroHighlightValue: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "900",
  },
  primaryTabRail: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "flex-end",
    gap: 4,
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 4,
    gap: 6,
  },
  tabButtonText: {
    color: "#AFC3E8",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.15,
  },
  tabButtonTextActive: {
    color: COLORS.textPrimary,
  },
  tabButtonUnderline: {
    width: "100%",
    minWidth: 40,
    height: 2,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  tabButtonUnderlineActive: {
    backgroundColor: COLORS.cyan,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.18)",
    gap: 8,
  },
  sectionHeader: {
    gap: 2,
  },
  eyebrow: {
    color: COLORS.cyan,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 17,
  },
  compactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 6,
  },
  statPill: {
    width: "48.5%",
    minWidth: 0,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
    backgroundColor: "rgba(22,35,56,0.96)",
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    gap: 2,
  },
  statPillLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.45,
  },
  statPillValue: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.textPrimary,
  },
  signalSection: {
    gap: 6,
  },
  compactSectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "900",
  },
  signalCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surfaceAlt,
  },
  signalRank: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: "900",
    minWidth: 24,
  },
  signalBody: {
    flex: 1,
    gap: 2,
  },
  signalLabel: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: "900",
  },
  signalValue: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.gold,
    letterSpacing: 0.25,
  },
  playersList: {
    gap: 8,
  },
  playerSearchPanel: {
    gap: 6,
    borderRadius: 14,
    padding: 10,
    backgroundColor: "rgba(12,20,36,0.94)",
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  playerSearchLabel: {
    color: COLORS.cyan,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  playerSearchInput: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: "rgba(255,255,255,0.04)",
    color: COLORS.textPrimary,
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
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surfaceAlt,
  },
  playerSearchResultActive: {
    borderColor: COLORS.cyan,
  },
  playerSearchResultTextWrap: {
    flex: 1,
    gap: 2,
  },
  playerSearchResultName: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "800",
  },
  playerSearchResultMeta: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
  },
  playerSearchResultAction: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  emptyCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    gap: 6,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "900",
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 17,
  },
  emptyInlineText: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 17,
  },
});
