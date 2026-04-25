import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  ScrollView,
  StyleSheet,
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
import { useStore } from "@/store/useStore";
import {
  getSupportedMetricKeysForChart,
  normalizeMetricForChart,
  type SimpleMetricKey,
} from "@/utils/charts";
import { getRouteSyncedGroupIds } from "@/utils/chartHubRouteState";
import { getMetricOrFallback } from "@/utils/metricMap";
import { APP_ROUTES } from "@/utils/appRoutes";

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

type StorePlayer = {
  id: string;
  name?: string;
  color?: string;
};

type GraphMode = "flow" | "network";
type AssistMetricMode =
  | "assistPrestige"
  | "assistCount"
  | "assistEfficiency"
  | "supportBalance";
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

const GRAPH_MODE_OPTIONS: readonly GraphMode[] = ["flow", "network"];
const ASSIST_MODE_OPTIONS: ReadonlyArray<{
  key: AssistMetricMode;
  label: string;
}> = [
  { key: "assistPrestige", label: "Prestige" },
  { key: "assistCount", label: "Count" },
  { key: "assistEfficiency", label: "Efficiency" },
  { key: "supportBalance", label: "Balance" },
];
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

function normalizeGraphMode(value?: string | string[]) {
  return String(getParam(value) ?? "flow").trim().toLowerCase() === "network"
    ? "network"
    : "flow";
}

function normalizeAssistMode(value?: string | string[]) {
  switch (String(getParam(value) ?? "assistPrestige").trim().toLowerCase()) {
    case "assistcount":
      return "assistCount";
    case "assistefficiency":
      return "assistEfficiency";
    case "supportbalance":
      return "supportBalance";
    default:
      return "assistPrestige";
  }
}

