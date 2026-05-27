import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import AnalyticsStateSection from "@/components/analytics/AnalyticsStateSection";
import AnalyticsControlRail from "@/components/analytics/AnalyticsControlRail";
import PlaystyleSection from "@/components/stats/PlaystyleSection";
import PlayerSearchPicker from "@/components/players/PlayerSearchPicker";
import DefinitionsJumpLink from "@/components/ui/DefinitionsJumpLink";
import DefinitionTermText from "@/components/ui/DefinitionTermText";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import Text from "@/components/ui/Text";
import ActionButton from "@/components/ui/ActionButton";
import { getStatsScreen } from "@/lib/cloud/analytics/getStatsScreen";
import {
  normalizeStatsCorrelationRows,
  normalizeStatsGameRows,
  normalizeStatsPlayerCountOverviewRows,
  normalizeStatsPlayerCountSummaryRows,
} from "@/lib/cloud/analytics/statsScreenDisplay";
import { useLiveAnalyticsQuery } from "@/lib/cloud/analytics/useLiveAnalyticsQuery";
import { useStore } from "@/store/useStore";
import { buildChartsRoute, buildHomeRoute, APP_ROUTES } from "@/utils/appRoutes";
import { useAnalyticsRecovery } from "@/utils/useAnalyticsRecovery";
import { useAnalyticsPresentation } from "@/utils/useAnalyticsPresentation";
import { formatDate } from "@/utils/formatters";
import { COLORS } from "@/utils/colors";
import { toNumberValue, toStringValue, toDisplayValue } from "@/utils/numbers";

type StatsTab = "overview" | "players" | "playstyle" | "correlations" | "games";

type PayloadRecord = Record<string, unknown>;

const statsTabs: Array<{ key: StatsTab; label: string }> = [
  { key: "overview", label: "Home" },
  { key: "players", label: "Players" },
  { key: "playstyle", label: "Playstyle" },
  { key: "correlations", label: "Insights" },
  { key: "games", label: "Games" },
];

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

