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
import ActionButton from "@/components/ui/ActionButton";
import DefinitionRichText from "@/components/ui/DefinitionRichText";
import DefinitionsJumpLink from "@/components/ui/DefinitionsJumpLink";
import HeroCard from "@/components/ui/HeroCard";
import PageShell from "@/components/ui/PageShell";
import Text from "@/components/ui/Text";
import { getInsightsScreen } from "@/lib/cloud/analytics/getInsightsScreen";
import { useLiveAnalyticsQuery } from "@/lib/cloud/analytics/useLiveAnalyticsQuery";
import { useStore } from "@/store/useStore";
import { buildInsightSummaryStatements } from "@/utils/insightSummaries";
import {
  APP_ROUTES,
  buildHomeRoute,
  buildChartsRoute,
  buildCompareRoute,
  buildPlayerProfileRoute,
} from "@/utils/appRoutes";
import {
  resolveSignedInPlayerOptionId,
} from "@/lib/cloud/analytics/signedInPlayerOptions";
import { useAnalyticsRecovery } from "@/utils/useAnalyticsRecovery";
import { useAnalyticsPresentation } from "@/utils/useAnalyticsPresentation";

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
  shortLabel: string;
}> = [
  {
    key: "pairingCorrelations",
    label: "Personal Correlations",
    shortLabel: "Personal",
  },
  {
    key: "macroCorrelations",
    label: "Macro Correlations",
    shortLabel: "Macro",
  },
  {
    key: "topSynergyPairs",
    label: "Top Synergy Pairs",
    shortLabel: "Synergy",
  },
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

function toFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeSummaryRows(value: unknown) {
  return toArray(value).map((entry) => ({
    label:
      toStringValue(entry.label, "") ||
      toStringValue(entry.title, "") ||
      "Signal",
    value: toFiniteNumber(entry.value),
  }));
}

function normalizeSynergyPairs(value: unknown) {
  return toArray(value).map((entry, index) => ({
    a: toStringValue(entry.a, `pair-a-${index}`),
    b: toStringValue(entry.b, `pair-b-${index}`),
    score: toFiniteNumber(entry.score),
  }));
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

function buildPlayerOptionMeta(player: PlayerOption, authProfileId: string | null) {
  const normalizedId = String(player.id ?? "").trim();
  if (authProfileId && normalizedId === String(authProfileId).trim()) {
    return "Signed-in player";
  }

  const primary = String(player.label ?? "").trim().toLowerCase();
  const secondary = [player.playerName, player.displayName]
    .map((value) => String(value ?? "").trim())
    .find((value) => value && value.toLowerCase() !== primary);

  return secondary || null;
}

export default function InsightsScreen() {
  const router = useRouter();
  const authSession = useStore((state: any) => state.authSession);
  const authProfile = useStore((state: any) => state?.authProfile ?? null);
  const players = useStore((state: any) => (Array.isArray(state?.players) ? state.players : []));
  const games = useStore((state: any) => (Array.isArray(state?.games) ? state.games : []));
  const authProfileId =
    String(authProfile?.id ?? authSession?.user?.id ?? "").trim() || null;
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
  const insightsQuery = useLiveAnalyticsQuery({
    enabled: Boolean(activeProfileId),
    queryKey: `insights-screen:${activeProfileId || "anon"}`,
    load: () =>
      getInsightsScreen({
        profileId: activeProfileId,
      }),
  });
  const payload = toRecord(insightsQuery.payload);
  const loading = insightsQuery.loading;
  const { error, freshness } = useAnalyticsPresentation({
    fallbackMessage: "Failed to load insights.",
    query: insightsQuery,
    retryLabel: "Retry insights",
    showSourceBadgeWhenReady: false,
    staleEntityLabel: "insights payload",
  });

  const metaPayload = useMemo(() => toRecord(payload?.meta), [payload]);
  const correlationPayload = toRecord(payload?.correlations);
  const playerOptions = useMemo(() => {
    const source = toArray(correlationPayload.players).length
      ? toArray(correlationPayload.players)
      : toArray(correlationPayload.playerOptions);

    return source.map(normalizePlayerOption);
  }, [correlationPayload.playerOptions, correlationPayload.players]);
  const authProfilePlayerOption = useMemo<PlayerOption | null>(() => {
    if (!authProfileId) {
      return null;
    }

    return {
      id: authProfileId,
      label:
        String(authProfile?.player_name ?? "").trim() ||
        String(authProfile?.display_name ?? "").trim() ||
        "Player",
      displayName:
        String(authProfile?.player_name ?? "").trim() ||
        String(authProfile?.display_name ?? "").trim(),
      playerName:
        String(authProfile?.player_name ?? "").trim(),
    };
  }, [
    authProfile?.display_name,
    authProfile?.player_name,
    authProfileId,
  ]);
  const orderedPlayerOptions = useMemo(() => {
    const optionById = new Map<string, PlayerOption>();

    for (const option of [
      ...playerOptions,
      ...(authProfilePlayerOption ? [authProfilePlayerOption] : []),
    ]) {
      const normalizedId = String(option.id ?? "").trim();
      if (!normalizedId || optionById.has(normalizedId)) {
        continue;
      }

      optionById.set(normalizedId, {
        ...option,
        id: normalizedId,
      });
    }

    const signedInPlayerOptionId = resolveSignedInPlayerOptionId({
      options: [...optionById.values()],
      authProfileId: authProfile?.id,
      authSessionUserId: authSession?.user?.id,
      authProfilePlayer: authProfilePlayerOption
        ? {
            id: authProfilePlayerOption.id,
            label: authProfilePlayerOption.label,
            displayName: authProfilePlayerOption.displayName,
            playerName: authProfilePlayerOption.playerName,
          }
        : null,
    });
    if (signedInPlayerOptionId && authProfilePlayerOption) {
      const currentSignedInOption = optionById.get(signedInPlayerOptionId);
      if (currentSignedInOption) {
        optionById.set(signedInPlayerOptionId, {
          ...currentSignedInOption,
          label: "You",
          displayName:
            authProfilePlayerOption.displayName || currentSignedInOption.displayName,
          playerName:
            authProfilePlayerOption.playerName || currentSignedInOption.playerName,
        });
      }
    }
    return [...optionById.values()].sort((left, right) => {
      const leftSignedIn = signedInPlayerOptionId && left.id === signedInPlayerOptionId ? 0 : 1;
      const rightSignedIn = signedInPlayerOptionId && right.id === signedInPlayerOptionId ? 0 : 1;
      if (leftSignedIn !== rightSignedIn) {
        return leftSignedIn - rightSignedIn;
      }

      return left.label.localeCompare(right.label, undefined, {
        sensitivity: "base",
      });
    });
  }, [
    authProfile?.id,
    authProfilePlayerOption,
    authSession?.user?.id,
    playerOptions,
  ]);

  useEffect(() => {
    if (!orderedPlayerOptions.length) {
      return;
    }

    if (
      selectedProfileId &&
      orderedPlayerOptions.some((player) => player.id === selectedProfileId)
    ) {
      return;
    }

    const fallbackId =
      orderedPlayerOptions.find((player) => player.id === authProfileId)?.id ??
      orderedPlayerOptions[0]?.id ??
      null;

    if (fallbackId) {
      setSelectedProfileId(fallbackId);
    }
  }, [authProfileId, orderedPlayerOptions, selectedProfileId]);

  const normalizedQuery = deferredPlayerSearchQuery.trim().toLowerCase();
  const filteredPlayerOptions = useMemo(() => {
    if (!normalizedQuery) {
      return orderedPlayerOptions;
    }

    return orderedPlayerOptions.filter((player) => {
      const searchTargets = [
        player.label,
        player.displayName,
        player.playerName,
      ]
        .filter(Boolean)
        .map((value) => value.toLowerCase());

      return searchTargets.some((value) => value.includes(normalizedQuery));
    });
  }, [normalizedQuery, orderedPlayerOptions]);

  const selectedPlayer = useMemo(
    () =>
      orderedPlayerOptions.find((player) => player.id === selectedProfileId) ?? null,
    [orderedPlayerOptions, selectedProfileId],
  );
  const summaryPersonalRows = useMemo(() => {
    const personal = normalizeSummaryRows(correlationPayload.personal);
    if (personal.length > 0) {
      return personal;
    }

    const legacyWinLoseSplit = normalizeSummaryRows(correlationPayload.winLoseSplit);
    if (legacyWinLoseSplit.length > 0) {
      return legacyWinLoseSplit;
    }

    return normalizeSummaryRows(correlationPayload.items);
  }, [correlationPayload.items, correlationPayload.personal, correlationPayload.winLoseSplit]);
  const summaryPairingRows = useMemo(
    () => normalizeSummaryRows(correlationPayload.pairing),
    [correlationPayload.pairing],
  );
  const summaryMacroRows = useMemo(
    () => normalizeSummaryRows(correlationPayload.macro),
    [correlationPayload.macro],
  );
  const summarySynergyPairs = useMemo(
    () => normalizeSynergyPairs(correlationPayload.synergyPairs),
    [correlationPayload.synergyPairs],
  );
  const activeSectionLabel = useMemo(
    () =>
      insightSectionTabs.find((tab) => tab.key === activeSectionTab)?.label ??
      "Correlations",
    [activeSectionTab],
  );

  const correlationPlayers = useMemo(
    () =>
      orderedPlayerOptions.map((player) => ({
        id: player.id,
        name: player.label,
      })),
    [orderedPlayerOptions],
  );
  const summaryPlayers = useMemo(
    () => correlationPlayers,
    [correlationPlayers],
  );
  const summaryStatements = useMemo(
    () =>
      buildInsightSummaryStatements({
        tab: activeSectionTab,
        selectedPlayerLabel: selectedPlayer?.label ?? null,
        metaGames: toFiniteNumber(metaPayload.games),
        personalRows: summaryPersonalRows,
        pairingRows: summaryPairingRows,
        macroRows: summaryMacroRows,
        synergyPairs: summarySynergyPairs,
        players: summaryPlayers,
      }),
    [
      activeSectionTab,
      metaPayload.games,
      selectedPlayer?.label,
      summaryMacroRows,
      summaryPairingRows,
      summaryPersonalRows,
      summaryPlayers,
      summarySynergyPairs,
    ],
  );

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
        ? "Track a few games before expecting the server-authored insights feed to populate."
        : error
          ? error
          : "Supabase has not published any player-aware correlation options for this screen yet.";

  return (
    <PageShell preset="analytics">
      <HeroCard
        eyebrow="Analytics"
        headerAction={
          <ActionButton
            title="Command"
            variant="ghost"
            onPress={() => router.push(buildHomeRoute())}
            style={styles.heroActionButton}
          />
        }
        title="Insights Hub"
        size="compact"
      />

      <AnalyticsControlRail
        title="Focus"
        tabVariant="underline"
        tabs={insightSectionTabs}
        activeTabKey={activeSectionTab}
        onTabChange={(key) => setActiveSectionTab(key as InsightSectionTab)}
        actions={<DefinitionsJumpLink category="correlations" />}
        style={styles.focusRail}
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
                    buildPlayerOptionMeta(player, authProfileId) ||
                    "Shared-network player",
                })),
                selectedIds: selectedProfileId ? [selectedProfileId] : [],
                onSelect: (id) => setSelectedProfileId(id),
                emptyText: "No players match this search.",
                helperText: null,
                variant: "rail",
              }
            : null
        }
      />

      <AnalyticsStateSection
        eyebrow="Insights"
        title={activeSectionLabel}
        helpCategory="correlations"
        state={insightsState}
        messageTitle={insightsMessageTitle}
        messageBody={insightsMessageBody}
        primaryAction={freshness.retryAction ?? insightsPrimaryAction}
        secondaryAction={freshness.retryAction ? null : insightsSecondaryAction}
        tone={error ? "danger" : insightsState === "ready" ? "info" : "warning"}
      >
        <View style={styles.summaryList}>
          {summaryStatements.map((statement) => (
            <View key={statement} style={styles.summaryItem}>
              <View style={styles.summaryBullet} />
              <DefinitionRichText text={statement} style={styles.summaryText} />
            </View>
          ))}
        </View>
      </AnalyticsStateSection>

      {!hasPlayerAwareActions ? (
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
      ) : null}

      {insightsState === "ready" && activeSectionTab === "pairingCorrelations" ? (
        <CorrelationStats
          players={correlationPlayers}
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
          </Pressable>

          <Pressable
            style={styles.contextActionCard}
            onPress={() => router.push(buildPlayerProfileRoute(activeProfileId))}
          >
            <Text style={styles.contextActionTitle}>View profile</Text>
          </Pressable>
        </View>
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
    minWidth: 136,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  focusRail: {
    marginTop: -2,
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
    marginTop: -2,
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
    gap: 6,
    marginTop: 2,
    paddingBottom: 2,
  },
  contextActionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#0f172a",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  contextActionTitle: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "900",
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
  summaryList: {
    gap: 8,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  summaryBullet: {
    marginTop: 5,
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#67e8f9",
    flexShrink: 0,
  },
  summaryText: {
    flex: 1,
    color: "#dbe7f6",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "800",
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
