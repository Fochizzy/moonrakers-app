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
import ChartUnderlineTabs from "@/components/charts/ChartUnderlineTabs";
import ChartHubPreview from "@/components/charts/ChartHubPreview";
import type { LineMode } from "@/components/charts/LineChart";
import {
  CHART_SECTIONS,
  buildFeaturedChartTakeaway,
  getChartsForSection,
  normalizeChartHubSelection,
  resolveChartCatalogEntry,
  type ChartCatalogEntry,
  type ChartCatalogKey,
} from "@/components/charts/chartCatalog";
import {
  CHART_COLORS,
  CHART_LAYOUT,
  getChartToneStyles,
  getQuietChipStyle,
  withChartAlpha,
} from "@/components/charts/chartVisualSystem";
import {
  buildMetricStageSummary,
  buildScopeStageSummary,
  buildStyleStageSummary,
  resolveChartSetupRailState,
  type ChartSetupStageKey,
} from "@/components/charts/chartSetupRailModel";
import { getChartSetup } from "@/lib/cloud/analytics/getChartSetup";
import { useLiveAnalyticsQuery } from "@/lib/cloud/analytics/useLiveAnalyticsQuery";
import { useAnalyticsRefreshTick } from "@/lib/cloud/analytics/useAnalyticsRefreshTick";
import { formatSupabaseConfigError } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { APP_ROUTES } from "@/utils/appRoutes";
import {
  buildRouteScopeSeedKey,
  getPreferredScopeIdsForChart,
} from "@/utils/chartHubRouteState";
import { buildAnalyticsPlayerDirectory } from "@/utils/analyticsPlayers";
import {
  buildCommonOpponentOptions,
  resolvePreferredChartPlayerId,
} from "@/utils/charts";

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

type EloSetupTab =
  | "Leaderboard"
  | "Momentum"
  | "Skills"
  | "Context"
  | "Projection";
type SetupOption = {
  key: string;
  label: string;
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

const LINE_MODE_OPTIONS: readonly LineMode[] = ["raw", "cumulative", "average"];
const ELO_VIEW_OPTIONS: readonly EloSetupTab[] = [
  "Leaderboard",
  "Momentum",
  "Skills",
  "Context",
  "Projection",
];

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
  const normalized = String(getParam(value) ?? "Leaderboard")
    .trim()
    .toLowerCase();

  return (
    ELO_VIEW_OPTIONS.find((tab) => tab.toLowerCase() === normalized) ??
    "Leaderboard"
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
    items.length >= 2 &&
    items.length <= 4 &&
    items.every((item) => item.label.length <= 14)
  );
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

function ScopeTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.scopeTab, pressed && { opacity: 0.9 }]}
      onPress={onPress}
    >
      <Text
        numberOfLines={1}
        style={[styles.scopeTabText, active && styles.scopeTabTextActive]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.scopeTabUnderline,
          active && styles.scopeTabUnderlineActive,
        ]}
      />
    </Pressable>
  );
}

function MetricButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const quiet = getQuietChipStyle(active ? "green" : "neutral");

  return (
    <Pressable
      style={({ pressed }) => [
        styles.metricButton,
        {
          backgroundColor: quiet.backgroundColor,
          borderColor: quiet.borderColor,
        },
        pressed && { opacity: 0.9 },
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.metricButtonMarker,
          {
            backgroundColor: active
              ? quiet.textColor
              : withChartAlpha(CHART_COLORS.sub, 0.32),
          },
        ]}
      />
      <Text style={[styles.metricButtonText, { color: quiet.textColor }]}>
        {label}
      </Text>
    </Pressable>
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
}: {
  title: string;
  subtitle?: string;
  contentStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.setupSection}>
      <View style={styles.setupSectionHeader}>
        <Text style={styles.setupSectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.setupSectionSubtitle}>{subtitle}</Text> : null}
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
    compareId?: string | string[];
    ids?: string | string[];
    metric?: string | string[];
    lineMode?: string | string[];
    eloTab?: string | string[];
    opponentId?: string | string[];
    setup?: string | string[];
  }>();
  const authSession = useStore((state: any) => state.authSession);
  const authProfile = useStore((state: any) => state?.authProfile ?? null);
  const players = useStore((state: any) => state.players ?? []);
  const games = useStore((state: any) => state?.games ?? []);
  const groups = useStore((state: any) => state?.groups ?? []);
  const profileId = String(authProfile?.id ?? authSession?.user?.id ?? "").trim();

  const routeChartKey = normalizeChartHubSelection(
    getParam(params.chartKey)
  ).key;
  const routePlayerId = getParam(params.playerId);
  const routeCompareId = getParam(params.compareId);
  const routeIdsParam = getParam(params.ids);
  const routeIds = useMemo(() => getParamList(routeIdsParam), [routeIdsParam]);
  const routeMetric = getParam(params.metric);
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
  const [scopePlayerSearch, setScopePlayerSearch] = useState("");
  const [setupOpen, setSetupOpen] = useState(routeSetupOpen);
  const [activeStageKey, setActiveStageKey] = useState<ChartSetupStageKey>("scope");
  const deferredFocusPlayerSearch = useDeferredValue(focusPlayerSearch);
  const deferredScopePlayerSearch = useDeferredValue(scopePlayerSearch);
  const previousScopeStageSignatureRef = useRef<string | null>(null);
  const previousMetricStageSignatureRef = useRef<string | null>(null);
  const selectedChart = useMemo(
    () => resolveChartCatalogEntry(selectedChartKey),
    [selectedChartKey]
  );
  const analyticsRefreshTick = useAnalyticsRefreshTick();
  const [setupError, setSetupError] = useState<string | null>(null);
  const chartSetupQuery = useLiveAnalyticsQuery({
    enabled: Boolean(profileId),
    queryKey: `chart-setup:${profileId || "anon"}:${selectedChart.key}`,
    load: () =>
      getChartSetup({
        chartKey: selectedChart.key,
        profileId,
      }),
  });
  useEffect(() => {
    const nextError = chartSetupQuery.error;
    if (nextError !== null) {
      setSetupError(formatSupabaseConfigError(nextError) || "Failed to load chart setup.");
    } else {
      setSetupError(null);
    }
  }, [chartSetupQuery.error]);
  const setupPayload =
    chartSetupQuery.payload && typeof chartSetupQuery.payload === "object"
      ? (chartSetupQuery.payload as Record<string, unknown>)
      : null;
  const setupLoading = chartSetupQuery.loading;
  const setupIsStale = chartSetupQuery.isStale;
  const setupStaleMessage = chartSetupQuery.staleMessage;
  const focusPlayerOptions = useMemo(
    () => toSetupOptions(setupPayload?.focusPlayerOptions),
    [setupPayload?.focusPlayerOptions]
  );
  const comparePlayerOptions = useMemo(
    () => toSetupOptions(setupPayload?.comparePlayerOptions),
    [setupPayload?.comparePlayerOptions]
  );
  const scopePlayerOptions = useMemo(
    () => toSetupOptions(setupPayload?.scopePlayerOptions),
    [setupPayload?.scopePlayerOptions]
  );
  const metricOptions = useMemo(
    () => toSetupOptions(setupPayload?.metricOptions),
    [setupPayload?.metricOptions]
  );
  const lineModeOptions = useMemo(
    () => toSetupOptions(setupPayload?.lineModeOptions),
    [setupPayload?.lineModeOptions]
  );
  const eloViewOptions = useMemo(
    () => toSetupOptions(setupPayload?.eloViewOptions),
    [setupPayload?.eloViewOptions]
  );
  const opponentOptions = useMemo(
    () => toSetupOptions(setupPayload?.opponentOptions),
    [setupPayload?.opponentOptions]
  );
  const setupDefaults = useMemo(
    () => toSetupDefaults(setupPayload?.defaults),
    [setupPayload?.defaults]
  );
  const scopePlayerIds = useMemo(
    () => scopePlayerOptions.map((option) => String(option.key)),
    [scopePlayerOptions]
  );
  const scopePlayerIdentities = useMemo(
    () => scopePlayerOptions.map((option) => ({ id: String(option.key) })),
    [scopePlayerOptions]
  );
  const analyticsDirectory = useMemo(
    () => buildAnalyticsPlayerDirectory({ players, games, groups }),
    [players, games, groups]
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
        limit: 4,
      }),
    [preferredScopePlayerId, scopePlayerDirectoryPlayers, analyticsDirectory.games]
  );
  const quickFocusPlayerOptions = useMemo(() => {
    const optionByKey = new Map(
      focusPlayerOptions.map((option) => [String(option.key), option])
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

    pushOption(preferredFocusPlayerId);
    topCommonFocusPlayers.forEach((player) => pushOption(String(player.id)));

    return ordered;
  }, [focusPlayerOptions, preferredFocusPlayerId, topCommonFocusPlayers]);
  const quickScopePlayerOptions = useMemo(() => {
    const optionByKey = new Map(
      scopePlayerOptions.map((option) => [String(option.key), option])
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

    pushOption(preferredScopePlayerId);
    topCommonScopePlayers.forEach((player) => pushOption(String(player.id)));

    return ordered;
  }, [scopePlayerOptions, preferredScopePlayerId, topCommonScopePlayers]);
  const filteredFocusPlayerOptions = useMemo(() => {
    const normalizedQuery = deferredFocusPlayerSearch.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return focusPlayerOptions.filter((option) =>
      String(option.label ?? "").toLowerCase().includes(normalizedQuery)
    );
  }, [focusPlayerOptions, deferredFocusPlayerSearch]);
  const filteredScopePlayerOptions = useMemo(() => {
    const normalizedQuery = deferredScopePlayerSearch.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return scopePlayerOptions.filter((option) =>
      String(option.label ?? "").toLowerCase().includes(normalizedQuery)
    );
  }, [scopePlayerOptions, deferredScopePlayerSearch]);

  useEffect(() => {
    setSelectedChartKey(routeChartKey);
  }, [routeChartKey]);

  useEffect(() => {
    if (getParam(params.setup) != null) {
      setSetupOpen(routeSetupOpen);
    }
  }, [params.setup, routeSetupOpen]);

  useEffect(() => {
    const nextLineMode = resolveOptionKey(
      lineModeOptions,
      getParam(params.lineMode) != null ? routeLineMode : null,
      selectedLineMode,
      setupDefaults.lineMode,
    );
    if (nextLineMode && nextLineMode !== selectedLineMode) {
      setSelectedLineMode(nextLineMode);
    }
  }, [lineModeOptions, params.lineMode, routeLineMode, selectedLineMode, setupDefaults.lineMode]);

  useEffect(() => {
    const nextEloTab = resolveOptionKey(
      eloViewOptions,
      getParam(params.eloTab) != null ? routeEloTab : null,
      selectedEloTab,
      setupDefaults.eloTab,
    );
    if (nextEloTab && nextEloTab !== selectedEloTab) {
      setSelectedEloTab(nextEloTab);
    }
  }, [eloViewOptions, params.eloTab, routeEloTab, selectedEloTab, setupDefaults.eloTab]);

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
      routePlayerId,
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
  ]);

  useEffect(() => {
    const nextComparePlayerId = resolveOptionKey(
      comparePlayerOptions,
      routeCompareId,
      comparePlayerId,
      setupDefaults.comparePlayerId,
    );
    if (nextComparePlayerId !== comparePlayerId) {
      setComparePlayerId(nextComparePlayerId);
    }
  }, [comparePlayerId, comparePlayerOptions, routeCompareId, setupDefaults.comparePlayerId]);

  useEffect(() => {
    const nextSelectedOpponentId = resolveOptionKey(
      opponentOptions,
      routeOpponentId,
      selectedOpponentId,
      setupDefaults.opponentId,
      "none",
    );
    if (nextSelectedOpponentId !== selectedOpponentId) {
      setSelectedOpponentId(nextSelectedOpponentId);
    }
  }, [opponentOptions, routeOpponentId, selectedOpponentId, setupDefaults.opponentId]);

  useEffect(() => {
    const nextMetric = resolveOptionKey(
      metricOptions,
      routeMetric,
      selectedMetric,
      setupDefaults.metricKey,
    );
    if (nextMetric !== selectedMetric) {
      setSelectedMetric(nextMetric);
    }
  }, [metricOptions, routeMetric, selectedMetric, setupDefaults.metricKey]);

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
        ? sanitizeSelectedIds(scopePlayerOptions, setupDefaults.scopedPlayerIds, [])
        : scopePlayerIds.slice(0, Math.min(4, scopePlayerIds.length));
      const nextIds = sanitizeSelectedIds(scopePlayerOptions, current, fallbackIds);
      return haveSameIds(nextIds, current) ? current : nextIds;
    });
  }, [scopePlayerIds, scopePlayerOptions, setupDefaults.scopedPlayerIds]);

  useEffect(() => {
    if (comparePlayerId && String(comparePlayerId) === String(selectedPlayerId)) {
      const fallback = comparePlayerOptions.find(
        (option) => String(option.key) !== String(selectedPlayerId)
      );
      setComparePlayerId(fallback ? String(fallback.key) : null);
    }
  }, [comparePlayerId, comparePlayerOptions, selectedPlayerId]);

  useEffect(() => {
    if (selectedOpponentId && String(selectedOpponentId) === String(selectedPlayerId)) {
      setSelectedOpponentId("none");
    }
  }, [selectedOpponentId, selectedPlayerId]);

  useEffect(() => {
    if (!setupOpen) return;

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
    const explicit = findOption(comparePlayerOptions, comparePlayerId);
    if (explicit) return explicit;
    return comparePlayerOptions[0] ?? null;
  }, [comparePlayerId, comparePlayerOptions]);

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
        focusPlayerLabel: selectedPlayer?.label ?? null,
        comparePlayerLabel: comparePlayerOptions.length > 0 ? comparePlayer?.label ?? null : null,
        scopedCount: selectedGroupIds.length,
      }),
    [
      comparePlayer?.label,
      comparePlayerOptions.length,
      selectedGroupIds.length,
      selectedPlayer?.label,
    ]
  );
  const metricSummary = useMemo(
    () => buildMetricStageSummary(activeMetricLabel),
    [activeMetricLabel]
  );
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
    Boolean(selectedPlayer?.key) &&
    selectedGroupIds.length >= minimumScopeCount &&
    (comparePlayerOptions.length === 0 || Boolean(comparePlayer?.key));
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
    if (!setupOpen) {
      previousScopeStageSignatureRef.current = null;
      return;
    }

    const signature = [
      selectedPlayer?.key ?? "",
      comparePlayerOptions.length > 0 ? comparePlayer?.key ?? "" : "",
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
      setActiveStageKey(metricOptions.length > 0 ? "metric" : "style");
    }
  }, [
    activeStageKey,
    comparePlayer?.key,
    comparePlayerOptions.length,
    metricOptions.length,
    scopeReady,
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
      setActiveStageKey("style");
    }
  }, [activeMetric, activeStageKey, metricOptions, metricReady, setupOpen]);

  function toggleGroupPlayer(playerId: string) {
    setSelectedGroupIds((current) => {
      if (current.includes(playerId)) {
        if (current.length <= minimumScopeCount) return current;
        return current.filter((id) => id !== playerId);
      }
      return [...current, playerId];
    });
  }

  function buildChartHubParams(
    chart: ChartCatalogEntry,
    setupOpen: boolean
  ) {
    const params: Record<string, string | undefined> = {
      chartKey: chart.key,
      setup: setupOpen ? "true" : undefined,
      playerId: selectedPlayer?.key ? String(selectedPlayer.key) : undefined,
    };

    if (chart.key === "elo") {
      params.ids = selectedGroupIds.length ? selectedGroupIds.join(",") : undefined;
      params.eloTab = selectedEloTab || undefined;
      params.opponentId =
        selectedEloTab === "Context" && selectedOpponent?.key
          ? String(selectedOpponent.key)
          : undefined;
      return params;
    }

    if (comparePlayerOptions.length > 0 && comparePlayer?.key) {
      params.compareId = String(comparePlayer.key);
    }

    if (scopePlayerOptions.length > 0 && selectedGroupIds.length) {
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
    router.setParams(buildChartHubParams(chart, setupOpen) as any);
  }

  function setChartSetupOpen(nextSetupOpen: boolean, chart: ChartCatalogEntry = selectedChart) {
    setSetupOpen(nextSetupOpen);
    replaceChartHubRoute(chart, nextSetupOpen);
  }

  function previewChart(chartKey: ChartCatalogKey) {
    const nextChart = resolveChartCatalogEntry(chartKey);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    setSelectedChartKey(nextChart.key);
    setActiveStageKey("scope");
    setChartSetupOpen(false, nextChart);
  }

  function resolveSetupEntryStage() {
    if (!scopeReady) return "scope";
    if (!metricReady) return "metric";
    return "style";
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
      } as any);
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
            onBackToCommand={() => router.push(APP_ROUTES.home)}
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
              ) : setupError ? (
                <EmptyStateCard
                  message={setupError}
                  hint="Check your connection or try switching to a different chart."
                />
              ) : (
                <>
                  {setupIsStale ? (
                    <Text style={styles.emptyText}>
                      Showing the last successful chart-setup payload because the latest refresh failed{setupStaleMessage ? `: ${setupStaleMessage}` : "."}
                    </Text>
                  ) : null}
                  <View style={styles.guidedRailStack}>
                    {railStages.map((stage, index) => {
                      if (stage.key === "scope") {
                        return (
                          <ChartSetupStageShell
                            key={stage.key}
                            index={index + 1}
                            title="Scope"
                            helper="Choose whose story this chart should tell."
                            summary={scopeSummary}
                            status={stage.status}
                            onEdit={() => reopenStage("scope")}
                          >
                            <View style={styles.stageSectionStack}>
                              <SetupSection
                                title="Focus player"
                                subtitle="You first, then your most-played tablemates."
                                contentStyle={styles.focusPlayerSectionContent}
                              >
                                {quickFocusPlayerOptions.length ? (
                                  <SetupTabs
                                    items={quickFocusPlayerOptions}
                                    value={selectedPlayer ? String(selectedPlayer.key) : ""}
                                    onChange={setSelectedPlayerId}
                                  />
                                ) : null}

                                <PlayerSearchPicker
                                  query={focusPlayerSearch}
                                  onQueryChange={setFocusPlayerSearch}
                                  placeholder="Search for Player"
                                  items={[]}
                                  selectedIds={selectedPlayer ? [String(selectedPlayer.key)] : []}
                                  onSelect={setSelectedPlayerId}
                                  variant="rail"
                                  hideResults
                                />

                                {focusPlayerSearch.trim() ? (
                                  filteredFocusPlayerOptions.length ? (
                                    <PlayerSearchPicker
                                      query={focusPlayerSearch}
                                      onQueryChange={setFocusPlayerSearch}
                                      placeholder="Search for Player"
                                      items={filteredFocusPlayerOptions.map((player) => ({
                                        id: String(player.key),
                                        label: player.label || "Unknown",
                                      }))}
                                      selectedIds={selectedPlayer ? [String(selectedPlayer.key)] : []}
                                      onSelect={setSelectedPlayerId}
                                      variant="rail"
                                      showResultsOnlyWhenQuery
                                    />
                                  ) : (
                                    <Text style={styles.emptyText}>No players match that search yet.</Text>
                                  )
                                ) : null}
                              </SetupSection>

                              {comparePlayerOptions.length > 0 ? (
                                <SetupSection title="Compare player">
                                  <SetupTabs
                                    items={comparePlayerOptions}
                                    value={comparePlayer ? String(comparePlayer.key) : ""}
                                    onChange={setComparePlayerId}
                                  />
                                </SetupSection>
                              ) : null}

                              {scopePlayerOptions.length > 0 ? (
                                <SetupSection
                                  title="Players in scope"
                                  subtitle="Logged-in player first, then your most-played tablemates."
                                  contentStyle={styles.scopeTabSectionContent}
                                >
                                  {quickScopePlayerOptions.length ? (
                                    <ScrollView
                                      horizontal
                                      nestedScrollEnabled
                                      showsHorizontalScrollIndicator={false}
                                      contentContainerStyle={styles.scopeTabRail}
                                    >
                                      {quickScopePlayerOptions.map((player) => (
                                        <ScopeTab
                                          key={`scope-quick-${player.key}`}
                                          label={player.label || "Unknown"}
                                          active={selectedGroupIds.includes(String(player.key))}
                                          onPress={() => toggleGroupPlayer(String(player.key))}
                                        />
                                      ))}
                                    </ScrollView>
                                  ) : null}

                                  <PlayerSearchPicker
                                    query={scopePlayerSearch}
                                    onQueryChange={setScopePlayerSearch}
                                    placeholder="Player Search"
                                    items={[]}
                                    selectedIds={selectedGroupIds}
                                    onSelect={(playerId) => toggleGroupPlayer(String(playerId))}
                                    variant="rail"
                                    selectionMode="multiple"
                                    hideResults
                                  />

                                  {scopePlayerSearch.trim() ? (
                                    filteredScopePlayerOptions.length ? (
                                      <PlayerSearchPicker
                                        query={scopePlayerSearch}
                                        onQueryChange={setScopePlayerSearch}
                                        placeholder="Player Search"
                                        items={filteredScopePlayerOptions.map((player) => ({
                                          id: String(player.key),
                                          label: player.label || "Unknown",
                                        }))}
                                        selectedIds={selectedGroupIds}
                                        onSelect={(playerId) => toggleGroupPlayer(String(playerId))}
                                        variant="rail"
                                        selectionMode="multiple"
                                        showResultsOnlyWhenQuery
                                      />
                                    ) : (
                                      <Text style={styles.emptyText}>No players match that search yet.</Text>
                                    )
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
                            summary={metricSummary ?? "Fixed metric"}
                            status={stage.status}
                            onEdit={() => reopenStage("metric")}
                          >
                            {metricOptions.length > 0 ? (
                              <SetupSection title="Metric" contentStyle={styles.metricGrid}>
                                {metricOptions.map((metric) => (
                                  <MetricButton
                                    key={`metric-${metric.key}`}
                                    label={metric.label}
                                    active={metric.key === activeMetric}
                                    onPress={() => setSelectedMetric(metric.key)}
                                  />
                                ))}
                              </SetupSection>
                            ) : (
                              <View style={styles.stageNoteCard}>
                                <Text style={styles.emptyText}>
                                  This chart uses a fixed metric, so there is nothing to choose here.
                                </Text>
                              </View>
                            )}
                          </ChartSetupStageShell>
                        );
                      }

                      return (
                        <ChartSetupStageShell
                          key={stage.key}
                          index={index + 1}
                          title="Style"
                          helper="Choose how this chart should render."
                          lockedHelper="Unlocks after Metric"
                          summary={styleSummary ?? "Default style"}
                          status={stage.status}
                          onEdit={() => reopenStage("style")}
                          footer={
                            <ChartSetupStageAction
                              title="Open Chart"
                              subtitle="Launch this chart with the current setup"
                              onPress={() => openChart(selectedChart)}
                              disabled={!styleReady}
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

                            {selectedChart.key === "elo" &&
                            selectedEloTab === "Context" &&
                            opponentOptions.length > 0 ? (
                              <SetupSection title="Opponent">
                                <SetupTabs
                                  items={opponentOptions}
                                  value={selectedOpponent ? String(selectedOpponent.key) : "none"}
                                  onChange={setSelectedOpponentId}
                                />
                              </SetupSection>
                            ) : null}

                            {lineModeOptions.length === 0 &&
                            eloViewOptions.length === 0 &&
                            !(selectedChart.key === "elo" &&
                              selectedEloTab === "Context" &&
                              opponentOptions.length > 0) ? (
                              <View style={styles.stageNoteCard}>
                                <Text style={styles.emptyText}>
                                  This chart is ready to launch with the current default style.
                                </Text>
                              </View>
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
    gap: 6,
  },
  focusPlayerSectionContent: {
    width: "100%",
    gap: 8,
  },
  scopeTabSectionContent: {
    width: "100%",
    gap: 8,
  },
  setupSegmentedControl: {
    width: "100%",
  },
  setupUnderlineTabs: {
    gap: 6,
  },
  scopeTabRail: {
    gap: 12,
    paddingRight: 12,
    alignItems: "flex-end",
  },
  scopeTab: {
    minWidth: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
    gap: 4,
  },
  scopeTabText: {
    color: CHART_COLORS.sub,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.12,
  },
  scopeTabTextActive: {
    color: CHART_COLORS.textStrong,
  },
  scopeTabUnderline: {
    width: "100%",
    minWidth: 24,
    height: 2,
    borderRadius: 999,
    backgroundColor: withChartAlpha(CHART_COLORS.accent, 0),
  },
  scopeTabUnderlineActive: {
    backgroundColor: CHART_COLORS.accent,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  metricButton: {
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 32,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
  },
  metricButtonMarker: {
    width: 6,
    height: 6,
    borderRadius: 999,
    marginTop: 5,
  },
  metricButtonText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "800",
    letterSpacing: 0.12,
  },
});
