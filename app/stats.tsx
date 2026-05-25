import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import AnalyticsStateSection from "@/components/analytics/AnalyticsStateSection";
import PlayerSearchPicker from "@/components/players/PlayerSearchPicker";
import DefinitionsJumpLink from "@/components/ui/DefinitionsJumpLink";
import HeroCard from "@/components/ui/HeroCard";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import Text from "@/components/ui/Text";
import ActionButton from "@/components/ui/ActionButton";
import { getStatsScreen } from "@/lib/cloud/analytics/getStatsScreen";
import { useLiveAnalyticsQuery } from "@/lib/cloud/analytics/useLiveAnalyticsQuery";
import { useAnalyticsRefreshTick } from "@/lib/cloud/analytics/useAnalyticsRefreshTick";
import { formatSupabaseConfigError } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { buildChartsRoute, buildHistoryRoute, buildHomeRoute, APP_ROUTES } from "@/utils/appRoutes";
import { resolveAnalyticsRecoveryState } from "@/utils/analyticsRecoveryState";
import { formatDate } from "@/utils/formatters";
import { COLORS } from "@/utils/colors";
import { toNumberValue, toStringValue, toDisplayValue } from "@/utils/numbers";

type StatsTab = "overview" | "players" | "playstyle" | "correlations" | "games";

type PayloadRecord = Record<string, unknown>;


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

