import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import Text from "@/components/ui/Text";
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
  SparkDatum,
  SparkMetricOption,
  SparklineProps,
} from "./sparklineTypes";

const DEFAULT_HEIGHT = 56;
const DEFAULT_WIDTH = 280;
const DEFAULT_STROKE_WIDTH = 2;
const DEFAULT_PADDING = 10;
const DEFAULT_POINT_RADIUS = 3;
const DEFAULT_SELECTED_POINT_RADIUS = 4.5;
const DEFAULT_POINT_HIT_RADIUS = 14;
const DEFAULT_RECENT_WINDOW = 3;

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
  blue: "#3B82F6",
  blueSoft: "rgba(59,130,246,0.18)",
  border: "rgba(255,255,255,0.08)",
  whiteSoft: "rgba(255,255,255,0.06)",
};

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

function UnderlineOption({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.underlineTabButton} onPress={onPress}>
      <Text style={[styles.underlineTabText, active && styles.underlineTabTextActive]}>
        {label}
      </Text>
      <View style={[styles.underlineTabLine, active && styles.underlineTabLineActive]} />
    </Pressable>
  );
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
  valueFormatter = defaultValueFormatter,
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

  const latestIndex = dataLength > 0 ? dataLength - 1 : null;
  const shouldShowLatestButton =
    showLatestButton &&
    latestIndex != null &&
    (!hideLatestWhenSelected || activeSelectedIndex !== latestIndex);

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
              {metricCategories.map((category) => (
                <UnderlineOption
                  key={category}
                  label={category}
                  active={activeCategory === category}
                  onPress={() => setActiveCategory(category)}
                />
              ))}
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
              {visibleMetricOptions.map((option) => {
                const active = option.key === currentMetricKey;
                return (
                  <UnderlineOption
                    key={option.key}
                    label={option.shortLabel ?? option.label}
                    active={active}
                    onPress={() => handleChangeMetric(option.key)}
                  />
                );
              })}
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

      <View style={styles.sectionCompact}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{currentMetricMeta?.label ?? primaryLabel}</Text>
          <Text style={styles.sectionSub}>Sparkline</Text>
        </View>

        <View style={styles.chartCard}>
          <Svg width={width} height={height}>
            <Rect
              x={0}
              y={0}
              width={width}
              height={height}
              rx={12}
              fill={COLORS.cardAlt}
              stroke={COLORS.border}
            />

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

            {hasComparison && comparisonGeometry.path ? (
              <Path
                d={comparisonGeometry.path}
                stroke={comparisonColor}
                strokeWidth={strokeWidth}
                fill="none"
                opacity={0.9}
              />
            ) : null}

            <Path
              d={geometry.path}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
            />

            {hasComparison
              ? comparisonGeometry.points.map((point) => (
                  <Circle
                    key={`comparison-${point.index}`}
                    cx={point.x}
                    cy={point.y}
                    r={pointRadius}
                    fill={comparisonColor}
                    opacity={0.82}
                  />
                ))
              : null}

            {geometry.points.map((point) => {
              const isSelected = point.index === activeSelectedIndex;
              return (
                <React.Fragment key={`primary-${point.index}`}>
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r={isSelected ? selectedPointRadius : pointRadius}
                    fill={color}
                  />
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r={pointHitRadius}
                    fill="transparent"
                    onPress={() => selectIndex(point.index)}
                  />
                </React.Fragment>
              );
            })}
          </Svg>

          {selectionText ? <Text style={styles.valueText}>{selectionText}</Text> : null}

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{primaryLabel}</Text>
            </View>

            {hasComparison ? (
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendSwatch, { backgroundColor: comparisonColor }]}
                />
                <Text style={styles.legendText}>{comparisonLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>
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
  underlineTabButton: {
    paddingBottom: 2,
  },
  underlineTabText: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "700",
  },
  underlineTabTextActive: {
    color: COLORS.accent,
  },
  underlineTabLine: {
    marginTop: 4,
    height: 2,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  underlineTabLineActive: {
    backgroundColor: COLORS.accent,
  },

  chartCard: {
    width: "100%",
    alignItems: "center",
    gap: 8,
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
  valueText: {
    color: COLORS.sub,
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center",
  },

  legendRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    flexWrap: "wrap",
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
