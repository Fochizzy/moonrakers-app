import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import PlayerSearchPicker from "@/components/players/PlayerSearchPicker";
import {
  ChartSetupStageAction,
  ChartSetupStageShell,
} from "@/components/charts/ChartSetupGuidedRail";
import ChartSetupHeroBar from "@/components/charts/ChartSetupHeroBar";
import EmptyStateCard from "@/components/ui/EmptyStateCard";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Text from "@/components/ui/Text";
import DefinitionsJumpLink from "@/components/ui/DefinitionsJumpLink";
import ChartUnderlineTabs from "@/components/charts/ChartUnderlineTabs";
import ChartHubPreview from "@/components/charts/ChartHubPreview";
import {
  CHART_SECTIONS,
  buildFeaturedChartTakeaway,
  getChartsForSection,
  normalizeChartHubSelection,
  resolveChartCatalogEntry,
  supportsChartFocusPlayerToggle,
  supportsChartScopePlayerToggle,
  type ChartCatalogEntry,
  type ChartCatalogKey,
} from "@/components/charts/chartCatalog";
import {
  CHART_COLORS,
  CHART_LAYOUT,
  getChartToneStyles,
  withChartAlpha,
} from "@/components/charts/chartVisualSystem";
import {
  buildMetricStageSummary,
  buildScopeStageSummary,
  buildStyleStageSummary,
  resolveChartSetupRailState,
  type ChartSetupStageKey,
} from "@/components/charts/chartSetupRailModel";
import { loadRegisteredProfiles } from "@/lib/cloud/loadRegisteredProfiles";
import { buildLocalChartSetupPayload } from "@/lib/cloud/analytics/buildLocalChartSetupPayload";
import { getChartSetup } from "@/lib/cloud/analytics/getChartSetup";
import {
  needsChartSetupSupplement,
  resolveEffectiveChartSetupPayload,
} from "@/lib/cloud/analytics/resolveChartSetupPayload";
import { useLiveAnalyticsQuery } from "@/lib/cloud/analytics/useLiveAnalyticsQuery";
import { useStore } from "@/store/useStore";
import { buildHomeRoute } from "@/utils/appRoutes";
import {
  buildRouteScopeSeedKey,
  getPreferredScopeIdsForChart,
} from "@/utils/chartHubRouteState";
import { buildAnalyticsPlayerDirectory } from "@/utils/analyticsPlayers";
import { useAnalyticsPresentation } from "@/utils/useAnalyticsPresentation";
import {
  buildCommonOpponentOptions,
  prioritizeSignedInPlayerOptions,
  resolveSignedInPlayerOptionId,
  resolvePreferredChartPlayerId,
} from "@/utils/charts";
import {
  normalizeVisibleEloMetricTab,
} from "@/utils/elo/visibleMetricTabs";

function getParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getParamList(value?: string | string[]) {
  const raw = getParam(value);
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isTruthyParam(value?: string | string[]) {
  const normalized = String(getParam(value) ?? "")
    .trim()
    .toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

type SetupOption = {
  key: string;
  label: string;
  badge?: string | null;
  kind?: "default" | "action";
};

type SetupDefaults = {
  focusPlayerId: string | null;
  comparePlayerId: string | null;
  scopedPlayerIds: string[];
  metricKey: string | null;
  lineMode: string | null;
  eloTab: string | null;
  opponentId: string | null;
};

const TOGGLE_SCOPE_PLAYER_LIST_KEY = "__toggle_scope_player_list__";

function titleCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeLineMode(value?: string | string[]) {
  const normalized = String(getParam(value) ?? "raw").trim().toLowerCase();
  if (normalized === "cumulative") return "cumulative";
  if (normalized === "average") return "average";
  return "raw";
}

function normalizeEloTab(value?: string | string[]) {
  return normalizeVisibleEloMetricTab(
    String(getParam(value) ?? "Leaderboard"),
  );
}

function toSetupOptions(value: unknown): SetupOption[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry, index) => ({
      key: String(entry.key ?? entry.id ?? `option-${index}`),
      label: String(entry.label ?? entry.name ?? entry.title ?? `Option ${index + 1}`),
    }))
    .filter((entry) => entry.key.trim().length > 0);
}

function toStringOrNull(value: unknown): string | null {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map((entry) => String(entry ?? "").trim())
        .filter(Boolean)
    : [];
}

function toSetupDefaults(value: unknown): SetupDefaults {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    focusPlayerId: toStringOrNull(record.focusPlayerId),
    comparePlayerId: toStringOrNull(record.comparePlayerId),
    scopedPlayerIds: toStringArray(record.scopedPlayerIds),
    metricKey: toStringOrNull(record.metricKey),
    lineMode: toStringOrNull(record.lineMode),
    eloTab: toStringOrNull(record.eloTab),
    opponentId: toStringOrNull(record.opponentId),
  };
}

function findOption(options: readonly SetupOption[], key?: string | null) {
  const normalized = String(key ?? "").trim();
  if (!normalized) return null;
  return options.find((option) => String(option.key) === normalized) ?? null;
}

function resolveOptionKey(
  options: readonly SetupOption[],
  ...candidates: Array<string | null | undefined>
) {
  for (const candidate of candidates) {
    const match = findOption(options, candidate);
    if (match) {
      return String(match.key);
    }
  }

  return options[0] ? String(options[0].key) : null;
}

function haveSameIds(left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length) return false;
  return left.every((id, index) => String(id) === String(right[index]));
}

function dedupeIds(ids: readonly string[]) {
  return ids.filter((id, index) => ids.indexOf(id) === index);
}

function sanitizeRadarCompareIds(
  options: readonly SetupOption[],
  ids: readonly string[],
  selectedPlayerId: string | null,
  limit = 4,
) {
  const validIds = new Set(options.map((option) => String(option.key)));
  const focusId = String(selectedPlayerId ?? "").trim();

  return dedupeIds(
    ids
      .map((id) => String(id).trim())
      .filter(Boolean)
      .filter((id) => validIds.has(id) && id !== focusId),
  ).slice(0, Math.max(0, limit));
}

function sanitizeSelectedIds(
  options: readonly SetupOption[],
  ids: readonly string[],
  fallbackIds: readonly string[],
) {
  const validIds = new Set(options.map((option) => String(option.key)));
  const nextIds = ids.filter((id) => validIds.has(String(id)));
  if (nextIds.length) return nextIds;
  return fallbackIds.filter((id) => validIds.has(String(id)));
}

function canUseSegmentedControl(items: readonly SetupOption[]) {
  return (
    items.length >= 1 &&
    items.length <= 4 &&
    items.every(
      (item) =>
        !item.badge &&
        item.kind !== "action"
    )
  );
}

function chunkSetupOptions(
  items: readonly SetupOption[],
  chunkSize = 4,
) {
  const chunks: SetupOption[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push([...items.slice(index, index + chunkSize)]);
  }

  return chunks;
}

function buildPrimarySetupOptions(
  options: readonly SetupOption[],
  priorityKeys: readonly (string | null | undefined)[],
  limit = 4,
) {
  const next: SetupOption[] = [];
  const seen = new Set<string>();

  const push = (option?: SetupOption | null) => {
    const optionKey = String(option?.key ?? "").trim();
    if (!optionKey || seen.has(optionKey)) return;
    seen.add(optionKey);
    next.push({
      key: optionKey,
      label: String(option?.label ?? optionKey),
    });
  };

  priorityKeys.forEach((key) => push(findOption(options, key)));
  options.forEach((option) => push(option));

  return next.slice(0, limit);
}

function SetupTabs({
  items,
  value,
  onChange,
}: {
  items: readonly SetupOption[];
  value: string;
  onChange: (next: string) => void;
}) {
  if (!items.length) return null;

  if (canUseSegmentedControl(items)) {
    return (
      <SegmentedControl
        items={items}
        onChange={onChange}
        style={styles.setupSegmentedControl}
        value={value}
      />
    );
  }

  return (
    <ChartUnderlineTabs
      items={[...items]}
      activeKey={value}
      onChange={onChange}
      style={styles.setupUnderlineTabs}
    />
  );
}

