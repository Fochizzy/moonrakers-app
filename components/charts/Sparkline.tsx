import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

import Text from "@/components/ui/Text";
import { createSmoothPath } from "@/components/charts/ELO/eloChartUtils";
import ChartFocusCard from "./ChartFocusCard";
import ChartStage from "./ChartStage";
import ChartUnderlineTabs from "./ChartUnderlineTabs";
import {
  CHART_COLORS,
  getChartStagePreset,
  withChartAlpha,
} from "./chartVisualSystem";
import { chartColors, withAlpha } from "@/utils/chartTheme";
import {
  PLAYER_METRICS,
  type MetricCategory,
  type MetricDefinition,
} from "@/utils/metricMap";

import {
  buildComparisonNarrative,
  buildGeometry,
  buildNarrative,
  clamp,
  computeMetrics,
  defaultCompactValueFormatter,
  defaultPercentFormatter,
  defaultSelectionFormatter,
  defaultValueFormatter,
  getInitialIndex,
  mergeDomain,
  normalizeData,
} from "./sparklineAnalytics";

import type {
  SelectionPoint,
  SparkMetricOption,
  SparklineProps,
} from "./sparklineTypes";

const DEFAULT_HEIGHT = 88;
const DEFAULT_WIDTH = 280;
const DEFAULT_STROKE_WIDTH = 2;
const DEFAULT_PADDING = 10;
const DEFAULT_POINT_RADIUS = 3;
const DEFAULT_SELECTED_POINT_RADIUS = 4.5;
const DEFAULT_POINT_HIT_RADIUS = 14;
const DEFAULT_RECENT_WINDOW = 3;

const COLORS = CHART_COLORS;

function sanitizeId(input: string) {
  return input.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
}

function buildDefaultMetricOptions(): SparkMetricOption[] {
  return PLAYER_METRICS.map((metric) => ({
    key: metric.key,
    label: metric.label,
    shortLabel:
      metric.label.length > 16
        ? metric.label
            .replace(" Prestige", "")
            .replace(" Estimate", "")
            .replace(" Average ", " Avg ")
        : metric.label,
  }));
}

function buildMetricCategories(metrics: MetricDefinition[]) {
  const seen = new Set<string>();
  const categories: string[] = ["All"];

  metrics.forEach((metric) => {
    if (!seen.has(metric.category)) {
      seen.add(metric.category);
      categories.push(metric.category);
    }
  });

  return categories;
}

function toneStyles(category: MetricCategory) {
  switch (category) {
    case "Core":
    case "Elo":
      return { bg: COLORS.blueSoft, value: COLORS.blue };
    case "Support":
    case "Style":
      return { bg: COLORS.greenSoft, value: COLORS.green };
    case "Execution":
    case "Pressure":
    case "Conversion":
      return { bg: COLORS.blueSoft, value: COLORS.blue };
    case "Projection":
    case "Derived":
    case "Context":
    case "Tempo":
    case "Outcome":
    case "Efficiency":
    case "Position":
    default:
      return { bg: COLORS.accentSoft, value: COLORS.accent };
  }
}

