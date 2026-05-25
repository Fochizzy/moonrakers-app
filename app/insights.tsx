import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import CorrelationStats from "@/components/CorrelationStats";
import AnalyticsStateSection from "@/components/analytics/AnalyticsStateSection";
import AnalyticsControlRail from "@/components/analytics/AnalyticsControlRail";
import { buildAnalyticsPlayerDirectory } from "@/lib/cloud/analytics/analyticsPlayers";
import ActionButton from "@/components/ui/ActionButton";
import DefinitionsJumpLink from "@/components/ui/DefinitionsJumpLink";
import HeroCard from "@/components/ui/HeroCard";
import PageShell from "@/components/ui/PageShell";
import Text from "@/components/ui/Text";
import { getInsightsScreen } from "@/lib/cloud/analytics/getInsightsScreen";
import { useLiveAnalyticsQuery } from "@/lib/cloud/analytics/useLiveAnalyticsQuery";
import { useAnalyticsRefreshTick } from "@/lib/cloud/analytics/useAnalyticsRefreshTick";
import { formatSupabaseConfigError } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import {
  APP_ROUTES,
  buildChartsRoute,
  buildCompareRoute,
  buildPlayerProfileRoute,
} from "@/utils/appRoutes";
import { useAnalyticsRecovery } from "@/utils/useAnalyticsRecovery";

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