function hasMetricValue(value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  return true;
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

function StatPill({
  label,
  metric = null,
  value,
  accent,
}: {
  label: string;
  metric?: string | null;
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
      <DefinitionTermText
        label={label}
        metric={metric}
        style={styles.statPillLabel}
      />
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
  const analyticsQuery = useLiveAnalyticsQuery({
    enabled: Boolean(profileId),
    queryKey: `stats-screen:${profileId || "anon"}`,
    load: () =>
      getStatsScreen({
        profileId,
      }),
  });
  const payload = toRecord(analyticsQuery.payload);
  const loading = analyticsQuery.loading;
  const { error, freshness } = useAnalyticsPresentation({
    fallbackMessage: "Failed to load stats.",
    query: analyticsQuery,
    retryLabel: "Retry stats",
    staleEntityLabel: "stats payload",
  });
  const hiddenOverviewCardKeys = new Set(["players", "games", "takeaway"]);

  const overview = toRecord(payload?.overview);
  const hero = toRecord(overview.hero);
  const overviewCards = toArray(overview.cards).filter((card) => {
    const cardKey = toStringValue(card.key, "").toLowerCase();
    const cardLabel = toStringValue(card.title ?? card.label, "").toLowerCase();

    return (
      !hiddenOverviewCardKeys.has(cardKey) &&
      !hiddenOverviewCardKeys.has(cardLabel)
    );
  });
  const topSignals = normalizeTopSignals(overview.topSignals, payload?.generatedAt);
  const halftimeProfile = toRecord(overview.halftimeProfile);
  const contractEfficiency = toRecord(payload?.contractEfficiency);
  const groupMeta = toRecord(payload?.groupMeta);
  const headToHead = toArray(payload?.headToHead);
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
  const correlationItems = normalizeStatsCorrelationRows([
    ...toArray(correlationsSection.items),
    ...toArray(correlationsSection.pairing),
    ...toArray(correlationsSection.macro),
  ]);
  const gamesItems = normalizeStatsGameRows(gamesSection.items);
  const playerCountMetaItems = normalizeStatsPlayerCountOverviewRows(groupMeta.playerCountSplit);
  const playerCountSummaryItems = normalizeStatsPlayerCountSummaryRows(groupMeta.playerCountSplit);
  const detailStats = normalizeStatsList(selectedPlayerDetail.stats);
  const hasAvgSpreadValue = hasMetricValue(groupMeta.avgSpread);
  const hasChaosIndexValue = hasMetricValue(groupMeta.chaosIndex);
  const hasOverviewServerData =
    overviewCards.length > 0 ||
    topSignals.length > 0 ||
    toNumberValue(halftimeProfile.totalGames) > 0 ||
    hasMetricValue(contractEfficiency.avgContractsPerGame) ||
    hasMetricValue(contractEfficiency.contractConversion) ||
    hasMetricValue(contractEfficiency.abandonmentRate) ||
    hasAvgSpreadValue ||
    hasChaosIndexValue ||
    playerCountMetaItems.length > 0 ||
    headToHead.length > 0;
  const hasGamesServerData =
    playerCountSummaryItems.length > 0 ||
    gamesItems.length > 0;
  const hasLeagueData =
    overviewCards.length > 0 ||
    topSignals.length > 0 ||
    playstyleHighlights.length > 0 ||
    correlationItems.length > 0 ||
    playerCountSummaryItems.length > 0 ||
    gamesItems.length > 0 ||
    toNumberValue(hero.games) > 0;
  const {
    recoveryState: overviewRecoveryState,
  } = useAnalyticsRecovery({
    loading,
    error,
    playersCount: players.length,
    gamesCount: games.length,
    context: "stats",
  });
  const { recoveryState: playerRecoveryState } = useAnalyticsRecovery({
    loading,
    error,
    playersCount: players.length,
    gamesCount: games.length,
    playerOptionsCount: playerOptions.length,
    hasLeagueData,
    selectedPlayerHasDetail: detailStats.length > 0,
    context: "stats",
  });

  const sharedRecoveryCards = useMemo(() => ({
    "no-players": {
      title: "No tracked players yet",
      body: "Set up your roster first so the analytics surfaces have real commanders to work with.",
      primaryAction: {
        label: "Open roster",
        onPress: () => router.push(APP_ROUTES.roster),
      },
      secondaryAction: {
        label: "Profiles",
        variant: "secondary" as const,
        onPress: () => router.push(APP_ROUTES.playerDirectory),
      },
      tone: "warning" as const,
    },
    "no-games": {
      title: "No tracked games yet",
      body: "Your roster is ready, but you need mission history before the analytics hub can populate.",
      primaryAction: {
        label: "Start tracked game",
        onPress: () => router.push(buildHomeRoute("game")),
      },
      secondaryAction: null,
      tone: "warning" as const,
    },
    "player-empty": {
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
          if (fallbackPlayer?.id) setSelectedPlayerId(fallbackPlayer.id);
        },
      },
      secondaryAction: {
        label: "Open charts",
        onPress: () => router.push(buildChartsRoute()),
        variant: "secondary" as const,
      },
      tone: "warning" as const,
    },
  }), [filteredPlayerOptions, playerOptions, selectedPlayerId, router]);

  function renderSharedRecoveryCard(kind: "no-players" | "no-games" | "player-empty") {
    return sharedRecoveryCards[kind];
  }

  function renderOverviewTab() {
    const recoveryProps =
      (overviewRecoveryState.kind === "no-players" ||
      overviewRecoveryState.kind === "no-games") &&
      !hasOverviewServerData
        ? renderSharedRecoveryCard(overviewRecoveryState.kind)
        : null;

    return (
      <AnalyticsStateSection
        eyebrow="Overview"
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
        sourceKind={freshness.sourceKind}
        sourceLabel={freshness.sourceLabel}
        sourceCaption={freshness.sourceCaption(
          "League totals, overview cards, and top signals now come from the published Supabase stats payload.",
        )}
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
        primaryAction={freshness.retryAction ?? recoveryProps?.primaryAction}
        secondaryAction={freshness.retryAction ? null : recoveryProps?.secondaryAction}
        tone={error ? "danger" : recoveryProps?.tone ?? "info"}
      >
        {overviewCards.length > 0 ? (
          <View style={styles.compactGrid}>
            {overviewCards.map((card, index) => (
              <StatPill
                key={toStringValue(card.key, `overview-card-${index}`)}
                label={toStringValue(card.title ?? card.label, `Card ${index + 1}`)}
                metric={toStringValue(card.key, "")}
                value={toDisplayValue(card.value)}
                accent={index % 2 === 0 ? COLORS.cyan : COLORS.blueGlow}
              />
            ))}
          </View>
        ) : null}

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
                  <DefinitionTermText
                    label={toStringValue(signal.label, `Signal ${index + 1}`)}
                    metric={toStringValue(signal.key, "")}
                    style={styles.signalLabel}
                  />
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

        {toNumberValue(halftimeProfile.totalGames) > 0 ? (
          <View style={styles.metricSubsection}>
            <DefinitionTermText label="Momentum" style={styles.metricSubsectionTitle} />
            <View style={styles.compactGrid}>
              <StatPill
                label="Comeback rate"
                value={`${Math.round(toNumberValue(halftimeProfile.trailToWinRate) * 100)}%`}
                accent={COLORS.green}
              />
              <StatPill
                label="Lead held"
                value={`${Math.round(toNumberValue(halftimeProfile.leadToWinRate) * 100)}%`}
                accent={COLORS.cyan}
              />
              <StatPill
                label="Leads at half"
                value={`${Math.round(toNumberValue(halftimeProfile.leadRate) * 100)}%`}
              />
              <StatPill
                label="Games tracked"
                value={toDisplayValue(halftimeProfile.totalGames)}
              />
            </View>
          </View>
        ) : null}

        {toNumberValue(contractEfficiency.avgContractsPerGame) > 0 ||
        toNumberValue(contractEfficiency.contractConversion) > 0 ? (
          <View style={styles.metricSubsection}>
            <DefinitionTermText
              label="Contract Efficiency"
              category="efficiency"
              style={styles.metricSubsectionTitle}
            />
            <View style={styles.compactGrid}>
              <StatPill
                label="Contracts / game"
                value={toDisplayValue(contractEfficiency.avgContractsPerGame)}
                accent={COLORS.purple}
              />
              <StatPill
                label="Conversion rate"
                value={`${toDisplayValue(contractEfficiency.contractConversion)}%`}
                accent={COLORS.green}
              />
              <StatPill
                label="Abandonment rate"
                value={`${toDisplayValue(contractEfficiency.abandonmentRate)}%`}
                accent={COLORS.gold}
              />
            </View>
          </View>
        ) : null}

        {(hasAvgSpreadValue ||
        hasChaosIndexValue ||
        playerCountMetaItems.length > 0) ? (
          <View style={styles.metricSubsection}>
            <Text style={styles.metricSubsectionTitle}>Group Meta</Text>
            {hasAvgSpreadValue || hasChaosIndexValue ? (
              <View style={styles.compactGrid}>
                {hasAvgSpreadValue ? (
                  <StatPill
                    label="Avg prestige spread"
                    value={toDisplayValue(groupMeta.avgSpread)}
                    accent={COLORS.cyan}
                  />
                ) : null}
                {hasChaosIndexValue ? (
                  <StatPill
                    label="Chaos index"
                    value={toDisplayValue(groupMeta.chaosIndex)}
                    accent={COLORS.blueGlow}
                  />
                ) : null}
              </View>
            ) : null}
            {playerCountMetaItems.length > 0 ? (
              <View style={styles.signalSection}>
                <Text style={styles.compactSectionTitle}>By Table Size</Text>
                {playerCountMetaItems.map((entry, index) => (
                  <View key={toStringValue(entry.key, `group-meta-${index}`)} style={styles.signalCard}>
                    <View style={styles.signalBody}>
                      <DefinitionTermText
                        label={toStringValue(entry.label, `Bucket ${index + 1}`)}
                        style={styles.signalLabel}
                      />
                      <Text style={styles.signalValue}>{toDisplayValue(entry.value)}</Text>
                      {toStringValue(entry.detail, "").trim() ? (
                        <Text style={styles.signalDetail}>{toStringValue(entry.detail, "")}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {headToHead.length > 0 ? (
          <View style={styles.metricSubsection}>
            <Text style={styles.metricSubsectionTitle}>Head-to-Head</Text>
            {headToHead.slice(0, 5).map((entry, index) => {
              const wins = toNumberValue(entry.wins);
              const losses = toNumberValue(entry.losses);
              const together = toNumberValue(entry.gamesTogether);
              return (
                <View key={toStringValue(entry.opponentId, `h2h-${index}`)} style={styles.signalCard}>
                  <View style={styles.signalBody}>
                    <Text style={styles.signalLabel}>
                      {toStringValue(entry.opponentName, `Opponent ${index + 1}`)}
                    </Text>
                    <Text style={styles.signalValue}>
                      {wins}W – {losses}L ({together} games)
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
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
          sourceKind={freshness.sourceKind}
          sourceLabel={freshness.sourceLabel}
          sourceCaption={freshness.sourceCaption(
            "Published player analytics from the shared Supabase stats payload.",
          )}
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
          primaryAction={freshness.retryAction ?? recoveryProps?.primaryAction ?? null}
          secondaryAction={freshness.retryAction ? null : recoveryProps?.secondaryAction ?? null}
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
          sourceKind={freshness.sourceKind}
          sourceLabel={freshness.sourceLabel}
          sourceCaption={freshness.sourceCaption(
            "This detail card is published from the shared stats payload, so the same player read can be reused across analytics surfaces.",
          )}
        >
          {detailStats.length > 0 ? (
            <View style={styles.compactGrid}>
              {detailStats.map((item) => (
                <StatPill
                  key={item.key}
                  label={item.label}
                  metric={item.key}
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
      <>
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
        sourceKind={freshness.sourceKind}
        sourceLabel={freshness.sourceLabel}
        sourceCaption={freshness.sourceCaption(
          "Playstyle spotlight is published from Supabase so stay-at-base tempo and style read stay consistent with the deeper player intel surfaces.",
        )}
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
        primaryAction={freshness.retryAction ?? recoveryProps?.primaryAction}
        secondaryAction={freshness.retryAction ? null : recoveryProps?.secondaryAction}
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
                  <DefinitionTermText
                    label={toStringValue(entry.label, `Highlight ${index + 2}`)}
                    style={styles.signalLabel}
                  />
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
      <PlaystyleSection
        authProfileId={profileId || null}
        players={players}
        games={games as any}
        leaderboard={players}
        selectedPlayerId={selectedPlayerId}
        onSelectPlayer={setSelectedPlayerId}
      />
      </>
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
        sourceKind={freshness.sourceKind}
        sourceLabel={freshness.sourceLabel}
        sourceCaption={freshness.sourceCaption(
          "Correlation entries below are served from the Supabase insights payload instead of route-local math.",
        )}
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
        primaryAction={freshness.retryAction ?? recoveryProps?.primaryAction}
        secondaryAction={freshness.retryAction ? null : recoveryProps?.secondaryAction}
        tone={error ? "danger" : recoveryProps?.tone ?? "info"}
      >
        {correlationItems.length > 0 ? (
          <View style={styles.signalSection}>
            {correlationItems.map((entry, index) => (
              <View key={toStringValue(entry.key, `correlation-${index}`)} style={styles.signalCard}>
                <Text style={styles.signalRank}>#{index + 1}</Text>
                <View style={styles.signalBody}>
                  <DefinitionTermText
                    label={toStringValue(entry.label, `Correlation ${index + 1}`)}
                    style={styles.signalLabel}
                  />
                  <Text style={styles.signalValue}>{toDisplayValue(entry.value)}</Text>
                  {toStringValue(entry.detail, "").trim() ? (
                    <Text style={styles.signalDetail}>{toStringValue(entry.detail, "")}</Text>
                  ) : null}
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
      (overviewRecoveryState.kind === "no-players" ||
      overviewRecoveryState.kind === "no-games") &&
      !hasGamesServerData
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
        sourceKind={freshness.sourceKind}
        sourceLabel={freshness.sourceLabel}
        sourceCaption={freshness.sourceCaption(
          "This game summary is published from Supabase so it stays aligned with the other analytics hubs.",
        )}
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
        primaryAction={freshness.retryAction ?? recoveryProps?.primaryAction}
        secondaryAction={freshness.retryAction ? null : recoveryProps?.secondaryAction}
        tone={error ? "danger" : recoveryProps?.tone ?? "info"}
      >
        {playerCountSummaryItems.length > 0 ? (
          <View style={styles.signalSection}>
            <Text style={styles.compactSectionTitle}>By Table Size</Text>
            {playerCountSummaryItems.map((entry, index) => (
              <View key={toStringValue(entry.key, `player-count-${index}`)} style={styles.signalCard}>
                <View style={styles.signalBody}>
                  <DefinitionTermText
                    label={toStringValue(entry.label, `Bucket ${index + 1}`)}
                    style={styles.signalLabel}
                  />
                  <Text style={styles.signalValue}>{toDisplayValue(entry.value)}</Text>
                  {toStringValue(entry.detail, "").trim() ? (
                    <Text style={styles.signalDetail}>{toStringValue(entry.detail, "")}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {gamesItems.length > 0 ? (
          <View style={styles.signalSection}>
            <Text style={styles.compactSectionTitle}>Recent Games</Text>
            {gamesItems.map((entry, index) => (
              <View key={toStringValue(entry.key, `game-${index}`)} style={styles.signalCard}>
                <Text style={styles.signalRank}>#{index + 1}</Text>
                <View style={styles.signalBody}>
                  <DefinitionTermText
                    label={toStringValue(entry.label, `Game ${index + 1}`)}
                    style={styles.signalLabel}
                  />
                  <Text style={styles.signalValue}>{toDisplayValue(entry.value)}</Text>
                  {toStringValue(entry.detail, "").trim() ? (
                    <Text style={styles.signalDetail}>{toStringValue(entry.detail, "")}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : playerCountSummaryItems.length === 0 ? (
          <Text style={styles.emptyInlineText}>
            No game-specific analytics items were returned in the current payload.
          </Text>
        ) : null}
      </AnalyticsStateSection>
    );
  }

  return (
    <PageShell preset="analytics">
      <SectionCard
        eyebrow="Statistics"
        actions={
          <ActionButton
            title="Command"
            variant="ghost"
            onPress={() => router.push(APP_ROUTES.home)}
            style={styles.backActionButton}
          />
        }
      />

      <AnalyticsControlRail
        title="Browse Statistics"
        subtitle="Move between the current server-authored slices without leaving the screen."
        tabs={statsTabs}
        activeTabKey={activeTab}
        onTabChange={(key) => setActiveTab(key as StatsTab)}
      />

      {activeTab === "overview" && renderOverviewTab()}
      {activeTab === "players" && renderPlayersTab()}
      {activeTab === "playstyle" && renderPlaystyleTab()}
      {activeTab === "correlations" && renderCorrelationsTab()}
      {activeTab === "games" && renderGamesTab()}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  backActionButton: {
    minWidth: 160,
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
  signalDetail: {
    color: COLORS.textMuted,
    fontSize: 10,
    lineHeight: 14,
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
  metricSubsection: {
    gap: 6,
    marginTop: 8,
  },
  metricSubsectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.55,
    marginBottom: 2,
  },
});