function getAssistModeLabel(value: AssistMetricMode) {
  return (
    ASSIST_MODE_OPTIONS.find((option) => option.key === value)?.label ??
    "Prestige"
  );
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

function supportsGraphMode(chartKey: ChartCatalogKey) {
  return chartKey === "relationship_graph";
}

function supportsLineView(chartKey: ChartCatalogKey) {
  return (
    chartKey === "line_chart" ||
    chartKey === "multi_line_chart" ||
    chartKey === "prestige_over_time"
  );
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

function ActionChip({
  label,
  active,
  tone,
  onPress,
}: {
  label: string;
  active: boolean;
  tone: ChartTone;
  onPress: () => void;
}) {
  const quiet = getQuietChipStyle(active ? tone : "neutral");
  return (
    <TouchableOpacity
      style={[
        styles.actionChip,
        {
          backgroundColor: quiet.backgroundColor,
          borderColor: quiet.borderColor,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Text
        numberOfLines={1}
        style={[styles.actionChipText, { color: quiet.textColor }]}
      >
        {label}
      </Text>
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
  const params = useLocalSearchParams<{
    chartKey?: string | string[];
    playerId?: string | string[];
    compareId?: string | string[];
    ids?: string | string[];
    metric?: string | string[];
    mode?: string | string[];
    assistMode?: string | string[];
    lineMode?: string | string[];
    eloTab?: string | string[];
    opponentId?: string | string[];
    setup?: string | string[];
  }>();
  const players = useStore((state: any) =>
    Array.isArray(state?.players) ? state.players : []
  ) as StorePlayer[];

  const routeChartKey = resolveChartCatalogEntry(getParam(params.chartKey)).key;
  const routePlayerId = getParam(params.playerId);
  const routeCompareId = getParam(params.compareId);
  const routeIdsParam = getParam(params.ids);
  const routeIds = useMemo(() => getParamList(routeIdsParam), [routeIdsParam]);
  const routeMetric = getParam(params.metric);
  const routeGraphMode = normalizeGraphMode(params.mode);
  const routeAssistMode = normalizeAssistMode(params.assistMode);
  const routeLineMode = normalizeLineMode(params.lineMode);
  const routeEloTab = normalizeEloTab(params.eloTab);
  const routeOpponentId = getParam(params.opponentId);
  const routeSetupOpen = isTruthyParam(params.setup);

  const sortedPlayers = useMemo(
    () =>
      [...players].sort((left, right) =>
        String(left?.name || "").localeCompare(String(right?.name || ""))
      ),
    [players]
  );

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(
    routePlayerId ?? null
  );
  const [comparePlayerId, setComparePlayerId] = useState<string | null>(
    routeCompareId ?? null
  );
  const [selectedMetric, setSelectedMetric] =
    useState<SimpleMetricKey>(
      (normalizeMetricForChart(routeChartKey, routeMetric) ??
        "totalPrestige") as SimpleMetricKey
    );
  const [selectedChartKey, setSelectedChartKey] =
    useState<ChartCatalogKey>(routeChartKey);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(routeIds);
  const [selectedGraphMode, setSelectedGraphMode] =
    useState<GraphMode>(routeGraphMode);
  const [selectedAssistMode, setSelectedAssistMode] =
    useState<AssistMetricMode>(routeAssistMode);
  const [selectedLineMode, setSelectedLineMode] =
    useState<LineMode>(routeLineMode);
  const [selectedEloTab, setSelectedEloTab] =
    useState<EloSetupTab>(routeEloTab);
  const [selectedOpponentId, setSelectedOpponentId] = useState<string | null>(
    routeOpponentId ?? null
  );
  const [setupOpen, setSetupOpen] = useState(routeSetupOpen);

  useEffect(() => {
    setSelectedChartKey(routeChartKey);
  }, [routeChartKey]);

  useEffect(() => {
    if (getParam(params.setup) != null) {
      setSetupOpen(routeSetupOpen);
    }
  }, [params.setup, routeSetupOpen]);

  useEffect(() => {
    if (getParam(params.mode) != null) {
      setSelectedGraphMode(routeGraphMode);
    }
  }, [params.mode, routeGraphMode]);

  useEffect(() => {
    if (getParam(params.assistMode) != null) {
      setSelectedAssistMode(routeAssistMode);
    }
  }, [params.assistMode, routeAssistMode]);

  useEffect(() => {
    if (getParam(params.lineMode) != null) {
      setSelectedLineMode(routeLineMode);
    }
  }, [params.lineMode, routeLineMode]);

  useEffect(() => {
    if (getParam(params.eloTab) != null) {
      setSelectedEloTab(routeEloTab);
    }
  }, [params.eloTab, routeEloTab]);

  useEffect(() => {
    if (!routePlayerId) return;
    const match = sortedPlayers.find(
      (player) => String(player.id) === String(routePlayerId)
    );
    if (match) {
      setSelectedPlayerId(String(match.id));
    }
  }, [routePlayerId, sortedPlayers]);

  useEffect(() => {
    if (!routeCompareId) return;
    const match = sortedPlayers.find(
      (player) => String(player.id) === String(routeCompareId)
    );
    if (match) {
      setComparePlayerId(String(match.id));
    }
  }, [routeCompareId, sortedPlayers]);

  useEffect(() => {
    if (!routeOpponentId) return;
    const match = sortedPlayers.find(
      (player) => String(player.id) === String(routeOpponentId)
    );
    if (match) {
      setSelectedOpponentId(String(match.id));
    }
  }, [routeOpponentId, sortedPlayers]);

  useEffect(() => {
    const nextRouteGroupIds = getRouteSyncedGroupIds({
      routeIds,
      currentIds: selectedGroupIds,
      players: sortedPlayers,
    });

    if (nextRouteGroupIds) {
      setSelectedGroupIds(nextRouteGroupIds);
    }
  }, [routeIds, selectedGroupIds, sortedPlayers]);

  useEffect(() => {
    if (!selectedPlayerId && sortedPlayers.length) {
      setSelectedPlayerId(String(sortedPlayers[0].id));
    }
  }, [selectedPlayerId, sortedPlayers]);

  useEffect(() => {
    if (!comparePlayerId && sortedPlayers.length > 1) {
      const fallback = sortedPlayers.find(
        (player) => String(player.id) !== String(selectedPlayerId)
      );
      if (fallback) setComparePlayerId(String(fallback.id));
    }
  }, [comparePlayerId, selectedPlayerId, sortedPlayers]);

  useEffect(() => {
    setSelectedGroupIds((current) => {
      if (!sortedPlayers.length) return [];
      const valid = current.filter((id) =>
        sortedPlayers.some((player) => String(player.id) === String(id))
      );
      if (valid.length) return valid;
      return sortedPlayers
        .slice(0, Math.min(4, sortedPlayers.length))
        .map((player) => String(player.id));
    });
  }, [sortedPlayers]);

  useEffect(() => {
    if (comparePlayerId && String(comparePlayerId) === String(selectedPlayerId)) {
      const fallback = sortedPlayers.find(
        (player) => String(player.id) !== String(selectedPlayerId)
      );
      setComparePlayerId(fallback ? String(fallback.id) : null);
    }
  }, [comparePlayerId, selectedPlayerId, sortedPlayers]);

  useEffect(() => {
    if (selectedOpponentId && String(selectedOpponentId) === String(selectedPlayerId)) {
      setSelectedOpponentId(null);
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
    () =>
      sortedPlayers.find((player) => String(player.id) === String(selectedPlayerId)) ??
      sortedPlayers[0] ??
      null,
    [selectedPlayerId, sortedPlayers]
  );

  const comparePlayer = useMemo(() => {
    const explicit = sortedPlayers.find(
      (player) => String(player.id) === String(comparePlayerId)
    );
    if (explicit) return explicit;
    return (
      sortedPlayers.find((player) => String(player.id) !== String(selectedPlayer?.id)) ??
      null
    );
  }, [comparePlayerId, selectedPlayer?.id, sortedPlayers]);

  const selectedOpponent = useMemo(() => {
    const explicit = sortedPlayers.find(
      (player) => String(player.id) === String(selectedOpponentId)
    );
    if (explicit) return explicit;
    return null;
  }, [selectedOpponentId, sortedPlayers]);

  const selectedChart = useMemo(
    () => resolveChartCatalogEntry(selectedChartKey),
    [selectedChartKey]
  );
  const selectedChartMetricOptions = useMemo(
    () => getSupportedMetricKeysForChart(selectedChart.key),
    [selectedChart.key]
  );

  useEffect(() => {
    if (!routeMetric) return;
    const normalized = normalizeMetricForChart(selectedChart.key, routeMetric);
    if (normalized) {
      setSelectedMetric(normalized as SimpleMetricKey);
    }
  }, [routeMetric, selectedChart.key]);

  useEffect(() => {
    const normalizedMetric = normalizeMetricForChart(selectedChart.key, selectedMetric);
    if (normalizedMetric && normalizedMetric !== selectedMetric) {
      setSelectedMetric(normalizedMetric);
    }
  }, [selectedChart.key, selectedMetric]);

  const sectionedCharts = useMemo(
    () =>
      CHART_SECTIONS.map((section) => ({
        ...section,
        charts: getChartsForSection(section.key).filter(
          (chart) => chart.key !== selectedChart.key
        ),
      })),
    [selectedChart.key]
  );

  const activeMetric =
    normalizeMetricForChart(selectedChart.key, selectedMetric) ?? "totalPrestige";
  const metricLabel = getMetricOrFallback(activeMetric).label;
  const focusPlayerOptions = useMemo<SetupOption[]>(
    () =>
      sortedPlayers.map((player) => ({
        key: String(player.id),
        label: player.name || "Unknown",
      })),
    [sortedPlayers]
  );
  const comparePlayerOptions = useMemo<SetupOption[]>(
    () =>
      sortedPlayers
        .filter((player) => String(player.id) !== String(selectedPlayer?.id))
        .map((player) => ({
          key: String(player.id),
          label: player.name || "Unknown",
        })),
    [selectedPlayer?.id, sortedPlayers]
  );
  const graphModeOptions = useMemo<SetupOption[]>(
    () =>
      GRAPH_MODE_OPTIONS.map((mode) => ({
        key: mode,
        label: titleCase(mode),
      })),
    []
  );
  const assistModeOptions = useMemo<SetupOption[]>(
    () =>
      ASSIST_MODE_OPTIONS.map((option) => ({
        key: option.key,
        label: option.label,
      })),
    []
  );
  const lineModeOptions = useMemo<SetupOption[]>(
    () =>
      LINE_MODE_OPTIONS.map((mode) => ({
        key: mode,
        label: titleCase(mode),
      })),
    []
  );
  const eloViewOptions = useMemo<SetupOption[]>(
    () =>
      ELO_VIEW_OPTIONS.map((tab) => ({
        key: tab,
        label: tab,
      })),
    []
  );
  const opponentOptions = useMemo<SetupOption[]>(
    () => [
      { key: "none", label: "None" },
      ...sortedPlayers
        .filter((player) => String(player.id) !== String(selectedPlayer?.id))
        .map((player) => ({
          key: String(player.id),
          label: player.name || "Unknown",
        })),
    ],
    [selectedPlayer?.id, sortedPlayers]
  );
  const heroTakeaway = buildFeaturedChartTakeaway({
    chartKey: selectedChart.key,
    selectedPlayerName: selectedPlayer?.name,
    comparePlayerName: comparePlayer?.name,
    scopedCount: selectedGroupIds.length,
    metricKey: activeMetric,
  });

  function toggleGroupPlayer(playerId: string) {
    setSelectedGroupIds((current) => {
      if (current.includes(playerId)) {
        if (current.length <= 1) return current;
        return current.filter((id) => id !== playerId);
      }
      return [...current, playerId];
    });
  }

  function buildChartHubParams(chart: ChartCatalogEntry, setupOpen: boolean) {
    const params: Record<string, string | undefined> = {
      chartKey: chart.key,
      setup: setupOpen ? "true" : undefined,
      playerId: selectedPlayer?.id ? String(selectedPlayer.id) : undefined,
    };

    if (chart.key === "elo") {
      params.ids = selectedGroupIds.length ? selectedGroupIds.join(",") : undefined;
      params.eloTab = selectedEloTab;
      params.opponentId =
        selectedEloTab === "Context" && selectedOpponent?.id
          ? String(selectedOpponent.id)
          : undefined;
      return params;
    }

    if (chart.supportsCompare && comparePlayer?.id) {
      params.compareId = String(comparePlayer.id);
    }

    if (chart.supportsIds && selectedGroupIds.length) {
      params.ids = selectedGroupIds.join(",");
    }

    if (getSupportedMetricKeysForChart(chart.key).length > 0) {
      params.metric =
        normalizeMetricForChart(chart.key, selectedMetric) ?? "totalPrestige";
    }

    if (supportsGraphMode(chart.key)) {
      params.mode = selectedGraphMode;
      params.assistMode = selectedAssistMode;
    }

    if (supportsLineView(chart.key)) {
      params.lineMode = selectedLineMode;
    }

    return params;
  }

  function replaceChartHubRoute(chart: ChartCatalogEntry, setupOpen: boolean) {
    router.replace({
      pathname: APP_ROUTES.charts,
      params: buildChartHubParams(chart, setupOpen),
    } as any);
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
      if (chart.key === "elo") {
        const {
          chartKey: _chartKey,
          setup: _setup,
          ...eloParams
        } = hubParams;

        router.push({
          pathname: APP_ROUTES.elo,
          params: eloParams,
        } as any);
        return;
      }

      const { setup: _setup, ...detailParams } = hubParams;

      router.push({
        pathname: "/charts/[chartKey]",
        params: detailParams,
      } as any);
    });
  }

  return (
    <PageShell preset="intel" scroll={false}>
      <ScrollView
        ref={scrollViewRef}
        stickyHeaderIndices={[0]}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.pageScrollContent}
      >
        <View style={styles.stickyHeroShell}>
          <HeroCard
            eyebrow="Current Chart"
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
                    width={84}
                    height={50}
                  />
                </View>

                <View style={styles.heroCopy}>
                  <Text style={styles.heroHook} numberOfLines={2}>
                    {heroTakeaway}
                  </Text>
                </View>
              </View>

            </View>

            <UtilityButton
              label={setupOpen ? "Done" : "Adjust"}
              onPress={() =>
                setupOpen ? setChartSetupOpen(false) : openSetup()
              }
              tone="blue"
              size="compact"
            />
          </HeroCard>
        </View>

        {setupOpen ? (
          <SectionCard
            title={`Adjust ${selectedChart.title}`}
            style={styles.sectionCardCompact}
          >
            <View style={styles.setupStack}>
              <SetupSection
                title="Focus player"
              >
                <SetupTabs
                  items={focusPlayerOptions}
                  value={selectedPlayer ? String(selectedPlayer.id) : ""}
                  onChange={setSelectedPlayerId}
                />
              </SetupSection>

              {selectedChart.supportsCompare ? (
                <SetupSection title="Compare player">
                  <SetupTabs
                    items={comparePlayerOptions}
                    value={comparePlayer ? String(comparePlayer.id) : ""}
                    onChange={setComparePlayerId}
                  />
                </SetupSection>
              ) : null}

              {selectedChartMetricOptions.length > 0 ? (
                <SetupSection
                  title="Metric"
                  contentStyle={styles.metricGrid}
                >
                  {selectedChartMetricOptions.map((metric) => (
                    <MetricButton
                      key={`metric-${metric}`}
                      label={titleCase(metric)}
                      active={metric === selectedMetric}
                      onPress={() => setSelectedMetric(metric)}
                    />
                  ))}
                </SetupSection>
              ) : null}

              {supportsGraphMode(selectedChart.key) ? (
                <SetupSection title="Graph mode">
                  <SetupTabs
                    items={graphModeOptions}
                    value={selectedGraphMode}
                    onChange={(next) => setSelectedGraphMode(next as GraphMode)}
                  />
                </SetupSection>
              ) : null}

              {selectedChart.key === "relationship_graph" ? (
                <SetupSection title="Assist metric">
                  <SetupTabs
                    items={assistModeOptions}
                    value={selectedAssistMode}
                    onChange={(next) =>
                      setSelectedAssistMode(next as AssistMetricMode)
                    }
                  />
                </SetupSection>
              ) : null}

              {supportsLineView(selectedChart.key) ? (
                <SetupSection title="Line view">
                  <SetupTabs
                    items={lineModeOptions}
                    value={selectedLineMode}
                    onChange={(next) => setSelectedLineMode(next as LineMode)}
                  />
                </SetupSection>
              ) : null}

              {selectedChart.key === "elo" ? (
                <SetupSection title="ELO view">
                  <SetupTabs
                    items={eloViewOptions}
                    value={selectedEloTab}
                    onChange={(next) => setSelectedEloTab(next as EloSetupTab)}
                  />
                </SetupSection>
              ) : null}

              {selectedChart.key === "elo" && selectedEloTab === "Context" ? (
                <SetupSection title="Opponent">
                  <SetupTabs
                    items={opponentOptions}
                    value={selectedOpponent ? String(selectedOpponent.id) : "none"}
                    onChange={(next) =>
                      setSelectedOpponentId(next === "none" ? null : next)
                    }
                  />
                </SetupSection>
              ) : null}

              {selectedChart.supportsIds ? (
                <SetupSection title="Players in scope">
                  {sortedPlayers.map((player) => (
                    <ActionChip
                      key={`scope-${player.id}`}
                      label={player.name || "Unknown"}
                      active={selectedGroupIds.includes(String(player.id))}
                      tone="blue"
                      onPress={() => toggleGroupPlayer(String(player.id))}
                    />
                  ))}
                </SetupSection>
              ) : null}

              <View style={styles.setupFooterActions}>
                <UtilityButton
                  label="Launch"
                  onPress={() => openChart(selectedChart)}
                  tone="green"
                  size="compact"
                />
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
    gap: 10,
    paddingBottom: 16,
  },
  stickyHeroShell: {
    backgroundColor: "rgba(8,17,32,0.98)",
    paddingBottom: 6,
  },
  heroCardCompact: {
    borderRadius: 20,
    paddingBottom: 0,
  },
  heroTopRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "flex-start",
  },
  heroLead: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  heroTitle: {
    color: CHART_COLORS.textStrong,
    fontSize: 24,
    fontWeight: "900",
  },
  heroHook: {
    color: CHART_COLORS.textStrong,
    fontSize: 11,
    lineHeight: 15,
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
    gap: 5,
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
    minHeight: 36,
    borderRadius: CHART_LAYOUT.chipRadius,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
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
    paddingRight: 4,
  },
  sectionCardCompact: {
    padding: 8,
    gap: 5,
  },
  chartCard: {
    width: 188,
    minHeight: 156,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CHART_COLORS.border,
    backgroundColor: CHART_COLORS.cardAlt,
    gap: 6,
  },
  chartCardPressable: {
    flex: 1,
    padding: 8,
    gap: 6,
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
    fontSize: 11,
    lineHeight: 15,
    minHeight: 30,
  },
  previewWrap: {
    marginTop: "auto",
  },
  starButton: {
    width: 30,
    height: 30,
    borderRadius: CHART_LAYOUT.chipRadius,
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
  setupStack: {
    gap: 5,
  },
  setupFooterActions: {
    alignItems: "stretch",
    paddingTop: 1,
  },
  setupSection: {
    gap: 4,
    padding: 6,
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
  setupSegmentedControl: {
    width: "100%",
  },
  setupUnderlineTabs: {
    gap: 6,
  },
  actionChip: {
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  actionChipText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.12,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  metricButton: {
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 36,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 5,
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