export default function InsightsScreen() {
  const router = useRouter();
  const authSession = useStore((state: any) => state.authSession);
  const players = useStore((state: any) => (Array.isArray(state?.players) ? state.players : []));
  const games = useStore((state: any) => (Array.isArray(state?.games) ? state.games : []));
  const authProfileId = String(authSession?.user?.id ?? "").trim() || null;
  const [activeSectionTab, setActiveSectionTab] =
    useState<InsightSectionTab>("pairingCorrelations");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const deferredPlayerSearchQuery = useDeferredValue(playerSearchQuery);

  useEffect(() => {
    if (!authProfileId) {
      setSelectedProfileId(null);
      return;
    }

    setSelectedProfileId((current) => current ?? authProfileId ?? null);
  }, [authProfileId]);

  const activeProfileId = String(selectedProfileId ?? authProfileId ?? "").trim();
  const analyticsRefreshTick = useAnalyticsRefreshTick();
  const [error, setError] = useState<string | null>(null);
  const insightsQuery = useLiveAnalyticsQuery({
    enabled: Boolean(activeProfileId),
    queryKey: `insights-screen:${activeProfileId || "anon"}`,
    load: () =>
      getInsightsScreen({
        profileId: activeProfileId,
      }),
  });
  useEffect(() => {
    const nextError = insightsQuery.error;
    if (nextError !== null) {
      setError(formatSupabaseConfigError(nextError) || "Failed to load insights.");
    } else {
      setError(null);
    }
  }, [insightsQuery.error]);
  const payload = toRecord(insightsQuery.payload);
  const loading = insightsQuery.loading;
  const isStale = insightsQuery.isStale;
  const staleMessage = insightsQuery.staleMessage;

  const correlationPayload = toRecord(payload?.correlations);
  const canonicalGames = useMemo(() => games as any, [games]);
  const relationships = useMemo(() => toRecord(correlationPayload.relationships), [correlationPayload.relationships]);
  const analyticsDirectory = useMemo(
    () => buildAnalyticsPlayerDirectory({ players, games: games as any, groups: [] }),
    [players, games],
  );
  const sourceKind = isStale ? "server-stale" : "server";
  const sourceLabel = isStale ? "Stale server data" : "Server data";
  const staleSourceCaption = isStale
    ? `Showing the last successful Supabase insights payload.${staleMessage ? ` Latest refresh failure: ${staleMessage}` : ""}`
    : null;
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
  const activeSectionLabel = useMemo(
    () =>
      insightSectionTabs.find((tab) => tab.key === activeSectionTab)?.label ??
      "Correlations",
    [activeSectionTab],
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
  const hasPlayerAwareActions = Boolean(selectedPlayer && activeProfileId);
  const {
    recoveryState,
    sectionState: baseSectionState,
    primaryAction: insightsPrimaryAction,
    secondaryAction: insightsSecondaryAction,
  } = useAnalyticsRecovery({
    loading,
    error,
    playersCount: players.length,
    gamesCount: games.length,
    context: "insights",
  });
  const insightsState =
    baseSectionState === "ready" && !playerOptions.length ? "empty" : baseSectionState;
  const insightsMessageTitle =
    recoveryState.kind === "no-players"
      ? "No tracked players yet"
      : recoveryState.kind === "no-games"
        ? "No tracked games yet"
        : error
          ? "Insights unavailable"
          : "No insight payload yet";
  const insightsMessageBody =
    recoveryState.kind === "no-players"
      ? "Set up your roster first so the correlation hub has real Moonrakers players to compare."
      : recoveryState.kind === "no-games"
        ? "Track or import a few games before expecting the server-authored insights feed to populate."
        : error
          ? error
          : "Supabase has not published any player-aware correlation options for this screen yet.";

  return (
    <PageShell preset="analytics">
      <HeroCard
        eyebrow="Analytics"
        headerAction={
          <ActionButton
            title="Back to Command"
            variant="ghost"
            onPress={() => router.push(APP_ROUTES.home)}
            style={styles.heroActionButton}
          />
        }
        subtitle={heroSubtitle}
        title="Insights Hub"
        size="compact"
      >
        {hasPlayerAwareActions ? (
          <View style={styles.contextActionGrid}>
            <Pressable
              style={styles.contextActionCard}
              onPress={() =>
                router.push(
                  buildCompareRoute({
                    mode: "players",
                    ids: [activeProfileId],
                  }),
                )
              }
            >
              <Text style={styles.contextActionTitle}>
                Open compare for this player
              </Text>
              <Text style={styles.contextActionBody}>
                Lock {selectedPlayer?.label || "this player"} as the focus and pick the rival on the compare screen.
              </Text>
            </Pressable>

            <Pressable
              style={styles.contextActionCard}
              onPress={() =>
                router.push(
                  buildChartsRoute({
                    playerId: activeProfileId,
                    setup: true,
                  }),
                )
              }
            >
              <Text style={styles.contextActionTitle}>Open scoped charts</Text>
              <Text style={styles.contextActionBody}>
                Open chart setup with {selectedPlayer?.label || "this player"} already scoped in.
              </Text>
            </Pressable>

            <Pressable
              style={styles.contextActionCard}
              onPress={() => router.push(buildPlayerProfileRoute(activeProfileId))}
            >
              <Text style={styles.contextActionTitle}>View profile</Text>
              <Text style={styles.contextActionBody}>
                Jump straight into {selectedPlayer?.label || "this player's"} full profile breakdown.
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.linkRow}>
            <ActionButton
              title="Compare"
              variant="secondary"
              onPress={() => router.push(APP_ROUTES.compare)}
              style={styles.linkActionButton}
            />
            <ActionButton
              title="Stats"
              variant="ghost"
              onPress={() => router.push(APP_ROUTES.stats)}
              style={styles.linkActionButton}
            />
            <ActionButton
              title="Elo"
              variant="ghost"
              onPress={() => router.push(APP_ROUTES.elo)}
              style={styles.linkActionButton}
            />
          </View>
        )}
      </HeroCard>

      <AnalyticsControlRail
        title="Insight Lenses"
        subtitle={
          activeSectionTab === "pairingCorrelations"
            ? "Pick the player whose server-authored correlation reads you want to inspect."
            : "Switch between the published correlation lenses without leaving this route."
        }
        tabs={insightSectionTabs}
        activeTabKey={activeSectionTab}
        onTabChange={(key) => setActiveSectionTab(key as InsightSectionTab)}
        actions={<DefinitionsJumpLink category="correlations" />}
        search={
          activeSectionTab === "pairingCorrelations"
            ? {
                query: playerSearchQuery,
                onQueryChange: setPlayerSearchQuery,
                placeholder: "Search players",
                items: filteredPlayerOptions.map((player) => ({
                  id: player.id,
                  label: player.label,
                  meta:
                    player.displayName ||
                    player.playerName ||
                    (player.id === authProfileId
                      ? "Signed-in player"
                      : "Shared-network player"),
                })),
                selectedIds: selectedProfileId ? [selectedProfileId] : [],
                onSelect: (id) => setSelectedProfileId(id),
                emptyText: "No players match this search.",
                helperText:
                  "Select the player whose published personal correlations you want to inspect.",
                variant: "list",
              }
            : null
        }
      />

      <AnalyticsStateSection
        eyebrow="Insights"
        title={activeSectionLabel}
        helpCategory="correlations"
        subtitle={
          activeSectionTab === "pairingCorrelations"
            ? "Published personal correlations and synergy reads from the shared insights payload."
            : "Published correlation trends and synergy reads from the shared insights payload."
        }
        state={insightsState}
        sourceKind={sourceKind}
        sourceLabel={sourceLabel}
        sourceCaption={
          staleSourceCaption ||
          (selectedPlayer?.label
            ? `Showing published insight context for ${selectedPlayer.label}.`
            : "Published insights from Supabase.")
        }
        messageTitle={insightsMessageTitle}
        messageBody={insightsMessageBody}
        primaryAction={insightsPrimaryAction}
        secondaryAction={insightsSecondaryAction}
        tone={error ? "danger" : insightsState === "ready" ? "info" : "warning"}
      >
        {activeSectionTab === "pairingCorrelations" ? (
          <Text style={styles.sectionReadyHint}>
            {selectedPlayer?.label
              ? `Showing published personal correlations for ${selectedPlayer.label}.`
              : "Choose a player above to focus the published personal correlation view."}
          </Text>
        ) : (
          <Text style={styles.sectionReadyHint}>
            The correlation breakdown below is live and stays server-authored so the same trend language can be reused across analytics surfaces.
          </Text>
        )}
      </AnalyticsStateSection>

      {insightsState === "ready" && activeSectionTab === "pairingCorrelations" ? (
        <CorrelationStats
          games={canonicalGames}
          players={players}
          relationships={relationships}
          serverData={correlationPayload}
          serverOnly
          view="pairing"
        />
      ) : null}

      {insightsState === "ready" && activeSectionTab === "macroCorrelations" ? (
        <CorrelationStats
          players={correlationPlayers}
          serverData={correlationPayload}
          serverOnly
          view="macro"
        />
      ) : null}

      {insightsState === "ready" && activeSectionTab === "topSynergyPairs" ? (
        <CorrelationStats
          players={correlationPlayers}
          serverData={correlationPayload}
          serverOnly
          view="synergy"
        />
      ) : null}
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
  heroActionButton: {
    minWidth: 164,
  },
  linkActionButton: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: "#EAF2FF",
    fontSize: 18,
    fontWeight: "900",
    flex: 1,
  },
  backButton: {
    alignSelf: "flex-start",
  },
  backButtonText: {
    color: "#7D9BC4",
    fontSize: 12,
    fontWeight: "700",
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
  contextActionGrid: {
    gap: 8,
  },
  contextActionCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#0f172a",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  contextActionTitle: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "900",
  },
  contextActionBody: {
    color: "#94a3b8",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
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
  playerSearchHint: {
    color: "#94a3b8",
    fontSize: 11,
    lineHeight: 17,
  },
  selectorShell: {
    gap: 10,
  },
  sectionReadyHint: {
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
