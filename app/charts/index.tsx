import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import HeroCard from "@/components/ui/HeroCard";
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
  type ChartTone,
} from "@/components/charts/chartVisualSystem";
import { getChartSetup } from "@/lib/cloud/analytics/getChartSetup";
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
    <TouchableOpacity
      style={styles.scopeTab}
      onPress={onPress}
      activeOpacity={0.9}
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
    </TouchableOpacity>
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
    <TouchableOpacity
      style={[
        styles.metricButton,
        {
          backgroundColor: quiet.backgroundColor,
          borderColor: quiet.borderColor,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.9}
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
    </TouchableOpacity>
  );
}

function UtilityButton({
  label,
  onPress,
  tone = "neutral",
  size = "compact",
  subtitle,
}: {
  label: string;
  onPress: () => void;
  tone?: ChartTone;
  size?: "compact" | "prominent";
  subtitle?: string;
}) {
  const quiet = getQuietChipStyle(tone);
  const toneStyle = getChartToneStyles(tone);
  const prominent = size === "prominent";
  return (
    <TouchableOpacity
      style={[
        styles.utilityButton,
        prominent && styles.utilityButtonProminent,
        {
          backgroundColor: prominent
            ? withChartAlpha(toneStyle.value, 0.18)
            : quiet.backgroundColor,
          borderColor: prominent
            ? withChartAlpha(toneStyle.value, 0.42)
            : quiet.borderColor,
          shadowColor: prominent ? toneStyle.value : undefined,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={prominent && styles.utilityButtonCopy}>
        <Text
          style={[
            styles.utilityButtonText,
            prominent && styles.utilityButtonTextProminent,
            { color: prominent ? CHART_COLORS.textStrong : quiet.textColor },
          ]}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text
            style={[
              styles.utilityButtonSubtitle,
              {
                color: prominent
                  ? withChartAlpha(CHART_COLORS.textStrong, 0.7)
                  : quiet.textColor,
              },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function SetupBackButton({ onPress }: { onPress: () => void; }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.setupBackButton}
      activeOpacity={0.9}
    >
      <Text style={styles.setupBackButtonText}>Close setup</Text>
    </TouchableOpacity>
  );
}

function StarButton({
  active,
  onPress,
}: {
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.starButton}
      hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
    >
      <Text style={[styles.starText, active && styles.starTextActive]}>
        {active ? "★" : "☆"}
      </Text>
    </TouchableOpacity>
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
      <TouchableOpacity
        style={styles.chartCardPressable}
        onPress={onPress}
        activeOpacity={0.92}
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
      </TouchableOpacity>
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
  const players = useStore((state: any) => state?.players ?? []);
  const games = useStore((state: any) => state?.games ?? []);
  const groups = useStore((state: any) => state?.groups ?? []);
  const analyticsRefreshTick = useAnalyticsRefreshTick();

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
  const [setupOpen, setSetupOpen] = useState(routeSetupOpen);
  const [setupPayload, setSetupPayload] = useState<Record<string, unknown> | null>(null);
  const [setupLoading, setSetupLoading] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);
  const deferredFocusPlayerSearch = useDeferredValue(focusPlayerSearch);
  const selectedChart = useMemo(
    () => resolveChartCatalogEntry(selectedChartKey),
    [selectedChartKey]
  );
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
  const filteredFocusPlayerOptions = useMemo(() => {
    const normalizedQuery = deferredFocusPlayerSearch.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return focusPlayerOptions.filter((option) =>
      String(option.label ?? "").toLowerCase().includes(normalizedQuery)
    );
  }, [focusPlayerOptions, deferredFocusPlayerSearch]);

  useEffect(() => {
    setSelectedChartKey(routeChartKey);
  }, [routeChartKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadSetup() {
      const profileId = String(authSession?.user?.id ?? "").trim();
      if (!profileId) {
        if (!cancelled) {
          setSetupPayload(null);
          setSetupError(null);
          setSetupLoading(false);
        }
        return;
      }

      setSetupLoading(true);
      setSetupError(null);

      try {
        const nextPayload = await getChartSetup({
          chartKey: selectedChart.key,
          profileId,
        });

        if (!cancelled) {
          setSetupPayload(nextPayload as unknown as Record<string, unknown>);
        }
      } catch (nextError) {
        if (!cancelled) {
          setSetupPayload(null);
          setSetupError(
            formatSupabaseConfigError(nextError) || "Failed to load chart setup.",
          );
        }
      } finally {
        if (!cancelled) {
          setSetupLoading(false);
        }
      }
    }

    void loadSetup();

    return () => {
      cancelled = true;
    };
  }, [authSession?.user?.id, selectedChart.key, analyticsRefreshTick]);

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
  const heroTakeaway = buildFeaturedChartTakeaway({
    chartKey: selectedChart.key,
    selectedPlayerName: selectedPlayer?.label,
    comparePlayerName: comparePlayer?.label,
    scopedCount: selectedGroupIds.length,
    metricKey: activeMetric ?? undefined,
  });
  const selectedSection = CHART_SECTIONS.find(
    (section) => section.key === selectedChart.section
  );
  const heroContextChips = useMemo(() => {
    const chips: string[] = [];

    if (selectedPlayer?.label) {
      chips.push(`Focus: ${selectedPlayer.label}`);
    }

    if (comparePlayerOptions.length > 0 && comparePlayer?.label) {
      chips.push(`Matchup: ${comparePlayer.label}`);
    } else if (metricOptions.length > 0 && activeMetricLabel) {
      chips.push(activeMetricLabel);
    }

    return chips.slice(0, 2);
  }, [
    activeMetricLabel,
    comparePlayer?.label,
    comparePlayerOptions.length,
    metricOptions.length,
    selectedPlayer?.label,
  ]);

  function toggleGroupPlayer(playerId: string) {
    setSelectedGroupIds((current) => {
      const minimumScopeCount = selectedChart.key === "relationship_graph" ? 2 : 1;
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
    setSelectedChartKey(nextChart.key);
    setChartSetupOpen(false, nextChart);
  }

  function openSetup() {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    setChartSetupOpen(true);
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
          <HeroCard
            eyebrow="Charts"
            title={selectedChart.title}
            size="compact"
            style={styles.heroCardCompact}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.heroLead}>
                <View style={styles.heroPreviewFrame}>
                  <ChartHubPreview
                    kind={selectedChart.preview}
                    tone={selectedChart.tone}
                    width={70}
                    height={42}
                  />
                </View>

                <View style={styles.heroCopy}>
                  {selectedSection ? (
                    <Text style={styles.heroSectionLabel}>{selectedSection.title}</Text>
                  ) : null}
                  <Text style={styles.heroHook} numberOfLines={1}>
                    {heroTakeaway}
                  </Text>
                </View>
              </View>
            </View>

            {heroContextChips.length ? (
              <View style={styles.heroChipRow}>
                {heroContextChips.map((chip) => (
                  <View key={chip} style={styles.displayChip}>
                    <Text style={styles.displayChipText}>{chip}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.heroActionRow}>
              <UtilityButton
                label={setupOpen ? "Close" : "Adjust"}
                onPress={() =>
                  setupOpen ? setChartSetupOpen(false) : openSetup()
                }
                tone={setupOpen ? "neutral" : "blue"}
                size="compact"
              />
              <UtilityButton
                label="Back to Command"
                onPress={() => router.push(APP_ROUTES.home)}
                tone="neutral"
                size="compact"
              />
            </View>
          </HeroCard>
        </View>

        {setupOpen ? (
          <SectionCard
            title={`Adjust ${selectedChart.title}`}
            style={styles.sectionCardCompact}
          >
            <View style={styles.setupStack}>
              {setupLoading ? (
                <Text style={styles.emptyText}>
                  Loading Supabase-authored setup options.
                </Text>
              ) : setupError ? (
                <Text style={styles.emptyText}>{setupError}</Text>
              ) : (
                <>
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

                    <TextInput
                      value={focusPlayerSearch}
                      onChangeText={setFocusPlayerSearch}
                      placeholder="Search for Player"
                      placeholderTextColor={CHART_COLORS.sub}
                      style={styles.setupSearchInput}
                      autoCapitalize="words"
                      autoCorrect={false}
                    />

                    {focusPlayerSearch.trim() ? (
                      filteredFocusPlayerOptions.length ? (
                        <SetupTabs
                          items={filteredFocusPlayerOptions}
                          value={selectedPlayer ? String(selectedPlayer.key) : ""}
                          onChange={setSelectedPlayerId}
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

                  {metricOptions.length > 0 ? (
                    <SetupSection
                      title="Metric"
                      contentStyle={styles.metricGrid}
                    >
                      {metricOptions.map((metric) => (
                        <MetricButton
                          key={`metric-${metric.key}`}
                          label={metric.label}
                          active={metric.key === activeMetric}
                          onPress={() => setSelectedMetric(metric.key)}
                        />
                      ))}
                    </SetupSection>
                  ) : null}

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

                  {selectedChart.key === "elo" && selectedEloTab === "Context" && opponentOptions.length > 0 ? (
                    <SetupSection title="Opponent">
                      <SetupTabs
                        items={opponentOptions}
                        value={selectedOpponent ? String(selectedOpponent.key) : "none"}
                        onChange={setSelectedOpponentId}
                      />
                    </SetupSection>
                  ) : null}

                  {scopePlayerOptions.length > 0 ? (
                    <SetupSection
                      title="Players in scope"
                      contentStyle={styles.scopeTabSectionContent}
                    >
                      <ScrollView
                        horizontal
                        nestedScrollEnabled
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.scopeTabRail}
                      >
                        {scopePlayerOptions.map((player) => (
                          <ScopeTab
                            key={`scope-${player.key}`}
                            label={player.label || "Unknown"}
                            active={selectedGroupIds.includes(String(player.key))}
                            onPress={() => toggleGroupPlayer(String(player.key))}
                          />
                        ))}
                      </ScrollView>
                    </SetupSection>
                  ) : null}
                </>
              )}

              <View style={styles.setupFooterActions}>
                <UtilityButton
                  label="Open Chart"
                  onPress={() => openChart(selectedChart)}
                  tone="green"
                  size="compact"
                />
                <SetupBackButton onPress={() => setChartSetupOpen(false)} />
              </View>
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
  heroCardCompact: {
    borderRadius: 20,
    paddingBottom: 0,
  },
  heroTopRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  heroLead: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  heroSectionLabel: {
    color: CHART_COLORS.sub,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  heroTitle: {
    color: CHART_COLORS.textStrong,
    fontSize: 24,
    fontWeight: "900",
  },
  heroHook: {
    color: CHART_COLORS.textStrong,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "700",
  },
  heroPreviewFrame: {
    position: "relative",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 16,
  },
  heroChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  heroActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 6,
  },
  displayChip: {
    borderRadius: CHART_LAYOUT.chipRadius,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  displayChipText: {
    fontSize: 9,
    fontWeight: "800",
  },
  utilityButton: {
    minHeight: 34,
    borderRadius: CHART_LAYOUT.chipRadius,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  utilityButtonProminent: {
    minHeight: 46,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  utilityButtonCopy: {
    gap: 2,
  },
  utilityButtonText: {
    fontSize: 11,
    fontWeight: "800",
  },
  utilityButtonTextProminent: {
    fontSize: 13,
    fontWeight: "900",
  },
  utilityButtonSubtitle: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "700",
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
  starButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CHART_COLORS.border,
    backgroundColor: CHART_COLORS.whiteSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  starText: {
    color: CHART_COLORS.sub,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 18,
  },
  starTextActive: {
    color: CHART_COLORS.gold,
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
    gap: 4,
  },
  setupFooterActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 1,
  },
  setupBackButton: {
    borderRadius: CHART_LAYOUT.chipRadius,
    borderWidth: 1,
    borderColor: CHART_COLORS.border,
    backgroundColor: CHART_COLORS.whiteSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  setupBackButtonText: {
    color: CHART_COLORS.sub,
    fontSize: 11,
    fontWeight: "800",
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
    flexWrap: "nowrap",
    gap: 0,
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
