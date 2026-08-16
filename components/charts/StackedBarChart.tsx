import React, { memo, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";

import ChartFocusCard from "@/components/charts/ChartFocusCard";
import ChartStage from "@/components/charts/ChartStage";
import ChartUnderlineTabs from "@/components/charts/ChartUnderlineTabs";
import Text from "@/components/ui/Text";
import { resolveStoredPlayerColor } from "@/utils/playerColor";
import { getPlayerAccentColor } from "@/utils/turnTheme";

type Segment = {
  key: string;
  label: string;
  value: number;
  color?: string;
};

type StackedRow = {
  id: string;
  label: string;
  color?: string;
  segments: Segment[];
};

type PlayerLike = {
  id: string;
  name?: string;
  color?: string;
};

type MetricOption = {
  key: string;
  label: string;
  shortLabel?: string;
  category?: string;
  description?: string;
};

type PlayerMode = "top" | "all" | "selected";

export type StackedBarChartProps = {
  data?: StackedRow[];
  players?: PlayerLike[];
  title?: string;
  subtitle?: string;
  emptyText?: string;
  metricOptions?: MetricOption[];
  metricDataMap?: Record<string, StackedRow[]>;
  activeMetricKey?: string;
  defaultMetricKey?: string;
  onChangeMetric?: (metricKey: string) => void;
  showMetricSelector?: boolean;
  selectedPlayerIds?: string[];
  defaultSelectedPlayerIds?: string[];
  onChangeSelectedPlayerIds?: (playerIds: string[]) => void;
  showPlayerSelector?: boolean;
  playerMode?: PlayerMode;
  defaultPlayerMode?: PlayerMode;
  onChangePlayerMode?: (mode: PlayerMode) => void;
  maxRows?: number;
  maxVisibleMetricOptions?: number;
  showCategorySelector?: boolean;
  showHeader?: boolean;
};

const COLORS = {
  card: "rgba(12,18,38,0.92)",
  cardAlt: "rgba(16,24,48,0.95)",
  text: "#E2E8F0",
  sub: "#94A3B8",
  muted: "#64748B",
  accent: "#A855F7",
  accentSoft: "rgba(168,85,247,0.18)",
  blue: "#3B82F6",
  blueSoft: "rgba(59,130,246,0.18)",
  green: "#22C55E",
  greenSoft: "rgba(34,197,94,0.16)",
  border: "rgba(255,255,255,0.08)",
  whiteSoft: "rgba(255,255,255,0.06)",
};

const DEFAULT_EMPTY = "No stacked-bar data available yet.";

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function titleCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function compactNumber(value: number) {
  const abs = Math.abs(value);

  if (abs >= 1000) {
    const formatted = (value / 1000).toFixed(abs >= 10000 ? 0 : 1);
    return `${formatted.replace(/\.0$/, "")}k`;
  }

  if (abs >= 100) return `${Math.round(value)}`;
  if (abs >= 10) return value.toFixed(1).replace(/\.0$/, "");
  return value.toFixed(1).replace(/\.0$/, "");
}

function withAlpha(hexOrRgba: string, alpha: number) {
  if (!hexOrRgba) return `rgba(255,255,255,${alpha})`;

  if (hexOrRgba.startsWith("rgba(")) {
    return hexOrRgba.replace(
      /rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/,
      `rgba($1,$2,$3,${alpha})`
    );
  }

  if (hexOrRgba.startsWith("rgb(")) {
    return hexOrRgba.replace(
      /rgb\((\d+),\s*(\d+),\s*(\d+)\)/,
      `rgba($1,$2,$3,${alpha})`
    );
  }

  if (hexOrRgba.startsWith("#")) {
    let hex = hexOrRgba.replace("#", "");
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((char) => char + char)
        .join("");
    }

    if (hex.length !== 6) return `rgba(255,255,255,${alpha})`;

    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  return `rgba(255,255,255,${alpha})`;
}

function normalizeAccentColor(color?: string, index = 0) {
  const raw = String(color ?? "").trim();
  if (raw.startsWith("#") || raw.startsWith("rgb") || raw.startsWith("hsl")) {
    return raw;
  }
  return getPlayerAccentColor(resolveStoredPlayerColor(color, index));
}

function getRowTotal(row: StackedRow) {
  return (row.segments || []).reduce((sum, segment) => sum + toNumber(segment.value), 0);
}

function getPrimarySegment(row: StackedRow) {
  const segments = [...(row.segments || [])].sort(
    (a, b) => toNumber(b.value) - toNumber(a.value)
  );
  return segments[0] ?? null;
}

function buildLegendFromRows(rows: StackedRow[]) {
  const seen = new Map<string, { key: string; label: string; color: string }>();

  for (const row of rows) {
    for (const segment of row.segments || []) {
      if (!segment?.key) continue;
      if (!seen.has(segment.key)) {
        seen.set(segment.key, {
          key: segment.key,
          label: segment.label || titleCase(segment.key),
          color: normalizeAccentColor(segment.color) || COLORS.accent,
        });
      }
    }
  }

  return Array.from(seen.values());
}

function resolvePlayerColor(row: StackedRow, players: PlayerLike[]) {
  if (row.color) return normalizeAccentColor(row.color);
  const matched = players.find((player) => String(player.id) === String(row.id));
  return normalizeAccentColor(matched?.color);
}

function buildChartWidth(deviceWidth: number) {
  const padded = Math.max(deviceWidth - 48, 220);
  return Math.min(Math.max(padded, 240), 430);
}

function dedupeCategories(options: MetricOption[]) {
  const seen = new Set<string>();
  const categories: string[] = ["All"];

  for (const option of options) {
    const category = option.category?.trim();
    if (!category || seen.has(category)) continue;
    seen.add(category);
    categories.push(category);
  }

  return categories;
}

function clampRowsByPlayerMode(
  rows: StackedRow[],
  playerMode: PlayerMode,
  selectedPlayerIds: string[],
  maxRows: number
) {
  if (playerMode === "selected" && selectedPlayerIds.length > 0) {
    const selected = rows.filter((row) => selectedPlayerIds.includes(String(row.id)));
    return selected.slice(0, maxRows);
  }

  if (playerMode === "all") {
    return rows.slice(0, maxRows);
  }

  return rows.slice(0, maxRows);
}

function SectionHeader({
  title,
  sub,
}: {
  title: string;
  sub: string;
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSub}>{sub}</Text>
    </View>
  );
}