function SetupSegmentedTabs({
  items,
  selectedKeys,
  onChange,
  selectionMode = "single",
  columns = 4,
}: {
  items: readonly SetupOption[];
  selectedKeys: readonly string[];
  onChange: (next: string) => void;
  selectionMode?: "single" | "multiple";
  columns?: number;
}) {
  if (!items.length) return null;

  const selectedKeySet = new Set(selectedKeys.map((key) => String(key)));
  const rows = chunkSetupOptions(items, columns);

  return (
    <View style={styles.setupSegmentedTabStack}>
      {rows.map((row, rowIndex) => (
        <View key={`setup-row-${rowIndex}`} style={styles.setupSegmentedTabShell}>
          {row.map((item) => {
            const itemKey = String(item.key);
            const active =
              selectionMode === "multiple"
                ? selectedKeySet.has(itemKey)
                : itemKey === String(selectedKeys[0] ?? "");

            return (
              <Pressable
                key={itemKey}
                onPress={() => onChange(itemKey)}
                style={({ pressed }) => [
                  styles.setupSegmentedTab,
                  active && styles.setupSegmentedTabActive,
                  pressed && styles.setupSegmentedTabPressed,
                ]}
              >
                <Text
                  variant="utilityLabel"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  style={[
                    styles.setupSegmentedTabText,
                    active && styles.setupSegmentedTabTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function ChartCard({
  chart,
  active,
  onPress,
}: {
  chart: ChartCatalogEntry;
  active: boolean;
  onPress: () => void;
}) {
  const toneStyle = getChartToneStyles(chart.tone);

  return (
    <View
      style={[
        styles.chartCard,
        active && {
          borderColor: withChartAlpha(toneStyle.value, 0.5),
          backgroundColor: withChartAlpha(toneStyle.value, 0.13),
        },
      ]}
    >
      <Pressable
        style={({ pressed }) => [styles.chartCardPressable, pressed && { opacity: 0.92 }]}
        onPress={onPress}
      >
        <View style={styles.chartCardHeader}>
          <View style={styles.chartCardPillRow}>
            {active ? (
              <View
                style={[
                  styles.chartCardPill,
                  styles.chartCardSelectedPill,
                  {
                    backgroundColor: withChartAlpha(toneStyle.value, 0.22),
                    borderColor: withChartAlpha(toneStyle.value, 0.4),
                  },
                ]}
              >
                <Text style={[styles.chartCardPillText, { color: CHART_COLORS.textStrong }]}>
                  Selected
                </Text>
              </View>
            ) : null}
            <View
              style={[
                styles.chartCardPill,
                { backgroundColor: withChartAlpha(toneStyle.value, 0.18) },
              ]}
            >
              <Text style={[styles.chartCardPillText, { color: toneStyle.value }]}>
                {chart.bestFor[0] || "chart"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.chartCardBody}>
          <View style={styles.chartCardCopy}>
            <Text
              style={[
                styles.chartCardTitle,
                active && { color: toneStyle.value },
              ]}
              numberOfLines={1}
            >
              {chart.title}
            </Text>
            <Text style={styles.chartCardHook} numberOfLines={2}>
              {chart.hook}
            </Text>
          </View>

          <View style={styles.previewWrap}>
            <ChartHubPreview kind={chart.preview} tone={chart.tone} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function SetupSection({
  title,
  subtitle,
  contentStyle,
  children,
  definitionMetricKey,
}: {
  title: string;
  subtitle?: string;
  contentStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  definitionMetricKey?: string | null;
}) {
  return (
    <View style={styles.setupSection}>
      <View style={styles.setupSectionHeader}>
        <Text style={styles.setupSectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.setupSectionSubtitle}>{subtitle}</Text> : null}
        {definitionMetricKey ? (
          <DefinitionsJumpLink
            label="Definition"
            metric={definitionMetricKey}
            category="scoring"
          />
        ) : null}
      </View>
      <View style={[styles.setupChipRow, contentStyle]}>{children}</View>
    </View>
  );
}

export default function ChartsIndexScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const appliedRouteScopeKeyRef = useRef<string | null>(null);
  const params = useLocalSearchParams<{
    chartKey?: string | string[];
    playerId?: string | string[];
    focusPlayerId?: string | string[];
    compareId?: string | string[];
    compareIds?: string | string[];
    ids?: string | string[];
    metric?: string | string[];
    metricKey?: string | string[];
    lineMode?: string | string[];
    eloTab?: string | string[];
    opponentId?: string | string[];
    setup?: string | string[];
  }>();
  const authSession = useStore((state) => state.authSession);
  const authProfile = useStore((state) => state?.authProfile ?? null);
  const players = useStore((state) => state.players ?? []);
  const games = useStore((state) => state?.games ?? []);
  const groups = useStore((state) => state?.groups ?? []);
  const profileId = String(authProfile?.id ?? authSession?.user?.id ?? "").trim();

  const routeChartKey = normalizeChartHubSelection(
    getParam(params.chartKey)
  ).key;
  const routePlayerId = getParam(params.playerId) ?? getParam(params.focusPlayerId);
  const routeCompareId = getParam(params.compareId);
  const routeCompareIdsParam = getParam(params.compareIds);
  const routeCompareIds = useMemo(
    () => getParamList(routeCompareIdsParam),
    [routeCompareIdsParam],
  );
  const routeCompareIdsKey = routeCompareIds.join(",");
  const routeIdsParam = getParam(params.ids);
  const routeIds = useMemo(() => getParamList(routeIdsParam), [routeIdsParam]);
  const routeMetric = getParam(params.metric) ?? getParam(params.metricKey);
  const routeLineMode = normalizeLineMode(params.lineMode);
  const routeEloTab = normalizeEloTab(params.eloTab);
  const routeOpponentId = getParam(params.opponentId);
  const routeSetupOpen = isTruthyParam(params.setup);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(
    routePlayerId ?? null
  );
  const [comparePlayerId, setComparePlayerId] = useState<string | null>(
    routeCompareId ?? null
  );
  const [selectedRadarCompareIds, setSelectedRadarCompareIds] = useState<string[]>(
    routeCompareIds.length
      ? routeCompareIds
      : routeCompareId
        ? [routeCompareId]
        : [],
  );
  const [selectedMetric, setSelectedMetric] = useState<string | null>(
    routeMetric ? String(routeMetric).trim() : null
  );
  const [selectedChartKey, setSelectedChartKey] =
    useState<ChartCatalogKey>(routeChartKey);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(routeIds);
  const routeScopeSeedKey = useMemo(
    () => buildRouteScopeSeedKey(selectedChartKey, routeIds),
    [selectedChartKey, routeIds]
  );
  const [selectedLineMode, setSelectedLineMode] =
    useState<string>(routeLineMode);
  const [selectedEloTab, setSelectedEloTab] =
    useState<string>(routeEloTab);
  const [selectedOpponentId, setSelectedOpponentId] = useState<string | null>(
    routeOpponentId ?? null
  );
  const [focusPlayerSearch, setFocusPlayerSearch] = useState("");
  const [comparePlayerSearch, setComparePlayerSearch] = useState("");
  const [scopePlayerSearch, setScopePlayerSearch] = useState("");
  const [showAllScopePlayerOptions, setShowAllScopePlayerOptions] = useState(false);
  const [setupOpen, setSetupOpen] = useState(routeSetupOpen);
  const shouldHonorRouteSetupParams = !setupOpen;
  const [activeStageKey, setActiveStageKey] = useState<ChartSetupStageKey>("scope");
  const deferredFocusPlayerSearch = useDeferredValue(focusPlayerSearch);
  const deferredComparePlayerSearch = useDeferredValue(comparePlayerSearch);
  const deferredScopePlayerSearch = useDeferredValue(scopePlayerSearch);
  const previousScopeStageSignatureRef = useRef<string | null>(null);
  const previousMetricStageSignatureRef = useRef<string | null>(null);
  const selectedChart = useMemo(
    () => resolveChartCatalogEntry(selectedChartKey),
    [selectedChartKey]
  );
  const isRadarChart = selectedChart.key === "radar";
  const chartSetupQuery = useLiveAnalyticsQuery({
    enabled: Boolean(profileId),
    queryKey: `chart-setup:${profileId || "anon"}:${selectedChart.key}`,
    load: () =>
      getChartSetup({
        chartKey: selectedChart.key,
        profileId,
      }),
  });
  const setupPayload =
    chartSetupQuery.payload && typeof chartSetupQuery.payload === "object"
      ? chartSetupQuery.payload
      : null;
  const setupLoading = chartSetupQuery.loading;
  const { error: setupError, freshness: setupFreshness } = useAnalyticsPresentation({
    fallbackMessage: "Failed to load chart setup.",
    query: chartSetupQuery,
    retryLabel: "Retry setup",
    showSourceBadgeWhenReady: false,
    staleEntityLabel: "chart setup payload",
  });
  const [supabaseSetupFallbackPlayers, setSupabaseSetupFallbackPlayers] = useState<
    Awaited<ReturnType<typeof loadRegisteredProfiles>>
  >([]);
  const [supabaseSetupFallbackLoading, setSupabaseSetupFallbackLoading] = useState(false);
  const analyticsDirectory = useMemo(
    () => buildAnalyticsPlayerDirectory({ players, games, groups }),
    [players, games, groups]
  );
  const localSetupPlayers = useMemo(
    () =>
      analyticsDirectory.players.length
        ? analyticsDirectory.players
        : supabaseSetupFallbackPlayers,
    [analyticsDirectory.players, supabaseSetupFallbackPlayers]
  );
  const localSetupFallbackPayload = useMemo(
    () =>
      buildLocalChartSetupPayload({
        chartKey: selectedChart.key,
        players: localSetupPlayers,
        authProfileId: authProfile?.id,
        authSessionUserId: authSession?.user?.id,
        routePlayerId: routePlayerId ?? null,
        routeCompareId: routeCompareId ?? null,
        routeIds,
        routeMetric: routeMetric ?? null,
        routeLineMode,
        routeEloTab,
        routeOpponentId: routeOpponentId ?? null,
      }),
    [
      authProfile?.id,
      authSession?.user?.id,
      localSetupPlayers,
      routeCompareId,
      routeEloTab,
      routeIds,
      routeLineMode,
      routeMetric,
      routeOpponentId,
      routePlayerId,
      selectedChart.key,
    ]
  );
  const setupNeedsSupplement = useMemo(
    () =>
      needsChartSetupSupplement({
        chartKey: selectedChart.key,
        publishedPayload: setupPayload,
        fallbackPayload: localSetupFallbackPayload,
      }),
    [localSetupFallbackPayload, selectedChart.key, setupPayload]
  );
  useEffect(() => {
    if (
      !profileId ||
      analyticsDirectory.players.length > 0 ||
      supabaseSetupFallbackLoading ||
      supabaseSetupFallbackPlayers.length > 0
    ) {
      return undefined;
    }

    if (setupPayload && !setupError && !setupNeedsSupplement) {
      return undefined;
    }

    let cancelled = false;
    setSupabaseSetupFallbackLoading(true);

    void loadRegisteredProfiles()
      .then((profiles) => {
        if (!cancelled) {
          setSupabaseSetupFallbackPlayers(Array.isArray(profiles) ? profiles : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSupabaseSetupFallbackPlayers([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSupabaseSetupFallbackLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    analyticsDirectory.players.length,
    profileId,
    setupError,
    setupPayload,
    supabaseSetupFallbackLoading,
    supabaseSetupFallbackPlayers.length,
    setupNeedsSupplement,
  ]);
  const effectiveSetupPayload = useMemo(
    () =>
      resolveEffectiveChartSetupPayload({
        chartKey: selectedChart.key,
        publishedPayload: setupPayload,
        fallbackPayload: localSetupFallbackPayload,
      }),
    [localSetupFallbackPayload, selectedChart.key, setupPayload]
  );
  const usingLocalSetupFallback = Boolean(
    !setupPayload && setupError && effectiveSetupPayload
  );
  const showSetupErrorCard = Boolean(
    setupError && !effectiveSetupPayload && !supabaseSetupFallbackLoading
  );
  const setupRecoveryMessage = usingLocalSetupFallback
    ? "The published chart setup is unavailable right now, so these options are using Supabase roster data instead."
    : null;
  const hasFocusPlayerToggle = supportsChartFocusPlayerToggle(selectedChart.key);
  const hasScopePlayerToggle = supportsChartScopePlayerToggle(selectedChart.key);
  const focusPlayerOptions = useMemo(
    () =>
      hasFocusPlayerToggle
        ? toSetupOptions(effectiveSetupPayload?.focusPlayerOptions)
        : [],
    [effectiveSetupPayload?.focusPlayerOptions, hasFocusPlayerToggle]
  );
  const comparePlayerOptions = useMemo(
    () => toSetupOptions(effectiveSetupPayload?.comparePlayerOptions),
    [effectiveSetupPayload?.comparePlayerOptions]
  );
  const radarCompareOptions = useMemo(
    () =>
      comparePlayerOptions.filter(
        (option) => String(option.key) !== String(selectedPlayerId ?? ""),
      ),
    [comparePlayerOptions, selectedPlayerId],
  );
  const scopePlayerOptions = useMemo(
    () =>
      hasScopePlayerToggle
        ? toSetupOptions(effectiveSetupPayload?.scopePlayerOptions)
        : [],
    [effectiveSetupPayload?.scopePlayerOptions, hasScopePlayerToggle]
  );
  const metricOptions = useMemo(
    () => toSetupOptions(effectiveSetupPayload?.metricOptions),
    [effectiveSetupPayload?.metricOptions]
  );
  const lineModeOptions = useMemo(
    () => toSetupOptions(effectiveSetupPayload?.lineModeOptions),
    [effectiveSetupPayload?.lineModeOptions]
  );
  const eloViewOptions = useMemo(
    () => toSetupOptions(effectiveSetupPayload?.eloViewOptions),
    [effectiveSetupPayload?.eloViewOptions]
  );
  const opponentOptions = useMemo(
    () => toSetupOptions(effectiveSetupPayload?.opponentOptions),
    [effectiveSetupPayload?.opponentOptions]
  );
  const setupDefaults = useMemo(
    () => toSetupDefaults(effectiveSetupPayload?.defaults),
    [effectiveSetupPayload?.defaults]
  );
  const focusPlayerDirectoryPlayers = useMemo(() => {
    const playerById = new Map(
      analyticsDirectory.players.map((player) => [String(player.id), player])
    );

    return focusPlayerOptions.map((option) => {
      const matched = playerById.get(String(option.key));
      return {
        id: String(option.key),
        name: option.label || matched?.name || "Player",
        color: matched?.color,
        initials: matched?.initials,
        assignedCardArtIndex:
          typeof matched?.assignedCardArtIndex === "number"
            ? matched.assignedCardArtIndex
            : null,
        artIndex:
          typeof matched?.artIndex === "number"
            ? matched.artIndex
            : null,
      };
    });
  }, [analyticsDirectory.players, focusPlayerOptions]);
  const scopePlayerDirectoryPlayers = useMemo(() => {
    const playerById = new Map(
      analyticsDirectory.players.map((player) => [String(player.id), player])
    );

    return scopePlayerOptions.map((option) => {
      const matched = playerById.get(String(option.key));
      return {
        id: String(option.key),
        name: option.label || matched?.name || "Player",
        color: matched?.color,
        initials: matched?.initials,
        assignedCardArtIndex:
          typeof matched?.assignedCardArtIndex === "number"
            ? matched.assignedCardArtIndex
            : null,
        artIndex:
          typeof matched?.artIndex === "number"
            ? matched.artIndex
            : null,
        };
    });
  }, [analyticsDirectory.players, scopePlayerOptions]);
  const authProfilePlayer = useMemo(() => {
    const authProfilePlayerId = String(
      authProfile?.id ?? authSession?.user?.id ?? ""
    ).trim();

    if (!authProfilePlayerId) {
      return null;
    }

    const matchedPlayer = analyticsDirectory.players.find(
      (player) => String(player?.id ?? "").trim() === authProfilePlayerId
    );

      return {
        id: authProfilePlayerId,
        name:
          String(authProfile?.player_name ?? "").trim() ||
          String(authProfile?.display_name ?? "").trim() ||
          String(matchedPlayer?.name ?? "").trim() ||
          "Player",
      color:
        matchedPlayer && typeof matchedPlayer.color === "string"
          ? matchedPlayer.color
          : undefined,
      assignedCardArtIndex:
        typeof matchedPlayer?.assignedCardArtIndex === "number"
          ? matchedPlayer.assignedCardArtIndex
          : null,
    };
  }, [
    analyticsDirectory.players,
    authProfile?.display_name,
    authProfile?.id,
    authProfile?.player_name,
    authSession?.user?.id,
  ]);
  const preferredFocusPlayerId = useMemo(
    () =>
      resolvePreferredChartPlayerId({
        availablePlayers: focusPlayerDirectoryPlayers,
        routePlayerId,
        authProfileId: authProfile?.id,
        authSessionUserId: authSession?.user?.id,
      }),
    [focusPlayerDirectoryPlayers, routePlayerId, authProfile?.id, authSession?.user?.id]
  );
  const topCommonFocusPlayers = useMemo(
    () =>
      buildCommonOpponentOptions({
        playerId: preferredFocusPlayerId,
        players: focusPlayerDirectoryPlayers,
        games: analyticsDirectory.games,
        limit: 3,
      }),
    [preferredFocusPlayerId, focusPlayerDirectoryPlayers, analyticsDirectory.games]
  );
  const prioritizedFocusPlayerDirectoryPlayers = useMemo(
    () =>
      prioritizeSignedInPlayerOptions({
        players: focusPlayerDirectoryPlayers,
        games: analyticsDirectory.games,
        authProfileId: authProfile?.id,
        authSessionUserId: authSession?.user?.id,
        authProfilePlayer: authProfilePlayer,
        commonPlayerLimit: 4,
        explicitPriorityPlayerIds: topCommonFocusPlayers.map((player) =>
          String(player.id)
        ),
      }),
    [
      analyticsDirectory.games,
      authProfile?.id,
      authProfilePlayer,
      authSession?.user?.id,
      focusPlayerDirectoryPlayers,
      topCommonFocusPlayers,
    ]
  );
  const signedInFocusPlayerOptionId = useMemo(
    () =>
      resolveSignedInPlayerOptionId({
        options: focusPlayerDirectoryPlayers,
        authProfileId: authProfile?.id,
        authSessionUserId: authSession?.user?.id,
        authProfilePlayer: authProfilePlayer,
      }),
    [
      authProfile?.id,
      authProfilePlayer,
      authSession?.user?.id,
      focusPlayerDirectoryPlayers,
    ]
  );
  const preferredScopePlayerId = useMemo(
    () =>
      resolvePreferredChartPlayerId({
        availablePlayers: scopePlayerDirectoryPlayers,
        routePlayerId: null,
        authProfileId: authProfile?.id,
        authSessionUserId: authSession?.user?.id,
      }),
    [scopePlayerDirectoryPlayers, authProfile?.id, authSession?.user?.id]
  );
  const topCommonScopePlayers = useMemo(
    () =>
      buildCommonOpponentOptions({
        playerId: preferredScopePlayerId,
        players: scopePlayerDirectoryPlayers,
        games: analyticsDirectory.games,
        limit: 3,
      }),
    [preferredScopePlayerId, scopePlayerDirectoryPlayers, analyticsDirectory.games]
  );
  const prioritizedScopePlayerDirectoryPlayers = useMemo(
    () =>
      prioritizeSignedInPlayerOptions({
        players: scopePlayerDirectoryPlayers,
        games: analyticsDirectory.games,
        authProfileId: authProfile?.id,
        authSessionUserId: authSession?.user?.id,
        authProfilePlayer: authProfilePlayer,
        commonPlayerLimit: 3,
        explicitPriorityPlayerIds: topCommonScopePlayers.map((player) =>
          String(player.id)
        ),
      }),
    [
      analyticsDirectory.games,
      authProfile?.id,
      authProfilePlayer,
      authSession?.user?.id,
      scopePlayerDirectoryPlayers,
      topCommonScopePlayers,
    ]
  );
  const signedInScopePlayerOptionId = useMemo(
    () =>
      resolveSignedInPlayerOptionId({
        options: scopePlayerDirectoryPlayers,
        authProfileId: authProfile?.id,
        authSessionUserId: authSession?.user?.id,
        authProfilePlayer: authProfilePlayer,
      }),
    [
      authProfile?.id,
      authProfilePlayer,
      authSession?.user?.id,
      scopePlayerDirectoryPlayers,
    ]
  );
  const allPlayedScopePlayers = useMemo(
    () =>
      buildCommonOpponentOptions({
        playerId: preferredScopePlayerId,
        players: scopePlayerDirectoryPlayers,
        games: analyticsDirectory.games,
        limit: scopePlayerDirectoryPlayers.length,
      }),
    [preferredScopePlayerId, scopePlayerDirectoryPlayers, analyticsDirectory.games]
  );
  const scopeAllowedPlayerIds = useMemo(() => {
    const next = new Set<string>(
      allPlayedScopePlayers.map((player) => String(player.id))
    );

    const signedInId = String(
      signedInScopePlayerOptionId ?? preferredScopePlayerId ?? ""
    ).trim();
    if (signedInId) {
      next.add(signedInId);
    }

    return next;
  }, [allPlayedScopePlayers, preferredScopePlayerId, signedInScopePlayerOptionId]);
  const availableScopePlayerOptions = useMemo(() => {
    if (!scopeAllowedPlayerIds.size) {
      return scopePlayerOptions;
    }

    const filtered = scopePlayerOptions.filter((option) =>
      scopeAllowedPlayerIds.has(String(option.key))
    );

    return filtered.length ? filtered : scopePlayerOptions;
  }, [scopeAllowedPlayerIds, scopePlayerOptions]);
  const scopePlayerIdentities = useMemo(
    () => availableScopePlayerOptions.map((option) => ({ id: String(option.key) })),
    [availableScopePlayerOptions]
  );
  const orderedFocusPlayerOptions = useMemo(() => {
    const optionByKey = new Map(
      focusPlayerOptions.map((option) => {
        const optionKey = String(option.key);
        return [
          optionKey,
          optionKey === String(signedInFocusPlayerOptionId ?? "").trim() &&
          authProfilePlayer?.name
            ? { ...option, label: "You" }
            : option,
        ];
      })
    );
    const seen = new Set<string>();
    const ordered: SetupOption[] = [];

    const pushOption = (optionKey?: string | null) => {
      const normalizedKey = String(optionKey ?? "").trim();
      if (!normalizedKey || seen.has(normalizedKey)) return;

      const match = optionByKey.get(normalizedKey);
      if (!match) return;

      seen.add(normalizedKey);
      ordered.push(match);
    };

    prioritizedFocusPlayerDirectoryPlayers.forEach((player) =>
      pushOption(String(player.id))
    );
    focusPlayerOptions.forEach((option) => pushOption(String(option.key)));

    return ordered;
  }, [
    authProfilePlayer?.name,
    focusPlayerOptions,
    prioritizedFocusPlayerDirectoryPlayers,
    signedInFocusPlayerOptionId,
  ]);
  const primaryFocusPlayerOptions = useMemo(
    () =>
      buildPrimarySetupOptions(
        orderedFocusPlayerOptions,
        [selectedPlayerId, signedInFocusPlayerOptionId],
        4,
      ),
    [orderedFocusPlayerOptions, selectedPlayerId, signedInFocusPlayerOptionId]
  );
  const orderedScopePlayerOptions = useMemo(() => {
    const optionByKey = new Map(
      availableScopePlayerOptions.map((option) => {
        const optionKey = String(option.key);
        return [
          optionKey,
          optionKey === String(signedInScopePlayerOptionId ?? "").trim() &&
          authProfilePlayer?.name
            ? { ...option, label: "You" }
            : option,
        ];
      })
    );
    const seen = new Set<string>();
    const ordered: SetupOption[] = [];

    const pushOption = (optionKey?: string | null) => {
      const normalizedKey = String(optionKey ?? "").trim();
      if (!normalizedKey || seen.has(normalizedKey)) return;

      const match = optionByKey.get(normalizedKey);
      if (!match) return;

      seen.add(normalizedKey);
      ordered.push(match);
    };

    prioritizedScopePlayerDirectoryPlayers.forEach((player) =>
      pushOption(String(player.id))
    );
    availableScopePlayerOptions.forEach((option) => pushOption(String(option.key)));

    return ordered;
  }, [
    authProfilePlayer?.name,
    prioritizedScopePlayerDirectoryPlayers,
    availableScopePlayerOptions,
    signedInScopePlayerOptionId,
  ]);
  const filteredFocusPlayerOptions = useMemo(() => {
    const normalizedQuery = deferredFocusPlayerSearch.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return orderedFocusPlayerOptions.filter((option) => {
      const isSignedInOption =
        String(option.key) === String(signedInFocusPlayerOptionId ?? "").trim();
      const searchTargets = [
        String(option.label ?? "").toLowerCase(),
        isSignedInOption ? String(authProfilePlayer?.name ?? "").toLowerCase() : "",
      ].filter(Boolean);

      return searchTargets.some((target) => target.includes(normalizedQuery));
    });
  }, [
    authProfilePlayer?.name,
    deferredFocusPlayerSearch,
    orderedFocusPlayerOptions,
    signedInFocusPlayerOptionId,
  ]);
  const filteredComparePlayerOptions = useMemo(() => {
    const normalizedQuery = deferredComparePlayerSearch.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return comparePlayerOptions.filter((option) => {
      if (isRadarChart && String(option.key) === String(selectedPlayerId ?? "")) {
        return false;
      }

      return String(option.label ?? "").toLowerCase().includes(normalizedQuery);
    });
  }, [
    comparePlayerOptions,
    deferredComparePlayerSearch,
    isRadarChart,
    selectedPlayerId,
  ]);
  const comparePlayerSearchItems = useMemo(
    () =>
      filteredComparePlayerOptions.map((option) => ({
        id: String(option.key),
        label: option.label,
      })),
    [filteredComparePlayerOptions]
  );
  const selectedRadarComparePlayers = useMemo(
    () =>
      selectedRadarCompareIds
        .map((playerId) => findOption(radarCompareOptions, playerId))
        .filter((option): option is SetupOption => option !== null),
    [radarCompareOptions, selectedRadarCompareIds],
  );
  const radarPinnedCompareOptions = useMemo(() => {
    const selectedIds = new Set(selectedRadarCompareIds.map((id) => String(id)));
    const selectedOptions = selectedRadarComparePlayers.map((option, index) => ({
      ...option,
      badge: `P${index + 1}`,
    }));
    const remainingOptions = radarCompareOptions
      .filter((option) => !selectedIds.has(String(option.key)))
      .slice(0, Math.max(0, 8 - selectedOptions.length));

    return [...selectedOptions, ...remainingOptions];
  }, [radarCompareOptions, selectedRadarCompareIds, selectedRadarComparePlayers]);
  const filteredScopePlayerOptions = useMemo(() => {
    const normalizedQuery = deferredScopePlayerSearch.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return orderedScopePlayerOptions.filter((option) => {
      const isSignedInOption =
        String(option.key) === String(signedInScopePlayerOptionId ?? "").trim();
      const searchTargets = [
        String(option.label ?? "").toLowerCase(),
        isSignedInOption ? String(authProfilePlayer?.name ?? "").toLowerCase() : "",
      ].filter(Boolean);

      return searchTargets.some((target) => target.includes(normalizedQuery));
    });
  }, [
    authProfilePlayer?.name,
    deferredScopePlayerSearch,
    orderedScopePlayerOptions,
    signedInScopePlayerOptionId,
  ]);
  const collapsedScopePlayerOptions = useMemo(
    () =>
      buildPrimarySetupOptions(
        orderedScopePlayerOptions,
        [
          signedInScopePlayerOptionId,
          ...topCommonScopePlayers.map((player) => String(player.id)),
        ],
        4,
      ),
    [
      orderedScopePlayerOptions,
      signedInScopePlayerOptionId,
      topCommonScopePlayers,
    ]
  );
  const canExpandScopePlayerOptions =
    orderedScopePlayerOptions.length > collapsedScopePlayerOptions.length;
  const visibleScopePlayerTabOptions = useMemo(() => {
    const normalizedQuery = scopePlayerSearch.trim();
    const matchingOptions = normalizedQuery
      ? filteredScopePlayerOptions
      : showAllScopePlayerOptions
        ? orderedScopePlayerOptions
        : collapsedScopePlayerOptions;

    if (normalizedQuery || !canExpandScopePlayerOptions) {
      return matchingOptions;
    }

    return [
      ...matchingOptions,
      {
        key: TOGGLE_SCOPE_PLAYER_LIST_KEY,
        label: showAllScopePlayerOptions ? "Show less" : "Show all",
        kind: "action" as const,
      },
    ];
  }, [
    canExpandScopePlayerOptions,
    collapsedScopePlayerOptions,
    filteredScopePlayerOptions,
    orderedScopePlayerOptions,
    scopePlayerSearch,
    showAllScopePlayerOptions,
  ]);
  const scopeSegmentedSelectedKeys = useMemo(
    () => selectedGroupIds,
    [selectedGroupIds]
  );

  useEffect(() => {
    setSelectedChartKey(routeChartKey);
  }, [routeChartKey]);

  useEffect(() => {
    setShowAllScopePlayerOptions(false);
  }, [selectedChartKey]);

  useEffect(() => {
    if (!canExpandScopePlayerOptions && showAllScopePlayerOptions) {
      setShowAllScopePlayerOptions(false);
    }
  }, [canExpandScopePlayerOptions, showAllScopePlayerOptions]);

  useEffect(() => {
    if (getParam(params.setup) != null) {
      setSetupOpen(routeSetupOpen);
    }
  }, [params.setup, routeSetupOpen]);

  useEffect(() => {
    const nextLineMode = resolveOptionKey(
      lineModeOptions,
      shouldHonorRouteSetupParams && getParam(params.lineMode) != null
        ? routeLineMode
        : null,
      selectedLineMode,
      setupDefaults.lineMode,
    );
    if (nextLineMode && nextLineMode !== selectedLineMode) {
      setSelectedLineMode(nextLineMode);
    }
  }, [
    lineModeOptions,
    params.lineMode,
    routeLineMode,
    selectedLineMode,
    setupDefaults.lineMode,
    shouldHonorRouteSetupParams,
  ]);

  useEffect(() => {
    const nextEloTab = resolveOptionKey(
      eloViewOptions,
      shouldHonorRouteSetupParams && getParam(params.eloTab) != null
        ? routeEloTab
        : null,
      selectedEloTab,
      setupDefaults.eloTab,
    );
    if (nextEloTab && nextEloTab !== selectedEloTab) {
      setSelectedEloTab(nextEloTab);
    }
  }, [
    eloViewOptions,
    params.eloTab,
    routeEloTab,
    selectedEloTab,
    setupDefaults.eloTab,
    shouldHonorRouteSetupParams,
  ]);

  useEffect(() => {
    const activeId = String(selectedPlayerId ?? "").trim();
    const hasActivePlayer = focusPlayerOptions.some(
      (option) => String(option.key) === activeId
    );

    if (!activeId || !hasActivePlayer) {
      setSelectedPlayerId(
        preferredFocusPlayerId ?? (focusPlayerOptions[0] ? String(focusPlayerOptions[0].key) : null)
      );
      return;
    }

    const nextSelectedPlayerId = resolveOptionKey(
      focusPlayerOptions,
      shouldHonorRouteSetupParams ? routePlayerId : null,
      activeId,
      preferredFocusPlayerId,
      setupDefaults.focusPlayerId,
    );
    if (nextSelectedPlayerId !== selectedPlayerId) {
      setSelectedPlayerId(nextSelectedPlayerId);
    }
  }, [
    focusPlayerOptions,
    preferredFocusPlayerId,
    routePlayerId,
    selectedPlayerId,
    setupDefaults.focusPlayerId,
    shouldHonorRouteSetupParams,
  ]);

  useEffect(() => {
    if (isRadarChart) {
      return;
    }

    const nextComparePlayerId = resolveOptionKey(
      comparePlayerOptions,
      shouldHonorRouteSetupParams ? routeCompareId : null,
      comparePlayerId,
      setupDefaults.comparePlayerId,
    );
    if (nextComparePlayerId !== comparePlayerId) {
      setComparePlayerId(nextComparePlayerId);
    }
  }, [
    comparePlayerId,
    comparePlayerOptions,
    isRadarChart,
    routeCompareId,
    setupDefaults.comparePlayerId,
    shouldHonorRouteSetupParams,
  ]);

  useEffect(() => {
    if (!isRadarChart) {
      return;
    }

    const nextRadarCompareIds = sanitizeRadarCompareIds(
      radarCompareOptions,
      shouldHonorRouteSetupParams
        ? routeCompareIds.length
          ? routeCompareIds
          : routeCompareId
            ? [routeCompareId]
            : []
        : selectedRadarCompareIds,
      selectedPlayerId,
      4,
    );

    if (!haveSameIds(nextRadarCompareIds, selectedRadarCompareIds)) {
      setSelectedRadarCompareIds(nextRadarCompareIds);
    }
  }, [
    isRadarChart,
    radarCompareOptions,
    routeCompareId,
    routeCompareIdsKey,
    selectedPlayerId,
    selectedRadarCompareIds,
    shouldHonorRouteSetupParams,
  ]);

  useEffect(() => {
    const nextSelectedOpponentId = resolveOptionKey(
      opponentOptions,
      shouldHonorRouteSetupParams ? routeOpponentId : null,
      selectedOpponentId,
      setupDefaults.opponentId,
      "none",
    );
    if (nextSelectedOpponentId !== selectedOpponentId) {
      setSelectedOpponentId(nextSelectedOpponentId);
    }
  }, [
    opponentOptions,
    routeOpponentId,
    selectedOpponentId,
    setupDefaults.opponentId,
    shouldHonorRouteSetupParams,
  ]);

  useEffect(() => {
    const nextMetric = resolveOptionKey(
      metricOptions,
      shouldHonorRouteSetupParams && getParam(params.metric) != null
        ? routeMetric
        : null,
      selectedMetric,
      setupDefaults.metricKey,
    );
    if (nextMetric !== selectedMetric) {
      setSelectedMetric(nextMetric);
    }
  }, [
    metricOptions,
    params.metric,
    routeMetric,
    selectedMetric,
    setupDefaults.metricKey,
    shouldHonorRouteSetupParams,
  ]);

  useEffect(() => {
    if (!routeScopeSeedKey) {
      appliedRouteScopeKeyRef.current = null;
      return;
    }

    if (!scopePlayerIdentities.length) {
      return;
    }

    if (routeScopeSeedKey && appliedRouteScopeKeyRef.current === routeScopeSeedKey) {
      return;
    }

    const nextRouteGroupIds = getPreferredScopeIdsForChart({
      chartKey: selectedChartKey,
      routeIds,
      currentIds: selectedGroupIds,
      players: scopePlayerIdentities,
    });

    if (nextRouteGroupIds) {
      setSelectedGroupIds(nextRouteGroupIds);
    }

    appliedRouteScopeKeyRef.current = routeScopeSeedKey;
  }, [routeIds, routeScopeSeedKey, scopePlayerIdentities, selectedChartKey, selectedGroupIds]);

  useEffect(() => {
    setSelectedGroupIds((current) => {
      const fallbackIds = setupDefaults.scopedPlayerIds.length
        ? sanitizeSelectedIds(availableScopePlayerOptions, setupDefaults.scopedPlayerIds, [])
        : collapsedScopePlayerOptions.map((option) => String(option.key));
      const nextIds = sanitizeSelectedIds(availableScopePlayerOptions, current, fallbackIds);
      return haveSameIds(nextIds, current) ? current : nextIds;
    });
  }, [
    availableScopePlayerOptions,
    collapsedScopePlayerOptions,
    setupDefaults.scopedPlayerIds,
  ]);

  useEffect(() => {
    if (isRadarChart) {
      return;
    }

    if (comparePlayerId && String(comparePlayerId) === String(selectedPlayerId)) {
      const fallback = comparePlayerOptions.find(
        (option) => String(option.key) !== String(selectedPlayerId)
      );
      setComparePlayerId(fallback ? String(fallback.key) : null);
    }
  }, [comparePlayerId, comparePlayerOptions, isRadarChart, selectedPlayerId]);

  useEffect(() => {
    if (selectedOpponentId && String(selectedOpponentId) === String(selectedPlayerId)) {
      setSelectedOpponentId("none");
    }
  }, [selectedOpponentId, selectedPlayerId]);

  useEffect(() => {
    if (!setupOpen) return undefined;

    const backSubscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (setupOpen) {
          setChartSetupOpen(false);
          return true;
        }
        return false;
      }
    );

    return () => backSubscription.remove();
  }, [setupOpen]);

  useEffect(() => {
    if (setupOpen) {
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      });
    }
  }, [setupOpen]);

  const selectedPlayer = useMemo(
    () => findOption(focusPlayerOptions, selectedPlayerId) ?? focusPlayerOptions[0] ?? null,
    [focusPlayerOptions, selectedPlayerId]
  );

  const comparePlayer = useMemo(() => {
    if (isRadarChart) {
      return selectedRadarComparePlayers[0] ?? null;
    }

    const explicit = findOption(comparePlayerOptions, comparePlayerId);
    if (explicit) return explicit;
    return comparePlayerOptions[0] ?? null;
  }, [
    comparePlayerId,
    comparePlayerOptions,
    isRadarChart,
    selectedRadarComparePlayers,
  ]);
  const radarCompareSummaryLabel = useMemo(() => {
    if (!selectedRadarComparePlayers.length) {
      return null;
    }

    if (selectedRadarComparePlayers.length === 1) {
      return selectedRadarComparePlayers[0]?.label ?? null;
    }

    return `${selectedRadarComparePlayers.length} compares`;
  }, [selectedRadarComparePlayers]);

  const selectedOpponent = useMemo(() => {
    if (!selectedOpponentId || selectedOpponentId === "none") return null;
    const explicit = findOption(opponentOptions, selectedOpponentId);
    if (explicit && explicit.key !== "none") return explicit;
    return null;
  }, [opponentOptions, selectedOpponentId]);

  const sectionedCharts = useMemo(
    () =>
      CHART_SECTIONS.map((section) => ({
        ...section,
        charts: getChartsForSection(section.key).filter((chart) => chart.key !== selectedChart.key),
      })),
    [selectedChart.key]
  );

  const activeMetric = resolveOptionKey(
    metricOptions,
    selectedMetric,
    setupDefaults.metricKey,
  );
  const activeMetricLabel = useMemo(
    () => findOption(metricOptions, activeMetric)?.label ?? null,
    [activeMetric, metricOptions]
  );
  const minimumScopeCount = selectedChart.key === "relationship_graph" ? 2 : 1;
  const scopeSummary = useMemo(
    () =>
      buildScopeStageSummary({
        focusPlayerLabel: hasFocusPlayerToggle ? selectedPlayer?.label ?? null : null,
        comparePlayerLabel:
          comparePlayerOptions.length > 0
            ? isRadarChart
              ? radarCompareSummaryLabel
              : comparePlayer?.label ?? null
            : null,
        scopedCount: hasScopePlayerToggle ? selectedGroupIds.length : 0,
      }),
    [
      comparePlayer?.label,
      comparePlayerOptions.length,
      hasFocusPlayerToggle,
      hasScopePlayerToggle,
      isRadarChart,
      radarCompareSummaryLabel,
      selectedGroupIds.length,
      selectedPlayer?.label,
    ]
  );
  const metricSummary = useMemo(
    () => buildMetricStageSummary(activeMetricLabel),
    [activeMetricLabel]
  );
  const hasMetricStageChoices = metricOptions.length > 0;
  const showStyleOpponentOptions =
    selectedChart.key === "elo" &&
    selectedEloTab === "Context" &&
    opponentOptions.length > 0;
  const hasStyleStageChoices =
    lineModeOptions.length > 0 ||
    eloViewOptions.length > 0 ||
    showStyleOpponentOptions;
  const styleSummary = useMemo(
    () =>
      buildStyleStageSummary({
        lineModeLabel: lineModeOptions.length > 0 ? titleCase(selectedLineMode) : null,
        eloViewLabel: eloViewOptions.length > 0 ? selectedEloTab : null,
        opponentLabel: selectedOpponent?.label ?? null,
      }),
    [
      eloViewOptions.length,
      lineModeOptions.length,
      selectedEloTab,
      selectedLineMode,
      selectedOpponent?.label,
    ]
  );
  const scopeReady =
    (!hasFocusPlayerToggle || Boolean(selectedPlayer?.key)) &&
    (!hasScopePlayerToggle || selectedGroupIds.length >= minimumScopeCount) &&
    (comparePlayerOptions.length === 0 || isRadarChart || Boolean(comparePlayer?.key));
  const metricReady = metricOptions.length === 0 || Boolean(activeMetric);
  const styleReady =
    (lineModeOptions.length === 0 || Boolean(selectedLineMode)) &&
    (eloViewOptions.length === 0 || Boolean(selectedEloTab)) &&
    (selectedChart.key !== "elo" ||
      selectedEloTab !== "Context" ||
      opponentOptions.length === 0 ||
      !selectedOpponentId ||
      selectedOpponentId === "none" ||
      Boolean(selectedOpponent?.key));
  const completedStages = useMemo(
    () => ({
      scope: scopeReady,
      metric: metricReady,
      style: styleReady,
    }),
    [metricReady, scopeReady, styleReady]
  );
  const railStages = useMemo(
    () =>
      resolveChartSetupRailState({
        activeStageKey,
        completedStages,
      }),
    [activeStageKey, completedStages]
  );
  const visibleStageKeys = useMemo<ChartSetupStageKey[]>(() => {
    const nextStages: ChartSetupStageKey[] = ["scope"];

    if (hasMetricStageChoices) {
      nextStages.push("metric");
    }

    if (hasStyleStageChoices) {
      nextStages.push("style");
    }

    return nextStages;
  }, [hasMetricStageChoices, hasStyleStageChoices]);
  const normalizedActiveStageKey = useMemo<ChartSetupStageKey>(() => {
    if (visibleStageKeys.includes(activeStageKey)) {
      return activeStageKey;
    }

    if (activeStageKey === "metric" && visibleStageKeys.includes("style")) {
      return "style";
    }

    if (visibleStageKeys.includes("metric")) {
      return "metric";
    }

    return "scope";
  }, [activeStageKey, visibleStageKeys]);
  const visibleRailStages = useMemo(
    () => railStages.filter((stage) => visibleStageKeys.includes(stage.key)),
    [railStages, visibleStageKeys]
  );
  const lastVisibleStageKey =
    visibleStageKeys[visibleStageKeys.length - 1] ?? "scope";
  const canOpenChart = scopeReady && metricReady && styleReady;
  const heroTakeaway = buildFeaturedChartTakeaway({
    chartKey: selectedChart.key,
    selectedPlayerName: selectedPlayer?.label,
    comparePlayerName: comparePlayer?.label,
    scopedCount: selectedGroupIds.length,
    metricKey: activeMetric ?? undefined,
  });
  const heroContextChips = useMemo(() => {
    const chips: string[] = [];

    if (scopeSummary) chips.push(scopeSummary);
    if (metricSummary) chips.push(metricSummary);
    if (styleSummary) chips.push(styleSummary);

    return chips.slice(0, 4);
  }, [
    metricSummary,
    scopeSummary,
    styleSummary,
  ]);

  useEffect(() => {
    if (activeStageKey !== normalizedActiveStageKey) {
      setActiveStageKey(normalizedActiveStageKey);
    }
  }, [activeStageKey, normalizedActiveStageKey]);

  useEffect(() => {
    if (!setupOpen) {
      previousScopeStageSignatureRef.current = null;
      return;
    }

    const signature = [
      selectedPlayer?.key ?? "",
      comparePlayerOptions.length > 0
        ? isRadarChart
          ? selectedRadarCompareIds.join(",")
          : comparePlayer?.key ?? ""
        : "",
      selectedGroupIds.join(","),
    ].join("|");
    const previous = previousScopeStageSignatureRef.current;
    previousScopeStageSignatureRef.current = signature;

    if (
      activeStageKey === "scope" &&
      previous !== null &&
      previous !== signature &&
      scopeReady
    ) {
      setActiveStageKey(
        hasMetricStageChoices
          ? "metric"
          : hasStyleStageChoices
            ? "style"
            : "scope",
      );
    }
  }, [
    activeStageKey,
    comparePlayer?.key,
    comparePlayerOptions.length,
    isRadarChart,
    hasMetricStageChoices,
    hasStyleStageChoices,
    scopeReady,
    selectedRadarCompareIds,
    selectedGroupIds,
    selectedPlayer?.key,
    setupOpen,
  ]);

  useEffect(() => {
    if (!setupOpen) {
      previousMetricStageSignatureRef.current = null;
      return;
    }

    const signature = [
      activeMetric ?? "",
      metricOptions.map((option) => option.key).join(","),
    ].join("|");
    const previous = previousMetricStageSignatureRef.current;
    previousMetricStageSignatureRef.current = signature;

    if (
      activeStageKey === "metric" &&
      previous !== null &&
      previous !== signature &&
      metricReady
    ) {
      setActiveStageKey(hasStyleStageChoices ? "style" : "metric");
    }
  }, [activeMetric, activeStageKey, hasStyleStageChoices, metricOptions, metricReady, setupOpen]);

  function handleFocusPlayerSelect(nextPlayerId: string) {
    setSelectedPlayerId(nextPlayerId);
  }

  function handleComparePlayerSelect(nextComparePlayerId: string) {
    setComparePlayerId(nextComparePlayerId);
    setComparePlayerSearch("");
  }

  function handleRadarComparePlayerToggle(nextComparePlayerId: string) {
    setSelectedRadarCompareIds((current) => {
      const normalizedId = String(nextComparePlayerId ?? "").trim();
      if (!normalizedId) {
        return current;
      }

      if (current.includes(normalizedId)) {
        return current.filter((playerId) => playerId !== normalizedId);
      }

      if (current.length >= 4) {
        return current;
      }

      return [...current, normalizedId];
    });
    setComparePlayerSearch("");
  }

  function toggleGroupPlayer(playerId: string) {
    setSelectedGroupIds((current) => {
      if (current.includes(playerId)) {
        if (current.length <= minimumScopeCount) return current;
        return current.filter((id) => id !== playerId);
      }
      return [...current, playerId];
    });
  }

  function handleScopePlayerToggle(nextPlayerId: string) {
    if (nextPlayerId === TOGGLE_SCOPE_PLAYER_LIST_KEY) {
      setShowAllScopePlayerOptions((current) => !current);
      return;
    }

    toggleGroupPlayer(nextPlayerId);
  }

  function buildChartHubParams(
    chart: ChartCatalogEntry,
    setupOpen: boolean
  ) {
    const supportsFocusPlayerToggle = supportsChartFocusPlayerToggle(chart.key);
    const supportsScopePlayerToggle = supportsChartScopePlayerToggle(chart.key);
    const params: Record<string, string | undefined> = {
      chartKey: chart.key,
      setup: setupOpen ? "true" : undefined,
      playerId:
        supportsFocusPlayerToggle && selectedPlayer?.key
          ? String(selectedPlayer.key)
          : undefined,
      compareId: undefined,
      compareIds: undefined,
    };

    if (chart.key === "elo") {
      if (supportsScopePlayerToggle && selectedGroupIds.length) {
        params.ids = selectedGroupIds.join(",");
      }
      params.eloTab = selectedEloTab || undefined;
      params.opponentId =
        selectedEloTab === "Context" && selectedOpponent?.key
          ? String(selectedOpponent.key)
          : undefined;
      return params;
    }

    if (chart.key === "radar") {
      if (selectedRadarCompareIds.length) {
        params.compareIds = selectedRadarCompareIds.join(",");
      }
    } else if (comparePlayerOptions.length > 0 && comparePlayer?.key) {
      params.compareId = String(comparePlayer.key);
    }

    // Gate on the chart being routed to, not on scopePlayerOptions: that still
    // reflects the previously selected chart, so switching cards would attach
    // scope ids to a chart that does not support scoping.
    if (supportsScopePlayerToggle && selectedGroupIds.length) {
      params.ids = selectedGroupIds.join(",");
    }

    if (metricOptions.length > 0 && activeMetric) {
      params.metric = activeMetric;
    }

    if (lineModeOptions.length > 0) {
      params.lineMode = selectedLineMode;
    }

    return params;
  }

  function replaceChartHubRoute(chart: ChartCatalogEntry, setupOpen: boolean) {
    router.setParams(buildChartHubParams(chart, setupOpen));
  }

  function setChartSetupOpen(nextSetupOpen: boolean, chart: ChartCatalogEntry = selectedChart) {
    setSetupOpen(nextSetupOpen);
    replaceChartHubRoute(chart, nextSetupOpen);
  }

  useEffect(() => {
    if (!setupOpen) return;

    replaceChartHubRoute(selectedChart, true);
  }, [
    activeMetric,
    comparePlayer?.key,
    comparePlayerOptions.length,
    selectedRadarCompareIds,
    lineModeOptions.length,
    metricOptions.length,
    selectedChart,
    selectedEloTab,
    selectedGroupIds,
    selectedLineMode,
    selectedOpponent?.key,
    selectedPlayer?.key,
    setupOpen,
  ]);

  function previewChart(chartKey: ChartCatalogKey) {
    const nextChart = resolveChartCatalogEntry(chartKey);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    setSelectedChartKey(nextChart.key);
    setActiveStageKey("scope");
    setChartSetupOpen(false, nextChart);
  }

  function resolveSetupEntryStage() {
    if (!scopeReady) return "scope";
    if (hasMetricStageChoices && !metricReady) return "metric";
    if (hasStyleStageChoices && !styleReady) return "style";
    return lastVisibleStageKey;
  }

  function openSetup() {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    setActiveStageKey(resolveSetupEntryStage());
    setChartSetupOpen(true);
  }

  function reopenStage(stageKey: ChartSetupStageKey) {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    setActiveStageKey(stageKey);
  }

  function openChart(chart: ChartCatalogEntry) {
    const hubParams = buildChartHubParams(chart, true);

    replaceChartHubRoute(chart, true);

    requestAnimationFrame(() => {
      const { setup: _setup, ...detailRouteParams } = hubParams;

      router.push({
        pathname: "/charts/[chartKey]",
        params: detailRouteParams,
      });
    });
  }

  return (
    <PageShell preset="analytics" scroll={false}>
      <ScrollView
        ref={scrollViewRef}
        stickyHeaderIndices={[0]}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.pageScrollContent}
      >
        <View style={styles.stickyHeroShell}>
          <ChartSetupHeroBar
            title={selectedChart.title}
            takeaway={heroTakeaway}
            chips={heroContextChips}
            preview={selectedChart.preview}
            tone={selectedChart.tone}
            setupOpen={setupOpen}
            onToggleSetup={() => {
              if (setupOpen) {
                setChartSetupOpen(false);
                return;
              }
              openSetup();
            }}
            onBackToCommand={() => router.push(buildHomeRoute())}
          />
        </View>

        {setupOpen ? (
          <SectionCard
            title={`Adjust ${selectedChart.title}`}
            style={styles.sectionCardCompact}
          >
            <View style={styles.setupStack}>
              {setupLoading ? (
                <EmptyStateCard message="Loading chart setup options..." />
              ) : showSetupErrorCard ? (
                <EmptyStateCard
                  message={setupError ?? "Chart setup failed to load."}
                  hint="Check your connection or try switching to a different chart."
                />
              ) : (
                <>
                  {setupRecoveryMessage ? (
                    <Text style={styles.emptyText}>{setupRecoveryMessage}</Text>
                  ) : null}
                  {chartSetupQuery.isStale ? (
                    <Text style={styles.emptyText}>
                      {setupFreshness.sourceCaption("Published chart setup is live.")}
                    </Text>
                  ) : null}
                  <View style={styles.guidedRailStack}>
                    {visibleRailStages.map((stage, index) => {
                      if (stage.key === "scope") {
                        return (
                          <ChartSetupStageShell
                            key={stage.key}
                            index={index + 1}
                            title="Scope"
                            hideStepLabel
                            hideTitle
                            helper="Choose whose story this chart should tell."
                            summary={scopeSummary}
                            status={stage.status}
                            onEdit={() => reopenStage("scope")}
                            footer={
                              lastVisibleStageKey === "scope" ? (
                                <ChartSetupStageAction
                                  title="Open Chart"
                                  subtitle="Launch this chart with the current setup"
                                  onPress={() => openChart(selectedChart)}
                                  disabled={!canOpenChart}
                                />
                              ) : null
                            }
                          >
                            <View style={styles.stageSectionStack}>
                              {hasFocusPlayerToggle && focusPlayerOptions.length > 0 ? (
                                <SetupSection
                                  title="Focus player"
                                  contentStyle={styles.setupFullWidthSectionContent}
                                >
                                  <SetupSegmentedTabs
                                    items={primaryFocusPlayerOptions}
                                    selectedKeys={selectedPlayer ? [String(selectedPlayer.key)] : []}
                                    onChange={handleFocusPlayerSelect}
                                  />

                                  <PlayerSearchPicker
                                    query={focusPlayerSearch}
                                    onQueryChange={setFocusPlayerSearch}
                                    placeholder="Search player"
                                    items={[]}
                                    selectedIds={selectedPlayer ? [String(selectedPlayer.key)] : []}
                                    onSelect={handleFocusPlayerSelect}
                                    inputProps={{
                                      placeholderTextColor: CHART_COLORS.sub,
                                      returnKeyType: "search",
                                      style: styles.setupSearchInput,
                                    }}
                                    variant="rail"
                                    hideResults
                                  />

                                  {focusPlayerSearch.trim() ? (
                                    filteredFocusPlayerOptions.length ? (
                                      <SetupSegmentedTabs
                                        items={filteredFocusPlayerOptions}
                                        selectedKeys={selectedPlayer ? [String(selectedPlayer.key)] : []}
                                        onChange={handleFocusPlayerSelect}
                                      />
                                    ) : (
                                      <Text style={styles.emptyText}>No players match that search yet.</Text>
                                    )
                                  ) : null}
                                </SetupSection>
                              ) : null}

                              {comparePlayerOptions.length > 0 ? (
                                isRadarChart ? (
                                  <SetupSection
                                    title="Compare players"
                                    subtitle="Select up to 4 compare players. Selected players stay pinned at the top."
                                    contentStyle={styles.setupFullWidthSectionContent}
                                  >
                                    <SetupSegmentedTabs
                                      items={radarPinnedCompareOptions}
                                      selectedKeys={selectedRadarCompareIds}
                                      onChange={handleRadarComparePlayerToggle}
                                      selectionMode="multiple"
                                      columns={2}
                                    />

                                    <PlayerSearchPicker
                                      query={comparePlayerSearch}
                                      onQueryChange={setComparePlayerSearch}
                                      onClearQuery={() => setComparePlayerSearch("")}
                                      placeholder="Search compare players"
                                      items={comparePlayerSearchItems}
                                      selectedIds={selectedRadarCompareIds}
                                      onSelect={handleRadarComparePlayerToggle}
                                      inputProps={{
                                        placeholderTextColor: CHART_COLORS.sub,
                                        returnKeyType: "search",
                                        style: styles.setupSearchInput,
                                      }}
                                      variant="rail"
                                      selectionMode="multiple"
                                      showResultsOnlyWhenQuery
                                    />
                                  </SetupSection>
                                ) : (
                                  <SetupSection
                                    title="Compare player"
                                    contentStyle={styles.setupFullWidthSectionContent}
                                  >
                                    <SetupTabs
                                      items={comparePlayerOptions}
                                      value={comparePlayer ? String(comparePlayer.key) : ""}
                                      onChange={handleComparePlayerSelect}
                                    />

                                    <PlayerSearchPicker
                                      query={comparePlayerSearch}
                                      onQueryChange={setComparePlayerSearch}
                                      onClearQuery={() => setComparePlayerSearch("")}
                                      placeholder="Search player here"
                                      items={comparePlayerSearchItems}
                                      selectedIds={comparePlayer ? [String(comparePlayer.key)] : []}
                                      onSelect={handleComparePlayerSelect}
                                      inputProps={{
                                        placeholderTextColor: CHART_COLORS.sub,
                                        returnKeyType: "search",
                                        style: styles.setupSearchInput,
                                      }}
                                      variant="rail"
                                      showResultsOnlyWhenQuery
                                    />
                                  </SetupSection>
                                )
                              ) : null}

                              {hasScopePlayerToggle && scopePlayerOptions.length > 0 ? (
                                <SetupSection
                                  title="Players in scope"
                                  contentStyle={styles.setupFullWidthSectionContent}
                                >
                                  <SetupSegmentedTabs
                                    items={visibleScopePlayerTabOptions}
                                    selectedKeys={scopeSegmentedSelectedKeys}
                                    onChange={handleScopePlayerToggle}
                                    selectionMode="multiple"
                                    columns={2}
                                  />

                                  <PlayerSearchPicker
                                    query={scopePlayerSearch}
                                    onQueryChange={setScopePlayerSearch}
                                    onClearQuery={() => setScopePlayerSearch("")}
                                    placeholder="Search player"
                                    items={[]}
                                    selectedIds={selectedGroupIds}
                                    onSelect={(playerId) => handleScopePlayerToggle(String(playerId))}
                                    inputProps={{
                                      placeholderTextColor: CHART_COLORS.sub,
                                      returnKeyType: "search",
                                      style: styles.setupSearchInput,
                                    }}
                                    variant="rail"
                                    selectionMode="multiple"
                                    hideResults
                                  />

                                  {scopePlayerSearch.trim() && !filteredScopePlayerOptions.length ? (
                                    <Text style={styles.emptyText}>No players match that search yet.</Text>
                                  ) : null}
                                </SetupSection>
                              ) : null}
                            </View>
                          </ChartSetupStageShell>
                        );
                      }

                      if (stage.key === "metric") {
                        return (
                          <ChartSetupStageShell
                            key={stage.key}
                            index={index + 1}
                            title="Metric"
                            helper="Choose what this chart should measure."
                            lockedHelper="Unlocks after Scope"
                            summary={metricSummary}
                            status={stage.status}
                            onEdit={() => reopenStage("metric")}
                            footer={
                              lastVisibleStageKey === "metric" ? (
                                <ChartSetupStageAction
                                  title="Open Chart"
                                  subtitle="Launch this chart with the current setup"
                                  onPress={() => openChart(selectedChart)}
                                  disabled={!canOpenChart}
                                />
                              ) : null
                            }
                          >
                            {hasMetricStageChoices ? (
                              <SetupSection
                                title="Metric"
                                contentStyle={styles.metricGrid}
                                definitionMetricKey={activeMetric}
                              >
                                <SetupSegmentedTabs
                                  items={metricOptions}
                                  selectedKeys={activeMetric ? [activeMetric] : []}
                                  onChange={(nextMetric) => setSelectedMetric(nextMetric)}
                                  columns={2}
                                />
                              </SetupSection>
                            ) : null}
                          </ChartSetupStageShell>
                        );
                      }

                      return (
                        <ChartSetupStageShell
                          key={stage.key}
                          index={index + 1}
                          title="Style"
                          hideStepLabel
                          hideTitle
                          hideHelperText
                          lockedHelper="Unlocks after Metric"
                          summary={null}
                          status={stage.status}
                          onEdit={() => reopenStage("style")}
                          footer={
                            <ChartSetupStageAction
                              title="Open Chart"
                              subtitle="Launch this chart with the current setup"
                              onPress={() => openChart(selectedChart)}
                              disabled={!canOpenChart}
                            />
                          }
                        >
                          <View style={styles.stageSectionStack}>
                            {lineModeOptions.length > 0 ? (
                              <SetupSection title="Line view">
                                <SetupTabs
                                  items={lineModeOptions}
                                  value={selectedLineMode}
                                  onChange={setSelectedLineMode}
                                />
                              </SetupSection>
                            ) : null}

                            {eloViewOptions.length > 0 ? (
                              <SetupSection title="ELO view">
                                <SetupTabs
                                  items={eloViewOptions}
                                  value={selectedEloTab}
                                  onChange={setSelectedEloTab}
                                />
                              </SetupSection>
                            ) : null}

                            {showStyleOpponentOptions ? (
                              <SetupSection title="Opponent">
                                <SetupTabs
                                  items={opponentOptions}
                                  value={selectedOpponent ? String(selectedOpponent.key) : "none"}
                                  onChange={setSelectedOpponentId}
                                />
                              </SetupSection>
                            ) : null}
                          </View>
                        </ChartSetupStageShell>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
          </SectionCard>
        ) : (
          <>
            {sectionedCharts.map((section) => (
              section.charts.length ? (
              <SectionCard
                key={section.key}
                title={section.title}
                style={styles.sectionCardCompact}
              >
                <ScrollView
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.railContent}
                >
                  {section.charts.map((chart) => (
                    <ChartCard
                      key={chart.key}
                      chart={chart}
                      active={selectedChart.key === chart.key}
                      onPress={() => previewChart(chart.key)}
                    />
                  ))}
                </ScrollView>
              </SectionCard>
              ) : null
            ))}
          </>
        )}
      </ScrollView>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  pageScrollContent: {
    gap: 6,
    paddingBottom: 14,
  },
  stickyHeroShell: {
    backgroundColor: "rgba(8,17,32,0.98)",
    paddingBottom: 2,
  },
  railContent: {
    gap: 6,
    paddingRight: 24,
  },
  sectionCardCompact: {
    padding: 7,
    gap: 4,
  },
  chartCard: {
    width: 170,
    minHeight: 138,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CHART_COLORS.border,
    backgroundColor: CHART_COLORS.cardAlt,
    gap: 5,
  },
  chartCardPressable: {
    flex: 1,
    padding: 7,
    gap: 5,
  },
  chartCardHeader: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 8,
  },
  chartCardPillRow: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
  },
  chartCardPill: {
    borderRadius: CHART_LAYOUT.chipRadius,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chartCardSelectedPill: {
    borderWidth: 1,
  },
  chartCardPillText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  chartCardBody: {
    flex: 1,
    gap: 6,
  },
  chartCardCopy: {
    gap: 4,
  },
  chartCardTitle: {
    color: CHART_COLORS.textStrong,
    fontSize: 15,
    fontWeight: "900",
  },
  chartCardHook: {
    color: CHART_COLORS.sub,
    fontSize: 10,
    lineHeight: 14,
    minHeight: 28,
  },
  previewWrap: {
    marginTop: "auto",
  },
  emptyText: {
    color: CHART_COLORS.sub,
    fontSize: 12,
    lineHeight: 18,
  },
  setupSearchInput: {
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CHART_COLORS.border,
    backgroundColor: CHART_COLORS.whiteSoft,
    color: CHART_COLORS.textStrong,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 11,
    fontWeight: "700",
  },
  setupStack: {
    gap: 8,
  },
  guidedRailStack: {
    gap: 8,
  },
  stageSectionStack: {
    gap: 8,
  },
  stageNoteCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CHART_COLORS.border,
    backgroundColor: withChartAlpha(CHART_COLORS.bg, 0.28),
    padding: 10,
  },
  setupSection: {
    gap: 3,
    padding: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CHART_COLORS.border,
    backgroundColor: withChartAlpha(CHART_COLORS.bg, 0.28),
  },
  setupSectionHeader: {
    gap: 1,
  },
  setupSectionTitle: {
    color: CHART_COLORS.textStrong,
    fontSize: 11,
    fontWeight: "800",
  },
  setupSectionSubtitle: {
    color: CHART_COLORS.sub,
    fontSize: 9,
    lineHeight: 12,
  },
  setupChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    alignContent: "flex-start",
    gap: 6,
  },
  setupFullWidthSectionContent: {
    width: "100%",
    gap: 8,
  },
  setupSegmentedControl: {
    width: "100%",
  },
  setupUnderlineTabs: {
    gap: 6,
  },
  setupSegmentedTabStack: {
    width: "100%",
    gap: 8,
  },
  setupSegmentedTabShell: {
    flexDirection: "row",
    borderWidth: 1,
    backgroundColor: withChartAlpha(CHART_COLORS.panel, 0.72),
    borderColor: withChartAlpha(CHART_COLORS.textStrong, 0.16),
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  setupSegmentedTab: {
    flex: 1,
    minWidth: 0,
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  setupSegmentedTabActive: {
    backgroundColor: withChartAlpha(CHART_COLORS.accent, 0.18),
    borderColor: withChartAlpha(CHART_COLORS.accent, 0.72),
  },
  setupSegmentedTabPressed: {
    opacity: 0.92,
  },
  setupSegmentedTabText: {
    color: CHART_COLORS.sub,
    textAlign: "center",
  },
  setupSegmentedTabTextActive: {
    color: CHART_COLORS.textStrong,
  },
  metricGrid: {
    width: "100%",
    gap: 8,
  },
});