function Sparkline({
  data = [],
  comparisonData,
  metricOptions,
  metricSeriesMap,
  comparisonMetricSeriesMap,
  activeMetricKey,
  defaultMetricKey,
  onChangeMetric,
  showMetricSelector = true,
  metricTitle = "Metric",
  color = chartColors.purple,
  comparisonColor = chartColors.blue,
  primaryLabel = "Primary",
  comparisonLabel = "Comparison",
  height = DEFAULT_HEIGHT,
  width = DEFAULT_WIDTH,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  padding = DEFAULT_PADDING,
  pointRadius = DEFAULT_POINT_RADIUS,
  selectedPointRadius = DEFAULT_SELECTED_POINT_RADIUS,
  pointHitRadius = DEFAULT_POINT_HIT_RADIUS,
  recentWindow = DEFAULT_RECENT_WINDOW,
  showBaseline = true,
  showLatestButton = true,
  hideLatestWhenSelected = true,
  showValueLabel = true,
  showSummary = true,
  showStatsRow = true,
  showNarrative = true,
  showHowItWorks = false,
  selectedIndex,
  defaultSelectedIndex,
  onSelectIndex,
  valueFormatter: _valueFormatter = defaultValueFormatter,
  compactValueFormatter = defaultCompactValueFormatter,
  percentFormatter = defaultPercentFormatter,
  selectionFormatter = defaultSelectionFormatter,
  latestButtonLabel = "Latest",
  emptyLabel = "No data",
  narrativeTitle = "Narrative",
}: SparklineProps) {
  const registryMetrics = useMemo(() => PLAYER_METRICS, []);
  const defaultRegistryMetricOptions = useMemo(() => buildDefaultMetricOptions(), []);
  const resolvedMetricOptions = useMemo(
    () => metricOptions ?? defaultRegistryMetricOptions,
    [metricOptions, defaultRegistryMetricOptions]
  );

  const metricKeys = useMemo(
    () =>
      metricSeriesMap
        ? Object.keys(metricSeriesMap).filter((key) => Array.isArray(metricSeriesMap[key]))
        : [],
    [metricSeriesMap]
  );

  const hasMetricMap = metricKeys.length > 0;
  const isMetricControlled = activeMetricKey != null;

  const availableRegistryMetrics = useMemo(() => {
    if (!hasMetricMap) return registryMetrics;
    const keySet = new Set(metricKeys);
    return registryMetrics.filter((metric) => keySet.has(metric.key));
  }, [hasMetricMap, metricKeys, registryMetrics]);

  const metricCategories = useMemo(
    () => buildMetricCategories(availableRegistryMetrics),
    [availableRegistryMetrics]
  );

  const initialMetricKey = useMemo(() => {
    if (defaultMetricKey && metricKeys.includes(defaultMetricKey)) return defaultMetricKey;
    if (metricKeys.length > 0) return metricKeys[0];
    return defaultMetricKey ?? "default";
  }, [defaultMetricKey, metricKeys]);

  const [uncontrolledMetricKey, setUncontrolledMetricKey] = useState(initialMetricKey);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  useEffect(() => {
    if (!isMetricControlled) {
      setUncontrolledMetricKey(initialMetricKey);
    }
  }, [initialMetricKey, isMetricControlled]);

  const currentMetricKey = isMetricControlled ? activeMetricKey! : uncontrolledMetricKey;

  const visibleMetricOptions = useMemo(() => {
    const keySet = new Set(metricKeys);
    const base = resolvedMetricOptions.filter((option) => keySet.has(option.key));

    if (activeCategory === "All") return base;

    const categoryLookup = new Map(
      availableRegistryMetrics.map((metric) => [metric.key, metric.category])
    );

    return base.filter((option) => categoryLookup.get(option.key) === activeCategory);
  }, [
    activeCategory,
    availableRegistryMetrics,
    metricKeys,
    resolvedMetricOptions,
  ]);

  const currentMetricMeta = useMemo(
    () => availableRegistryMetrics.find((metric) => metric.key === currentMetricKey) ?? null,
    [availableRegistryMetrics, currentMetricKey]
  );

  const resolvedData = useMemo(() => {
    if (hasMetricMap && metricSeriesMap?.[currentMetricKey]) {
      return metricSeriesMap[currentMetricKey] ?? [];
    }
    return data;
  }, [currentMetricKey, data, hasMetricMap, metricSeriesMap]);

  const resolvedComparisonData = useMemo(() => {
    if (hasMetricMap && comparisonMetricSeriesMap?.[currentMetricKey]) {
      return comparisonMetricSeriesMap[currentMetricKey] ?? [];
    }
    return comparisonData;
  }, [comparisonData, comparisonMetricSeriesMap, currentMetricKey, hasMetricMap]);

  const normalizedData = useMemo(() => normalizeData(resolvedData), [resolvedData]);
  const normalizedComparisonData = useMemo(
    () => normalizeData(resolvedComparisonData ?? []),
    [resolvedComparisonData]
  );

  const dataValues = useMemo(() => normalizedData.map((item) => item.value), [normalizedData]);
  const comparisonValues = useMemo(
    () => normalizedComparisonData.map((item) => item.value),
    [normalizedComparisonData]
  );

  const hasComparison = normalizedComparisonData.length > 0;

  const domain = useMemo(
    () => mergeDomain(dataValues, comparisonValues),
    [comparisonValues, dataValues]
  );

  const geometry = useMemo(
    () =>
      buildGeometry({
        values: normalizedData,
        width,
        height,
        padding,
        domain,
      }),
    [normalizedData, width, height, padding, domain]
  );

  const comparisonGeometry = useMemo(
    () =>
      buildGeometry({
        values: normalizedComparisonData,
        width,
        height,
        padding,
        domain,
      }),
    [normalizedComparisonData, width, height, padding, domain]
  );

  const metrics = useMemo(
    () => computeMetrics(dataValues, recentWindow),
    [dataValues, recentWindow]
  );

  const comparisonMetrics = useMemo(
    () => (hasComparison ? computeMetrics(comparisonValues, recentWindow) : null),
    [comparisonValues, hasComparison, recentWindow]
  );

  const dataLength = normalizedData.length;
  const isControlled = selectedIndex != null;

  const [uncontrolledSelectedIndex, setUncontrolledSelectedIndex] = useState<number | null>(() =>
    getInitialIndex(dataLength, defaultSelectedIndex)
  );

  useEffect(() => {
    if (!isControlled) {
      setUncontrolledSelectedIndex(getInitialIndex(dataLength, defaultSelectedIndex));
    }
  }, [dataLength, defaultSelectedIndex, isControlled, currentMetricKey]);

  const activeSelectedIndex = isControlled
    ? dataLength > 0 && selectedIndex != null
      ? clamp(selectedIndex, 0, dataLength - 1)
      : null
    : uncontrolledSelectedIndex;
  const [focusedSeriesKeyState, setFocusedSeriesKeyState] = useState<"primary" | "comparison" | null>(null);
  const activeFocusedSeriesKey =
    hasComparison &&
    (focusedSeriesKeyState === "primary" || focusedSeriesKeyState === "comparison")
      ? focusedSeriesKeyState
      : null;

  const selectedPoint =
    activeSelectedIndex != null ? geometry.points[activeSelectedIndex] ?? null : null;

  const selectionText = useMemo(() => {
    if (!showValueLabel || !selectedPoint || !metrics) return null;
    return selectionFormatter(
      {
        index: selectedPoint.index,
        value: selectedPoint.value,
        label: selectedPoint.label,
      } as SelectionPoint,
      metrics
    );
  }, [metrics, selectedPoint, selectionFormatter, showValueLabel]);

  const summaryText = useMemo(() => {
    if (!showSummary || !metrics) return null;

    const metricLabel = currentMetricMeta?.label ?? currentMetricKey;

    if (hasComparison && comparisonMetrics) {
      const delta = metrics.current - comparisonMetrics.current;
      const leader =
        delta > 0 ? primaryLabel : delta < 0 ? comparisonLabel : "Neither side";
      const leadText =
        delta === 0
          ? "Both series are even right now."
          : `${leader} leads by ${compactValueFormatter(Math.abs(delta))}.`;

      return `${metricLabel}: ${leadText}`;
    }

    return `${metricLabel}: ${primaryLabel} is at ${compactValueFormatter(metrics.current)} right now.`;
  }, [
    compactValueFormatter,
    comparisonMetrics,
    currentMetricKey,
    currentMetricMeta?.label,
    hasComparison,
    metrics,
    primaryLabel,
    comparisonLabel,
    showSummary,
  ]);

  const stats = useMemo(() => {
    if (!showStatsRow || !metrics) return [];

    if (hasComparison && comparisonMetrics) {
      return [
        {
          label: `${primaryLabel} Avg`,
          value: compactValueFormatter(metrics.average),
        },
        {
          label: `${comparisonLabel} Avg`,
          value: compactValueFormatter(comparisonMetrics.average),
        },
        {
          label: "Current Gap",
          value: compactValueFormatter(metrics.current - comparisonMetrics.current),
        },
        {
          label: "Trend Gap",
          value: compactValueFormatter(
            metrics.changeFromStart - comparisonMetrics.changeFromStart
          ),
        },
      ];
    }

    return [
      { label: "Current", value: compactValueFormatter(metrics.current) },
      { label: "Average", value: compactValueFormatter(metrics.average) },
      { label: "Best", value: compactValueFormatter(metrics.max) },
      { label: "Range", value: compactValueFormatter(metrics.range) },
    ];
  }, [
    compactValueFormatter,
    comparisonMetrics,
    hasComparison,
    metrics,
    primaryLabel,
    comparisonLabel,
    showStatsRow,
  ]);

  const narrative = useMemo(() => {
    if (!showNarrative || !metrics) return null;

    if (hasComparison && comparisonMetrics) {
      return buildComparisonNarrative({
        primaryMetrics: metrics,
        comparisonMetrics,
        primaryLabel,
        comparisonLabel,
        compactValueFormatter,
        percentFormatter,
      });
    }

    return buildNarrative(metrics, compactValueFormatter, percentFormatter);
  }, [
    compactValueFormatter,
    comparisonLabel,
    comparisonMetrics,
    hasComparison,
    metrics,
    percentFormatter,
    primaryLabel,
    showNarrative,
  ]);

  const selectIndex = useCallback(
    (index: number) => {
      if (!dataLength) return;

      const clampedIndex = clamp(index, 0, dataLength - 1);
      const point = normalizedData[clampedIndex];
      if (!point) return;

      if (!isControlled) {
        setUncontrolledSelectedIndex(clampedIndex);
      }

      onSelectIndex?.(clampedIndex, {
        value: point.value,
        label: point.label,
      });
    },
    [dataLength, isControlled, normalizedData, onSelectIndex]
  );

  const handleChangeMetric = useCallback(
    (metricKey: string) => {
      if (!hasMetricMap) return;
      if (!isMetricControlled) {
        setUncontrolledMetricKey(metricKey);
      }
      onChangeMetric?.(metricKey);
    },
    [hasMetricMap, isMetricControlled, onChangeMetric]
  );

  const toggleFocusedSeries = useCallback(
    (nextKey: "primary" | "comparison") => {
      if (!hasComparison) return;
      setFocusedSeriesKeyState((current) => current === nextKey ? null : nextKey);
    },
    [hasComparison]
  );

  useEffect(() => {
    if (!hasComparison) {
      setFocusedSeriesKeyState(null);
    }
  }, [hasComparison]);

  const latestIndex = dataLength > 0 ? dataLength - 1 : null;
  const shouldShowLatestButton =
    showLatestButton &&
    latestIndex != null &&
    (!hideLatestWhenSelected || activeSelectedIndex !== latestIndex);
  const selectedPointLabel =
    selectedPoint?.label ?? (selectedPoint ? `Point ${selectedPoint.index + 1}` : null);
  const selectedComparisonPoint =
    activeSelectedIndex != null
      ? comparisonGeometry.points[activeSelectedIndex] ?? null
      : null;
  const comparisonGap =
    selectedPoint && selectedComparisonPoint
      ? selectedPoint.value - selectedComparisonPoint.value
      : null;
  const primaryFocused = activeFocusedSeriesKey === "primary";
  const comparisonFocused = activeFocusedSeriesKey === "comparison";
  const focusedSeriesColor = comparisonFocused ? comparisonColor : color;
  const primaryStrokeOpacity = activeFocusedSeriesKey
    ? primaryFocused
      ? 1
      : 0.28
    : 1;
  const comparisonStrokeOpacity = activeFocusedSeriesKey
    ? comparisonFocused
      ? 0.92
      : 0.28
    : 0.82;
  const focusSelectedPoint = comparisonFocused ? selectedComparisonPoint : selectedPoint;
  const focusMetrics = comparisonFocused ? comparisonMetrics : metrics;
  const focusLabel = comparisonFocused ? comparisonLabel : primaryLabel;
  const focusOpponentLabel = comparisonFocused ? primaryLabel : comparisonLabel;
  const focusPeakValue = comparisonFocused
    ? comparisonMetrics?.max ?? selectedComparisonPoint?.value ?? 0
    : metrics?.max ?? selectedPoint?.value ?? 0;
  const focusDeltaFromStart = comparisonFocused
    ? comparisonMetrics?.changeFromStart ?? 0
    : metrics?.changeFromStart ?? 0;
  const focusGap =
    comparisonFocused && selectedComparisonPoint && selectedPoint
      ? selectedComparisonPoint.value - selectedPoint.value
      : comparisonGap;
  const stagePreset = getChartStagePreset("compact");
  const safeMetricKey = currentMetricMeta?.key ?? currentMetricKey ?? "sparkline";
  const defsKey = sanitizeId(
    `${safeMetricKey}-${primaryLabel}-${comparisonLabel}-${dataLength}`
  );
  const backgroundId = `sparkline-bg-${defsKey}`;
  const beamId = `sparkline-beam-${defsKey}`;
  const primaryPath = useMemo(
    () => createSmoothPath(geometry.points as any),
    [geometry.points]
  );
  const comparisonPath = useMemo(
    () => createSmoothPath(comparisonGeometry.points as any),
    [comparisonGeometry.points]
  );
  const slotWidth =
    dataLength > 1
      ? Math.max(pointHitRadius * 2, (width - padding * 2) / (dataLength - 1))
      : Math.max(pointHitRadius * 2.5, 40);

  if (!dataLength) {
    return (
      <View style={[styles.wrap, { width }]}>
        <View style={[styles.emptyState, { width, height }]}>
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width }]}>
      {showMetricSelector && hasMetricMap ? (
        <>
          <View style={styles.sectionCompact}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Category</Text>
              <Text style={styles.sectionSub}>Filter the metric selector</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.underlineSelectorRowScroll}
            >
              <ChartUnderlineTabs
                items={metricCategories.map((category) => ({
                  key: category,
                  label: category,
                }))}
                activeKey={activeCategory}
                onChange={setActiveCategory}
              />
            </ScrollView>
          </View>

          <View style={styles.sectionCompact}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{metricTitle}</Text>
              <Text style={styles.sectionSub}>
                {currentMetricMeta?.label ?? currentMetricKey}
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.underlineSelectorRowScroll}
            >
              <ChartUnderlineTabs
                items={visibleMetricOptions.map((option) => ({
                  key: option.key,
                  label: option.shortLabel ?? option.label,
                }))}
                activeKey={currentMetricKey}
                onChange={handleChangeMetric}
              />
            </ScrollView>
          </View>
        </>
      ) : null}

      {showHowItWorks ? (
        <View style={styles.sectionCompact}>
          <Text style={styles.explainerTitle}>How it works</Text>
          <Text style={styles.explainerText}>
            This sparkline shows compact trend movement over time. Tap points to inspect
            values, compare two series when available, and switch metrics without changing
            the underlying chart footprint.
          </Text>
        </View>
      ) : null}

      <View style={styles.chartSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{currentMetricMeta?.label ?? primaryLabel}</Text>
          <Text style={styles.sectionSub}>Sparkline</Text>
        </View>

        <ChartStage
          tone="compact"
          style={styles.sparklineStage}
          plotStyle={styles.chartStagePlot}
        >
          <View style={styles.chartPlotFrame}>
            <Svg width={width} height={height}>
              <Defs>
                <LinearGradient id={backgroundId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={withChartAlpha(focusedSeriesColor, 0.16)} />
                  <Stop offset="62%" stopColor={withChartAlpha("#FFFFFF", 0.02)} />
                  <Stop offset="100%" stopColor={withChartAlpha("#FFFFFF", 0)} />
                </LinearGradient>

                <LinearGradient id={beamId} x1="0" y1="0" x2="0" y2="1">
                  <Stop
                    offset="0%"
                    stopColor={hasComparison ? withChartAlpha(focusedSeriesColor, 0.18) : stagePreset.beamFill}
                  />
                  <Stop offset="100%" stopColor={withChartAlpha(focusedSeriesColor, 0.01)} />
                </LinearGradient>
              </Defs>

              <Rect
                x={0}
                y={0}
                width={width}
                height={height}
                rx={16}
                fill={`url(#${backgroundId})`}
                stroke={stagePreset.plotBorder}
              />

              {[0.2, 0.5, 0.8].map((ratio, index) => {
                const y = padding + (height - padding * 2) * ratio;
                return (
                  <Line
                    key={`grid-${index}`}
                    x1={padding}
                    y1={y}
                    x2={width - padding}
                    y2={y}
                    stroke={withChartAlpha("#FFFFFF", index === 1 ? 0.08 : 0.05)}
                    strokeWidth={1}
                    strokeDasharray="4 6"
                  />
                );
              })}

              {selectedPoint ? (
                <>
                  <Rect
                    x={selectedPoint.x - Math.min(18, slotWidth / 2)}
                    y={padding * 0.6}
                    width={Math.min(36, slotWidth)}
                    height={height - padding * 1.2}
                    rx={14}
                    fill={`url(#${beamId})`}
                  />
                  <Line
                    x1={selectedPoint.x}
                    y1={padding * 0.6}
                    x2={selectedPoint.x}
                    y2={height - padding * 0.8}
                    stroke={withChartAlpha(focusedSeriesColor, 0.28)}
                    strokeWidth={1.5}
                  />
                </>
              ) : null}

              {showBaseline ? (
                <Line
                  x1={padding}
                  y1={geometry.baselineY}
                  x2={width - padding}
                  y2={geometry.baselineY}
                  stroke={withAlpha(chartColors.text, 0.12)}
                  strokeWidth={1}
                />
              ) : null}

              {hasComparison && comparisonPath ? (
                <>
                  <Path
                    d={comparisonPath}
                    stroke={withChartAlpha(comparisonColor, comparisonStrokeOpacity * 0.22)}
                    strokeWidth={strokeWidth + 4}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d={comparisonPath}
                    stroke={withChartAlpha(comparisonColor, comparisonStrokeOpacity)}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              ) : null}

              {primaryPath ? (
                <>
                  <Path
                    d={primaryPath}
                    stroke={withChartAlpha(color, primaryStrokeOpacity * 0.24)}
                    strokeWidth={strokeWidth + 4}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d={primaryPath}
                    stroke={withChartAlpha(color, primaryStrokeOpacity)}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              ) : null}

              {hasComparison
                ? comparisonGeometry.points.map((point) => {
                    const isSelected = point.index === activeSelectedIndex;
                    return (
                      <G key={`comparison-${point.index}`}>
                        {isSelected ? (
                        <Circle
                          cx={point.x}
                          cy={point.y}
                          r={selectedPointRadius + 2}
                          fill={withChartAlpha(comparisonColor, comparisonFocused ? 0.16 : 0.1)}
                        />
                      ) : null}
                      <Circle
                        cx={point.x}
                        cy={point.y}
                        r={isSelected ? selectedPointRadius - 0.4 : pointRadius - 0.3}
                        fill={comparisonColor}
                        stroke={withChartAlpha("#FFFFFF", isSelected ? 0.78 : 0.32)}
                        strokeWidth={isSelected ? 1.2 : 0.7}
                        opacity={isSelected ? (comparisonFocused ? 0.98 : 0.86) : activeFocusedSeriesKey ? (comparisonFocused ? 0.84 : 0.42) : 0.72}
                      />
                    </G>
                  );
                })
                : null}

              {geometry.points.map((point) => {
                const isSelected = point.index === activeSelectedIndex;
                return (
                  <G key={`primary-${point.index}`}>
                    {isSelected ? (
                        <Circle
                          cx={point.x}
                          cy={point.y}
                          r={selectedPointRadius + 3}
                          fill={withChartAlpha(color, primaryFocused ? 0.2 : 0.12)}
                        />
                      ) : null}
                      <Circle
                        cx={point.x}
                        cy={point.y}
                        r={isSelected ? selectedPointRadius : pointRadius}
                        fill={color}
                        stroke={withChartAlpha("#FFFFFF", isSelected ? 0.94 : 0.42)}
                        strokeWidth={isSelected ? 1.4 : 0.8}
                        opacity={isSelected ? (primaryFocused ? 1 : 0.9) : activeFocusedSeriesKey ? (primaryFocused ? 0.9 : 0.48) : 0.82}
                      />
                    </G>
                  );
                })}
            </Svg>

            <View style={styles.touchRow} pointerEvents="box-none">
              {geometry.points.map((point) => (
                <Pressable
                  key={`tap-${point.index}`}
                  onPress={() => selectIndex(point.index)}
                  accessibilityRole="button"
                  accessibilityLabel={`Data point ${point.index + 1} of ${geometry.points.length}`}
                  style={[
                    styles.touchSlot,
                    {
                      left: point.x - slotWidth / 2,
                      width: slotWidth,
                      height,
                    },
                  ]}
                />
              ))}
            </View>
          </View>

          {focusSelectedPoint && focusMetrics ? (
            <ChartFocusCard
              title={focusLabel}
              value={compactValueFormatter(focusSelectedPoint.value)}
              helper={showValueLabel ? selectedPointLabel ?? undefined : undefined}
              story={
                hasComparison && focusGap != null
                  ? `Peak ${compactValueFormatter(focusPeakValue)} | Gap ${focusGap >= 0 ? "+" : ""}${compactValueFormatter(focusGap)} vs ${focusOpponentLabel}`
                  : `Peak ${compactValueFormatter(focusPeakValue)} | Delta ${focusDeltaFromStart >= 0 ? "+" : ""}${compactValueFormatter(focusDeltaFromStart)}`
              }
              tone="compact"
              accentColor={focusedSeriesColor}
              style={styles.sparklineFocusCard}
              leading={<View style={[styles.legendDot, { backgroundColor: focusedSeriesColor }]} />}
            />
          ) : null}

          {(hasComparison || selectionText) && (
            <View style={styles.legendGrid}>
              <Pressable
                style={[
                  styles.legendMiniCard,
                  {
                    borderColor: withChartAlpha(color, primaryFocused ? 0.42 : 0.3),
                    backgroundColor: withChartAlpha(color, primaryFocused ? 0.14 : 0.08),
                  },
                ]}
                onPress={() => toggleFocusedSeries("primary")}
              >
                <View style={styles.legendMiniHeader}>
                  <View style={[styles.legendDot, { backgroundColor: color }]} />
                  <Text style={styles.legendName} numberOfLines={1}>
                    {primaryLabel}
                  </Text>
                </View>
                <Text style={[styles.legendValue, { color }]}>
                  {compactValueFormatter(selectedPoint?.value ?? metrics?.current ?? 0)}
                </Text>
              </Pressable>

              {hasComparison ? (
                <Pressable
                  style={[
                    styles.legendMiniCard,
                    {
                      borderColor: withChartAlpha(comparisonColor, comparisonFocused ? 0.42 : 0.26),
                      backgroundColor: withChartAlpha(comparisonColor, comparisonFocused ? 0.14 : 0.08),
                    },
                  ]}
                  onPress={() => toggleFocusedSeries("comparison")}
                >
                  <View style={styles.legendMiniHeader}>
                    <View
                      style={[styles.legendDot, { backgroundColor: comparisonColor }]}
                    />
                    <Text style={styles.legendName} numberOfLines={1}>
                      {comparisonLabel}
                    </Text>
                  </View>
                  <Text style={[styles.legendValue, { color: comparisonColor }]}>
                    {compactValueFormatter(
                      selectedComparisonPoint?.value ??
                        comparisonMetrics?.current ??
                        0
                    )}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </ChartStage>
      </View>

      {summaryText ? (
        <View style={styles.sectionCompact}>
          <Text style={styles.summaryText}>{summaryText}</Text>
        </View>
      ) : null}

      {stats.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsStripScroll}
        >
          <View
            style={[
              styles.statsStrip,
              currentMetricMeta ? { backgroundColor: toneStyles(currentMetricMeta.category).bg } : null,
            ]}
          >
            {stats.map((stat, index) => (
              <React.Fragment key={stat.label}>
                {index > 0 ? <View style={styles.statsDivider} /> : null}
                <View style={styles.statStripItem}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text
                    style={styles.statLabel}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {stat.label}
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </ScrollView>
      ) : null}

      {narrative ? (
        <View style={styles.sectionCompact}>
          <Text style={styles.narrativeTitle}>{narrativeTitle}</Text>
          <Text style={styles.narrativeHeadline}>{narrative.headline}</Text>

          {narrative.tags.length ? (
            <View style={styles.tagsRow}>
              {narrative.tags.map((tag) => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.bulletsWrap}>
            {narrative.bullets.map((bullet, index) => (
              <View key={`${index}-${bullet}`} style={styles.bulletRow}>
                <Text style={styles.bulletMarker}>•</Text>
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {shouldShowLatestButton ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Select ${latestButtonLabel.toLowerCase()} point`}
          onPress={() => {
            if (latestIndex != null) {
              selectIndex(latestIndex);
            }
          }}
          style={styles.reset}
        >
          <Text style={styles.resetText}>{latestButtonLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

Sparkline.displayName = "Sparkline";

export default memo(Sparkline);

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 6,
  },

  sectionCompact: {
    width: "100%",
    borderRadius: 14,
    padding: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  chartSection: {
    width: "100%",
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 2,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
    flexShrink: 1,
  },
  sectionSub: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "right",
    flexShrink: 1,
  },

  underlineSelectorRowScroll: {
    gap: 12,
    paddingRight: 8,
    alignItems: "flex-end",
  },
  sparklineStage: {
    width: "100%",
  },
  chartStagePlot: {
    width: "100%",
    alignItems: "center",
    gap: 8,
    padding: 0,
  },
  chartPlotFrame: {
    position: "relative",
  },
  touchRow: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  touchSlot: {
    position: "absolute",
    top: 0,
  },
  sparklineFocusCard: {
    width: "100%",
  },

  explainerTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
  explainerText: {
    color: COLORS.sub,
    fontSize: 11,
    lineHeight: 16,
  },

  summaryText: {
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 15,
  },

  statsStripScroll: {
    width: "100%",
  },
  statsStrip: {
    minWidth: "100%",
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    backgroundColor: COLORS.cardAlt,
  },
  statStripItem: {
    minWidth: 86,
    paddingHorizontal: 10,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  statsDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  statLabel: {
    color: COLORS.sub,
    fontSize: 10,
    lineHeight: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  statValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  legendGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  legendMiniCard: {
    width: "48%",
    minHeight: 56,
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  legendMiniHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  legendName: {
    flex: 1,
    minWidth: 0,
    color: "#E5E7EB",
    fontSize: 11,
    fontWeight: "800",
  },
  legendValue: {
    fontSize: 13,
    fontWeight: "900",
  },

  narrativeTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
  narrativeHeadline: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagPill: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "800",
  },
  bulletsWrap: {
    gap: 6,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  bulletMarker: {
    color: COLORS.sub,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  bulletText: {
    flex: 1,
    color: COLORS.sub,
    fontSize: 11,
    lineHeight: 16,
  },

  reset: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resetText: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "800",
  },

  emptyState: {
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: COLORS.sub,
    fontSize: 12,
    fontWeight: "700",
  },
});