function StackedBarChart({
  data = [],
  players = [],
  title = "Prestige Composition",
  subtitle = "Stacked comparison",
  emptyText = DEFAULT_EMPTY,
  metricOptions = [],
  metricDataMap,
  activeMetricKey,
  defaultMetricKey,
  onChangeMetric,
  showMetricSelector = true,
  selectedPlayerIds,
  defaultSelectedPlayerIds = [],
  onChangeSelectedPlayerIds,
  showPlayerSelector = true,
  playerMode,
  defaultPlayerMode = "top",
  onChangePlayerMode,
  maxRows = 8,
  maxVisibleMetricOptions = 14,
  showCategorySelector = true,
  showHeader = true,
}: StackedBarChartProps) {
  const { width: deviceWidth } = useWindowDimensions();

  const metricKeys = useMemo(() => {
    if (metricDataMap) {
      return Object.keys(metricDataMap).filter((key) => Array.isArray(metricDataMap[key]));
    }
    return [];
  }, [metricDataMap]);

  const hasMetricMap = metricKeys.length > 0;
  const isMetricControlled = activeMetricKey != null;
  const isPlayerSelectionControlled = selectedPlayerIds != null;
  const isPlayerModeControlled = playerMode != null;

  const initialMetricKey = useMemo(() => {
    if (defaultMetricKey && metricKeys.includes(defaultMetricKey)) return defaultMetricKey;
    return metricKeys[0] ?? defaultMetricKey ?? "";
  }, [defaultMetricKey, metricKeys]);

  const [uncontrolledMetricKey, setUncontrolledMetricKey] = useState(initialMetricKey);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [uncontrolledSelectedPlayerIds, setUncontrolledSelectedPlayerIds] =
    useState<string[]>(defaultSelectedPlayerIds);
  const [uncontrolledPlayerMode, setUncontrolledPlayerMode] =
    useState<PlayerMode>(defaultPlayerMode);

  const normalizedPlayers = useMemo(
    () =>
      players.map((player, index) => ({
        ...player,
        color: normalizeAccentColor(player.color, index),
      })),
    [players]
  );

  useEffect(() => {
    if (!isMetricControlled) {
      setUncontrolledMetricKey(initialMetricKey);
    }
  }, [initialMetricKey, isMetricControlled]);

  const currentMetricKey = isMetricControlled ? activeMetricKey ?? "" : uncontrolledMetricKey;
  const currentSelectedPlayerIds = isPlayerSelectionControlled
    ? selectedPlayerIds ?? []
    : uncontrolledSelectedPlayerIds;
  const currentPlayerMode = isPlayerModeControlled
    ? playerMode ?? "top"
    : uncontrolledPlayerMode;

  const availableMetricOptions = useMemo(() => {
    if (!hasMetricMap) return [];
    return metricOptions.filter((option) => metricKeys.includes(option.key));
  }, [hasMetricMap, metricKeys, metricOptions]);

  const metricCategories = useMemo(
    () => dedupeCategories(availableMetricOptions),
    [availableMetricOptions]
  );

  const filteredMetricOptions = useMemo(() => {
    const base =
      activeCategory === "All"
        ? availableMetricOptions
        : availableMetricOptions.filter((option) => option.category === activeCategory);

    return base.slice(0, maxVisibleMetricOptions);
  }, [activeCategory, availableMetricOptions, maxVisibleMetricOptions]);

  const resolvedRows = useMemo<StackedRow[]>(() => {
    if (hasMetricMap && currentMetricKey && metricDataMap?.[currentMetricKey]) {
      return metricDataMap[currentMetricKey] ?? [];
    }
    return data ?? [];
  }, [currentMetricKey, data, hasMetricMap, metricDataMap]);

  const normalizedRows = useMemo(() => {
    const baseRows = [...resolvedRows]
      .map((row) => ({
        ...row,
        label: row.label || "Unknown",
        color: resolvePlayerColor(row, normalizedPlayers),
        segments: (row.segments || [])
          .map((segment) => ({
            ...segment,
            label: segment.label || titleCase(segment.key),
            value: Math.max(0, toNumber(segment.value)),
            color: normalizeAccentColor(segment.color) || COLORS.accent,
          }))
          .filter((segment) => segment.value > 0),
      }))
      .sort((a, b) => getRowTotal(b) - getRowTotal(a));

    return clampRowsByPlayerMode(
      baseRows,
      currentPlayerMode,
      currentSelectedPlayerIds,
      maxRows
    );
  }, [
    currentPlayerMode,
    currentSelectedPlayerIds,
    maxRows,
    normalizedPlayers,
    resolvedRows,
  ]);

  const hasData = normalizedRows.length > 0;
  const totals = useMemo(() => normalizedRows.map(getRowTotal), [normalizedRows]);
  const grandTotal = useMemo(() => totals.reduce((sum, value) => sum + value, 0), [totals]);
  const maxVisibleTotal = useMemo(
    () => totals.reduce((max, value) => Math.max(max, value), 0),
    [totals]
  );
  const strongestRow = normalizedRows[0] ?? null;
  const strongestTotal = strongestRow ? getRowTotal(strongestRow) : 0;
  const leaderShare = grandTotal > 0 ? Math.round((strongestTotal / grandTotal) * 100) : 0;
  const dominantSegment = strongestRow ? getPrimarySegment(strongestRow) : null;
  const legend = useMemo(() => buildLegendFromRows(normalizedRows), [normalizedRows]);

  const selectedMetricOption = useMemo(() => {
    if (!currentMetricKey) return null;
    return (
      availableMetricOptions.find((option) => option.key === currentMetricKey) ?? {
        key: currentMetricKey,
        label: titleCase(currentMetricKey),
        shortLabel: titleCase(currentMetricKey),
      }
    );
  }, [availableMetricOptions, currentMetricKey]);

  const chartWidth = buildChartWidth(deviceWidth);
  const barHeight = 18;
  const rowGap = 18;
  const labelWidth = 92;
  const rightValueWidth = 48;
  const chartInnerWidth = Math.max(chartWidth - labelWidth - rightValueWidth - 12, 120);
  const chartHeight = Math.max(normalizedRows.length * (barHeight + rowGap), 12);

  const categoryTabs = useMemo(
    () => metricCategories.map((category) => ({ key: category, label: category })),
    [metricCategories]
  );
  const metricTabs = useMemo(
    () =>
      filteredMetricOptions.map((option) => ({
        key: option.key,
        label: option.shortLabel ?? option.label,
      })),
    [filteredMetricOptions]
  );
  const playerModeTabs = useMemo(
    () => [
      { key: "top", label: "Top" },
      { key: "all", label: "All" },
      { key: "selected", label: "Selected" },
    ],
    []
  );

  function handleMetricChange(metricKey: string) {
    if (!hasMetricMap) return;
    if (!isMetricControlled) {
      setUncontrolledMetricKey(metricKey);
    }
    onChangeMetric?.(metricKey);
  }

  function togglePlayer(playerId: string) {
    const current = currentSelectedPlayerIds;
    const exists = current.includes(playerId);

    const next = exists
      ? current.filter((id) => id !== playerId)
      : [...current, playerId];

    if (!isPlayerSelectionControlled) {
      setUncontrolledSelectedPlayerIds(next);
    }
    onChangeSelectedPlayerIds?.(next);
  }

  function handlePlayerModeChange(mode: PlayerMode) {
    if (!isPlayerModeControlled) {
      setUncontrolledPlayerMode(mode);
    }
    onChangePlayerMode?.(mode);
  }

  return (
    <View style={styles.wrap}>
      {showMetricSelector && hasMetricMap ? (
        <View style={styles.sectionCompact}>
          <SectionHeader
            title="Metric"
            sub={selectedMetricOption?.label ?? titleCase(currentMetricKey || "metric")}
          />

          {showCategorySelector && metricCategories.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.underlineScroll}
            >
              <ChartUnderlineTabs
                items={categoryTabs}
                activeKey={activeCategory}
                onChange={setActiveCategory}
              />
            </ScrollView>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.underlineScroll}
          >
            <ChartUnderlineTabs
              items={metricTabs}
              activeKey={currentMetricKey}
              onChange={handleMetricChange}
            />
          </ScrollView>
        </View>
      ) : null}

      {showPlayerSelector && normalizedPlayers.length > 0 ? (
        <View style={styles.sectionCompact}>
          <SectionHeader title="Players" sub="Scope and selection" />

          <ChartUnderlineTabs
            items={playerModeTabs}
            activeKey={currentPlayerMode}
            onChange={(mode) => handlePlayerModeChange(mode as PlayerMode)}
          />

          {currentPlayerMode === "selected" ? (
            <View style={styles.playerSelectionRow}>
              {normalizedPlayers.map((player) => {
                const active = currentSelectedPlayerIds.includes(String(player.id));
                return (
                  <Pressable
                    key={player.id}
                    style={[
                      styles.playerPill,
                      active && {
                        backgroundColor: withAlpha(player.color || COLORS.accent, 0.16),
                        borderColor: withAlpha(player.color || COLORS.accent, 0.58),
                      },
                    ]}
                    onPress={() => togglePlayer(String(player.id))}
                  >
                    <Text
                      style={[
                        styles.playerPillText,
                        { color: active ? player.color || COLORS.accent : COLORS.sub },
                      ]}
                    >
                      {player.name || "Unknown"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      {showHeader ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      ) : null}

      {!hasData ? (
        <View style={styles.sectionCompact}>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      ) : null}

      {hasData && strongestRow ? (
        <ChartFocusCard
          title={strongestRow.label}
          value={compactNumber(strongestTotal)}
          helper={`${selectedMetricOption?.label ?? title} leader | ${leaderShare}% of visible total`}
          story={
            dominantSegment
              ? `${dominantSegment.label} is the biggest source at ${compactNumber(dominantSegment.value)}.`
              : `${strongestRow.label} leads the visible stack right now.`
          }
          tone="comparison"
          accentColor={strongestRow.color}
          compact
        />
      ) : null}

      {hasData ? (
        <ChartStage
          tone="comparison"
          style={styles.chartStage}
          plotStyle={styles.chartStagePlot}
          header={
            <SectionHeader
              title="Composition"
              sub={`${normalizedRows.length} players`}
            />
          }
          footer={
            <View style={styles.legendRow}>
              {legend.map((item) => (
                <View key={item.key} style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>{item.label}</Text>
                </View>
              ))}
            </View>
          }
        >
          <View style={styles.chartFrame}>
            <Svg width={chartWidth} height={chartHeight}>
              {normalizedRows.map((row, rowIndex) => {
                const y = rowIndex * (barHeight + rowGap);
                const total = getRowTotal(row);
                const rowTargetWidth =
                  maxVisibleTotal > 0 ? (total / maxVisibleTotal) * chartInnerWidth : 0;
                let xCursor = labelWidth;
                let usedWidth = 0;

                return (
                  <React.Fragment key={row.id}>
                    <SvgText
                      x={0}
                      y={y + 13}
                      fill={COLORS.text}
                      fontSize={11}
                      fontWeight="700"
                    >
                      {row.label.length > 13 ? `${row.label.slice(0, 13)}...` : row.label}
                    </SvgText>

                    <Rect
                      x={labelWidth}
                      y={y}
                      width={chartInnerWidth}
                      height={barHeight}
                      rx={9}
                      fill={COLORS.cardAlt}
                      stroke={COLORS.border}
                      strokeWidth={1}
                    />

                    {(row.segments || []).map((segment, segmentIndex) => {
                      const value = toNumber(segment.value);
                      const rawWidth =
                        maxVisibleTotal > 0 ? (value / maxVisibleTotal) * chartInnerWidth : 0;
                      const remainingWidth = Math.max(0, rowTargetWidth - usedWidth);
                      const width =
                        segmentIndex === row.segments.length - 1
                          ? remainingWidth
                          : Math.min(rawWidth, remainingWidth);

                      const segmentX = xCursor;
                      xCursor += width;
                      usedWidth += width;

                      const radius = row.segments.length === 1 ? 9 : 0;
                      const leftRadius = segmentIndex === 0 ? 9 : radius;
                      const rightRadius =
                        segmentIndex === row.segments.length - 1 ? 9 : radius;

                      return (
                        <Rect
                          key={`${row.id}-${segment.key}`}
                          x={segmentX}
                          y={y}
                          width={Math.max(0, width)}
                          height={barHeight}
                          rx={Math.max(leftRadius, rightRadius)}
                          fill={segment.color || row.color || COLORS.accent}
                        />
                      );
                    })}

                    <SvgText
                      x={labelWidth + chartInnerWidth + 8}
                      y={y + 13}
                      fill={COLORS.sub}
                      fontSize={11}
                      fontWeight="700"
                    >
                      {compactNumber(total)}
                    </SvgText>
                  </React.Fragment>
                );
              })}
            </Svg>
          </View>
        </ChartStage>
      ) : null}

    </View>
  );
}

StackedBarChart.displayName = "StackedBarChart";

export default memo(StackedBarChart);

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    gap: 12,
  },
  header: {
    gap: 4,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
  },
  subtitle: {
    color: COLORS.sub,
    fontSize: 11,
    lineHeight: 15,
  },
  sectionCompact: {
    width: "100%",
    borderRadius: 14,
    padding: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 6,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    flexShrink: 1,
  },
  sectionSub: {
    color: COLORS.sub,
    fontSize: 10,
    textAlign: "right",
    flexShrink: 1,
  },
  emptyText: {
    color: COLORS.sub,
    fontSize: 11,
  },
  underlineScroll: {
    paddingRight: 12,
  },
  playerSelectionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  playerPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.whiteSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  playerPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  chartStage: {
    marginBottom: 6,
  },
  chartStagePlot: {
    paddingVertical: 10,
  },
  chartFrame: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  legendRow: {
    marginTop: 8,
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "flex-start",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendText: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: "700",
  },
});