export default function StatsScreen() {
  const router = useRouter();
  const authSession = useStore((state: any) => state.authSession);
  const players = useStore((state: any) => (Array.isArray(state?.players) ? state.players : []));
  const games = useStore((state: any) => (Array.isArray(state?.games) ? state.games : []));
  const profileId = String(authSession?.user?.id ?? "").trim();
  const [activeTab, setActiveTab] = useState<StatsTab>("overview");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const deferredPlayerSearchQuery = useDeferredValue(playerSearchQuery);
  const analyticsRefreshTick = useAnalyticsRefreshTick();
  const [error, setError] = useState<string | null>(null);
  const analyticsQuery = useLiveAnalyticsQuery({
    enabled: Boolean(profileId),
    queryKey: `stats-screen:${profileId || "anon"}`,
    load: () =>
      getStatsScreen({
        profileId,
      }),
  });
  useEffect(() => {
    const nextError = analyticsQuery.error;
    if (nextError !== null) {
      setError(formatSupabaseConfigError(nextError) || "Failed to load stats.");
    } else {
      setError(null);
    }
  }, [analyticsQuery.error]);
  const payload = toRecord(analyticsQuery.payload);
  const loading = analyticsQuery.loading;
  const isStale = analyticsQuery.isStale;
  const staleMessage = analyticsQuery.staleMessage;

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
  const sourceKind = isStale ? "server-stale" : "server";
  const sourceLabel = isStale ? "Stale server data" : "Server data";
  const staleSourceCaption = isStale
    ? `Showing the last successful Supabase stats payload.${staleMessage ? ` Latest refresh failure: ${staleMessage}` : ""}`
    : null;

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
  const hasLeagueData =
    overviewCards.length > 0 ||
    topSignals.length > 0 ||
    playstyleHighlights.length > 0 ||
    correlationItems.length > 0 ||
    gamesItems.length > 0 ||
    toNumberValue(hero.games) > 0;
  const overviewRecoveryState = useMemo(
    () =>
      resolveAnalyticsRecoveryState({
        loading,
        error,
        playersCount: players.length,
        gamesCount: games.length,
      }),
    [error, games.length, loading, players.length],
  );
  const playerRecoveryState = useMemo(
    () =>
      resolveAnalyticsRecoveryState({
        loading,
        error,
        playersCount: players.length,
        gamesCount: games.length,
        playerOptionsCount: playerOptions.length,
        hasLeagueData,
        selectedPlayerHasDetail: detailStats.length > 0,
      }),
    [detailStats.length, error, games.length, hasLeagueData, loading, playerOptions.length, players.length],
  );

  function renderSharedRecoveryCard(kind: "no-players" | "no-games" | "player-empty") {
    if (kind === "no-players") {
      return {
        title: "No tracked players yet",
        body: "Set up your roster first so the analytics surfaces have real commanders to work with.",
        primaryAction: {
          label: "Open roster",
          onPress: () => router.push(APP_ROUTES.roster),
        },
        secondaryAction: {
          label: "Profiles",
          onPress: () => router.push(APP_ROUTES.playerDirectory),
          variant: "secondary" as const,
        },
        tone: "warning" as const,
      };
    }

    if (kind === "player-empty") {
      return {
        title: "No player-specific detail yet",
        body: "League data exists, but the current player does not have a full detail payload on this screen yet.",
        primaryAction: {
          label: "Choose another player",
          onPress: () => {
            const fallbackPlayer =
              filteredPlayerOptions.find((player) => player.id !== selectedPlayerId) ??
              playerOptions.find((player) => player.id !== selectedPlayerId) ??
              filteredPlayerOptions[0] ??
              playerOptions[0];
            if (fallbackPlayer?.id) {
              setSelectedPlayerId(fallbackPlayer.id);
            }
          },
        },
        secondaryAction: {
          label: "Open charts",
          onPress: () => router.push(buildChartsRoute()),
          variant: "secondary" as const,
        },
        tone: "warning" as const,
      };
    }

    return {
      title: "No tracked games yet",
      body: "Your roster is ready, but you need mission history before the analytics hub can populate.",
      primaryAction: {
        label: "Start tracked game",
        onPress: () => router.push(buildHomeRoute("game")),
      },
      secondaryAction: {
        label: "Import backup",
        onPress: () => router.push(buildHistoryRoute({ intent: "import" })),
        variant: "secondary" as const,
      },
      tone: "warning" as const,
    };
  }

  function renderOverviewTab() {
    const recoveryProps =
      overviewRecoveryState.kind === "no-players" || overviewRecoveryState.kind === "no-games"
        ? renderSharedRecoveryCard(overviewRecoveryState.kind)
        : null;

    return (
      <AnalyticsStateSection
        eyebrow="Overview"
        title={toStringValue(hero.title, "Mission Snapshot")}
        subtitle={toStringValue(
          hero.takeaway,
          "Supabase is the source of truth for these summaries.",
        )}
        actions={<DefinitionsJumpLink category="scoring" />}
        helpCategory="scoring"
        state={
          loading
            ? "loading"
            : error
              ? "error"
              : recoveryProps
                ? "empty"
                : "ready"
        }
        sourceKind={sourceKind}
        sourceLabel={sourceLabel}
        sourceCaption={
          staleSourceCaption ||
          "League totals, overview cards, and top signals now come from the published Supabase stats payload."
        }
        messageTitle={
          loading ? "Loading stats" : error ? "Stats unavailable" : recoveryProps?.title
        }
        messageBody={
          loading
            ? "Pulling the latest Supabase-authored statistics payload."
            : error
              ? error
              : recoveryProps?.body
        }
        primaryAction={recoveryProps?.primaryAction}
        secondaryAction={recoveryProps?.secondaryAction}
        tone={error ? "danger" : recoveryProps?.tone ?? "info"}
      >
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
              <View
                key={toStringValue(signal.key, `signal-${index}`)}
                style={styles.signalCard}
              >
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
      </AnalyticsStateSection>
    );
  }

  function renderPlayersTab() {
    const recoveryProps =
      playerRecoveryState.kind === "no-players" ||
      playerRecoveryState.kind === "no-games" ||
      playerRecoveryState.kind === "player-empty"
        ? renderSharedRecoveryCard(playerRecoveryState.kind)
        : !playerOptions.length
          ? {
              title: "No player analytics yet",
              body: "Supabase has not returned any player options for this account yet.",
              primaryAction: null,
              secondaryAction: null,
              tone: "warning" as const,
            }
          : null;

    if (loading || error || recoveryProps) {
      return (
        <AnalyticsStateSection
          eyebrow="Players"
          title="Player analytics"
          subtitle="Inspect the published player directory and detail cards authored by Supabase."
          actions={<DefinitionsJumpLink category="efficiency" />}
          helpCategory="efficiency"
          state={loading ? "loading" : error ? "error" : "empty"}
          sourceKind={sourceKind}
          sourceLabel={sourceLabel}
          sourceCaption={staleSourceCaption}
          messageTitle={
            loading
              ? "Loading player analytics"
              : error
                ? "Player analytics unavailable"
                : recoveryProps?.title
          }
          messageBody={
            loading
              ? "Refreshing player cards from the Supabase stats payload."
              : error
                ? error
                : recoveryProps?.body
          }
          primaryAction={recoveryProps?.primaryAction ?? null}
          secondaryAction={recoveryProps?.secondaryAction ?? null}
          tone={error ? "danger" : recoveryProps?.tone ?? "warning"}
        />
      );
    }

    return (
      <View style={styles.playersList}>
        <SectionCard title="Player Directory">
          <PlayerSearchPicker
            query={playerSearchQuery}
            onQueryChange={setPlayerSearchQuery}
            placeholder="Search players"
            items={filteredPlayerOptions.map((player) => ({
              id: player.id,
              label: player.label,
              meta:
                player.displayName ||
                player.playerName ||
                "Supabase-authored player entry",
            }))}
            selectedIds={selectedPlayerId ? [selectedPlayerId] : []}
            onSelect={setSelectedPlayerId}
            nestedScrollEnabled
          />
        </SectionCard>

        <AnalyticsStateSection
          eyebrow="Player Detail"
          title={toStringValue(selectedPlayerDetail.label, "Selected player")}
          subtitle={toStringValue(
            selectedPlayerDetail.summary,
            "Supabase will populate this panel with richer player detail as analytics contracts expand.",
          )}
          actions={<DefinitionsJumpLink category="efficiency" />}
          helpCategory="efficiency"
          state="ready"
          sourceKind={sourceKind}
          sourceLabel={sourceLabel}
          sourceCaption={
            staleSourceCaption ||
            "This detail card is published from the shared stats payload, so the same player read can be reused across analytics surfaces."
          }
        >
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
        </AnalyticsStateSection>
      </View>
    );
  }

  function renderPlaystyleTab() {
    const recoveryProps =
      overviewRecoveryState.kind === "no-players" || overviewRecoveryState.kind === "no-games"
        ? renderSharedRecoveryCard(overviewRecoveryState.kind)
        : null;
    const spotlightEntry = playstyleHighlights[0] ?? null;
    const supportingEntries = playstyleHighlights.slice(1);

    return (
      <AnalyticsStateSection
        eyebrow="Spotlight"
        title="Playstyle Spotlight"
        subtitle={toStringValue(
          playstyleSection.summary,
          "Stay-at-base tempo, style reads, and support fingerprints now lead the scouting pass on this screen.",
        )}
        actions={
          <View style={styles.sectionActions}>
            <DefinitionsJumpLink label="Playstyle" metric="playstyle" />
            <DefinitionsJumpLink label="Efficiency" category="efficiency" />
          </View>
        }
        helpMetric="playstyle"
        state={
          loading
            ? "loading"
            : error
              ? "error"
              : recoveryProps
                ? "empty"
                : "ready"
        }
        sourceKind={sourceKind}
        sourceLabel={sourceLabel}
        sourceCaption={
          staleSourceCaption ||
          "Playstyle spotlight is published from Supabase so stay-at-base tempo and style read stay consistent with the deeper player intel surfaces."
        }
        messageTitle={
          loading
            ? "Loading playstyle"
            : error
              ? "Playstyle unavailable"
              : recoveryProps?.title
        }
        messageBody={
          loading
            ? "Fetching playstyle summaries from Supabase."
            : error
              ? error
              : recoveryProps?.body
        }
        primaryAction={recoveryProps?.primaryAction}
        secondaryAction={recoveryProps?.secondaryAction}
        tone={error ? "danger" : recoveryProps?.tone ?? "info"}
      >
        {playstyleHighlights.length > 0 ? (
          <View style={styles.signalSection}>
            <Text style={styles.playstyleLead}>
              Stay-at-base tempo, base-rate share, and style read are now treated like first-pass scouting clues instead of background stats.
            </Text>
            {spotlightEntry ? (
              <View style={styles.playstyleSpotlightCard}>
                <Text style={styles.playstyleSpotlightEyebrow}>Stay-at-Base Spotlight</Text>
                <Text style={styles.playstyleSpotlightLabel}>
                  {toStringValue(spotlightEntry.label, "Playstyle signal")}
                </Text>
                <Text style={styles.playstyleSpotlightValue}>
                  {toDisplayValue(spotlightEntry.value)}
                </Text>
              </View>
            ) : null}
            {supportingEntries.map((entry, index) => (
              <View key={toStringValue(entry.key, `playstyle-${index}`)} style={styles.signalCard}>
                <Text style={styles.signalRank}>#{index + 2}</Text>
                <View style={styles.signalBody}>
                  <Text style={styles.signalLabel}>
                    {toStringValue(entry.label, `Highlight ${index + 2}`)}
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
      </AnalyticsStateSection>
    );
  }

  function renderCorrelationsTab() {
    const recoveryProps =
      overviewRecoveryState.kind === "no-players" || overviewRecoveryState.kind === "no-games"
        ? renderSharedRecoveryCard(overviewRecoveryState.kind)
        : null;

    return (
      <AnalyticsStateSection
        eyebrow="Insights"
        title="Correlation feed"
        subtitle={toStringValue(
          correlationsSection.summary,
          "These correlation summaries now come from Supabase instead of local derivation.",
        )}
        actions={<DefinitionsJumpLink category="correlations" />}
        helpCategory="correlations"
        state={
          loading
            ? "loading"
            : error
              ? "error"
              : recoveryProps
                ? "empty"
                : "ready"
        }
        sourceKind={sourceKind}
        sourceLabel={sourceLabel}
        sourceCaption={
          staleSourceCaption ||
          "Correlation entries below are served from the Supabase insights payload instead of route-local math."
        }
        messageTitle={
          loading
            ? "Loading correlations"
            : error
              ? "Correlations unavailable"
              : recoveryProps?.title
        }
        messageBody={
          loading
            ? "Waiting for Supabase-authored correlation data."
            : error
              ? error
              : recoveryProps?.body
        }
        primaryAction={recoveryProps?.primaryAction}
        secondaryAction={recoveryProps?.secondaryAction}
        tone={error ? "danger" : recoveryProps?.tone ?? "info"}
      >
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
      </AnalyticsStateSection>
    );
  }

  function renderGamesTab() {
    const recoveryProps =
      overviewRecoveryState.kind === "no-players" || overviewRecoveryState.kind === "no-games"
        ? renderSharedRecoveryCard(overviewRecoveryState.kind)
        : null;

    return (
      <AnalyticsStateSection
        eyebrow="Games"
        title="Supabase summary"
        subtitle="Any game-level summaries on this screen now come from Supabase."
        state={
          loading
            ? "loading"
            : error
              ? "error"
              : recoveryProps
                ? "empty"
                : "ready"
        }
        sourceKind={sourceKind}
        sourceLabel={sourceLabel}
        sourceCaption={
          staleSourceCaption ||
          "This game summary is published from Supabase so it stays aligned with the other analytics hubs."
        }
        messageTitle={
          loading
            ? "Loading game summaries"
            : error
              ? "Game analytics unavailable"
              : recoveryProps?.title
        }
        messageBody={
          loading
            ? "Requesting server-authored game analytics."
            : error
              ? error
              : recoveryProps?.body
        }
        primaryAction={recoveryProps?.primaryAction}
        secondaryAction={recoveryProps?.secondaryAction}
        tone={error ? "danger" : recoveryProps?.tone ?? "info"}
      >
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
      </AnalyticsStateSection>
    );
  }

  return (
    <PageShell preset="analytics">
      <HeroCard
        eyebrow="Statistics"
        title="Statistics"
        subtitle={
          error
            ? error
            : loading
              ? "Loading Supabase-authored statistics."
              : toStringValue(
                  hero.takeaway,
                  "Supabase now authors the statistics payload for this screen.",
                )
        }
        size="compact"
      >
        <View style={styles.heroHeader}>
          <View style={styles.heroTitleWrap}>
            <Text style={styles.heroTitle}>Mission Snapshot</Text>
          </View>
          <Pressable onPress={() => router.push(APP_ROUTES.home)} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back to Command</Text>
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
      </HeroCard>

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
    </PageShell>
  );
}

const styles = StyleSheet.create({
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  heroTitleWrap: {
    flex: 1,
  },
  heroTitle: {
    color: "#EAF2FF",
    fontSize: 18,
    fontWeight: "900",
  },
  backButton: {
    alignSelf: "flex-start",
  },
  backButtonText: {
    color: "#7D9BC4",
    fontSize: 12,
    fontWeight: "700",
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
  primaryTabPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
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
  emptyInlineText: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 17,
  },
  sectionActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  playstyleLead: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 17,
  },
  playstyleSpotlightCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.28)",
    backgroundColor: "rgba(11,28,25,0.94)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  playstyleSpotlightEyebrow: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  playstyleSpotlightLabel: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "900",
  },
  playstyleSpotlightValue: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: "900",
  },
});
