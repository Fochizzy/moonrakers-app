import React, { memo, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";

import Text from "@/components/ui/Text";

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

  /**
   * Future-facing metric support.
   * If metricDataMap is provided, the chart becomes fully metric-driven.
   */
  metricOptions?: MetricOption[];
  metricDataMap?: Record<string, StackedRow[]>;
  activeMetricKey?: string;
  defaultMetricKey?: string;
  onChangeMetric?: (metricKey: string) => void;
  showMetricSelector?: boolean;

  /**
   * Player scope controls.
   */
  selectedPlayerIds?: string[];
  defaultSelectedPlayerIds?: string[];
  onChangeSelectedPlayerIds?: (playerIds: string[]) => void;
  showPlayerSelector?: boolean;
  playerMode?: PlayerMode;
  defaultPlayerMode?: PlayerMode;
  onChangePlayerMode?: (mode: PlayerMode) => void;

  /**
   * Density / list controls.
   */
  maxRows?: number;
  maxVisibleMetricOptions?: number;
  showCategorySelector?: boolean;
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
  blue: "#3B82F6",
  blueSoft: "rgba(59,130,246,0.18)",
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
        .map((c) => c + c)
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

function getMetricTone(metricKey?: string) {
  switch (metricKey) {
    case "directPrestige":
    case "directEfficiency":
    case "elo":
    case "eloDelta":
      return { bg: COLORS.blueSoft, value: COLORS.blue };
    case "objectivePrestige":
    case "contracts":
    case "wins":
    case "winRate":
      return { bg: COLORS.blueSoft, value: COLORS.blue };
    case "assistPrestigeReceived":
    case "assistPrestigeSent":
    case "assists":
    case "assistEfficiency":
      return { bg: COLORS.greenSoft, value: COLORS.green };
    default:
      return { bg: COLORS.accentSoft, value: COLORS.accent };
  }
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
          color: segment.color || COLORS.accent,
        });
      }
    }
  }

  return Array.from(seen.values());
}

function resolvePlayerColor(row: StackedRow, players: PlayerLike[]) {
  if (row.color) return row.color;
  const matched = players.find((player) => String(player.id) === String(row.id));
  return matched?.color || COLORS.accent;
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
    if (metricKeys.length > 0) return metricKeys[0];
    return defaultMetricKey ?? "";
  }, [defaultMetricKey, metricKeys]);

  const [uncontrolledMetricKey, setUncontrolledMetricKey] = useState(initialMetricKey);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [uncontrolledSelectedPlayerIds, setUncontrolledSelectedPlayerIds] =
    useState<string[]>(defaultSelectedPlayerIds);
  const [uncontrolledPlayerMode, setUncontrolledPlayerMode] =
    useState<PlayerMode>(defaultPlayerMode);

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
        color: resolvePlayerColor(row, players),
        segments: (row.segments || [])
          .map((segment) => ({
            ...segment,
            label: segment.label || titleCase(segment.key),
            value: Math.max(0, toNumber(segment.value)),
            color: segment.color || COLORS.accent,
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
  }, [currentPlayerMode, currentSelectedPlayerIds, maxRows, players, resolvedRows]);

  const hasData = normalizedRows.length > 0;
  const totals = useMemo(() => normalizedRows.map(getRowTotal), [normalizedRows]);
  const grandTotal = useMemo(() => totals.reduce((sum, value) => sum + value, 0), [totals]);
  const strongestRow = normalizedRows[0] ?? null;
  const strongestTotal = strongestRow ? getRowTotal(strongestRow) : 0;
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

  const topCards = useMemo(() => {
    if (!hasData) return [];

    const dominantSegment = strongestRow ? getPrimarySegment(strongestRow) : null;
    const dominantTone = getMetricTone(dominantSegment?.key);

    return [
      {
        key: "leader",
        label: "Top Total",
        value: compactNumber(strongestTotal),
        sub: strongestRow?.label || "No leader",
        toneBg: COLORS.accentSoft,
        toneValue: COLORS.accent,
      },
      {
        key: "share",
        label: "Leader Share",
        value:
          grandTotal > 0 ? `${Math.round((strongestTotal / grandTotal) * 100)}%` : "0%",
        sub: "Of visible stack",
        toneBg: COLORS.blueSoft,
        toneValue: COLORS.blue,
      },
      {
        key: "mix",
        label: "Top Mix",
        value: dominantSegment?.label || "—",
        sub: dominantSegment ? compactNumber(dominantSegment.value) : "0",
        toneBg: dominantTone.bg,
        toneValue: dominantTone.value,
      },
    ];
  }, [grandTotal, hasData, strongestRow, strongestTotal]);

  const summaryText = useMemo(() => {
    if (!hasData) return null;

    const leaderName = strongestRow?.label || "Top player";
    const leaderShare =
      grandTotal > 0 ? `${Math.round((strongestTotal / grandTotal) * 100)}%` : "0%";
    const metricLabel = selectedMetricOption?.label || title;

    return `${leaderName} leads ${metricLabel.toLowerCase()} composition with ${compactNumber(
      strongestTotal
    )}, representing ${leaderShare} of the visible total.`;
  }, [grandTotal, hasData, selectedMetricOption?.label, strongestRow, strongestTotal, title]);

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
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Metric</Text>
            <Text style={styles.sectionSub}>
              {selectedMetricOption?.label ?? titleCase(currentMetricKey || "metric")}
            </Text>
          </View>

          {showCategorySelector && metricCategories.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.underlineSelectorRow}
            >
              {metricCategories.map((category) => (
                <UnderlineOption
                  key={category}
                  label={category}
                  active={category === activeCategory}
                  onPress={() => setActiveCategory(category)}
                />
              ))}
            </ScrollView>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.underlineSelectorRow}
          >
            {filteredMetricOptions.map((option) => (
              <UnderlineOption
                key={option.key}
                label={option.shortLabel ?? option.label}
                active={option.key === currentMetricKey}
                onPress={() => handleMetricChange(option.key)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {showPlayerSelector && players.length > 0 ? (
        <View style={styles.sectionCompact}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Players</Text>
            <Text style={styles.sectionSub}>Scope and selection</Text>
          </View>

          <View style={styles.underlineSelectorRow}>
            {(["top", "all", "selected"] as PlayerMode[]).map((mode) => (
              <UnderlineOption
                key={mode}
                label={titleCase(mode)}
                active={mode === currentPlayerMode}
                onPress={() => handlePlayerModeChange(mode)}
              />
            ))}
          </View>

          {currentPlayerMode === "selected" ? (
            <View style={[styles.underlineSelectorRow, { marginTop: 8 }]}>
              {players.map((player) => {
                const active = currentSelectedPlayerIds.includes(String(player.id));
                return (
                  <Pressable
                    key={player.id}
                    style={styles.underlineTabButton}
                    onPress={() => togglePlayer(String(player.id))}
                  >
                    <Text
                      style={[
                        styles.underlineTabText,
                        { color: active ? player.color || COLORS.accent : COLORS.sub },
                      ]}
                    >
                      {player.name || "Unknown"}
                    </Text>
                    <View
                      style={[
                        styles.underlineTabLine,
                        active && {
                          backgroundColor: player.color || COLORS.accent,
                        },
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.sectionCompact}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSub}>{subtitle}</Text>
        </View>

        {!hasData ? <Text style={styles.emptyText}>{emptyText}</Text> : null}

        {hasData ? (
          <View style={styles.featuredSignalsWrap}>
            <View
              style={[
                styles.featuredSignalCard,
                { backgroundColor: topCards[0]?.toneBg ?? COLORS.accentSoft },
              ]}
            >
              <Text style={styles.featuredSignalLabel} numberOfLines={1}>
                {topCards[0]?.label ?? "Top Total"}
              </Text>
              <Text
                style={[
                  styles.featuredSignalValue,
                  { color: topCards[0]?.toneValue ?? COLORS.accent },
                ]}
              >
                {topCards[0]?.value ?? "0"}
              </Text>
              <Text style={styles.featuredSignalSub} numberOfLines={2}>
                {topCards[0]?.sub ?? "—"}
              </Text>
            </View>

            <View style={styles.secondarySignalColumn}>
              {topCards.slice(1).map((card) => (
                <View
                  key={card.key}
                  style={[styles.secondarySignalCard, { backgroundColor: card.toneBg }]}
                >
                  <Text style={styles.metricLabelCompact} numberOfLines={1}>
                    {card.label}
                  </Text>
                  <Text style={[styles.metricValueCompact, { color: card.toneValue }]}>
                    {card.value}
                  </Text>
                  <Text style={styles.metricSubCompact} numberOfLines={1}>
                    {card.sub}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      {hasData ? (
        <View style={styles.sectionCompact}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Composition</Text>
            <Text style={styles.sectionSub}>{normalizedRows.length} players</Text>
          </View>

          <View style={styles.chartFrame}>
            <Svg width={chartWidth} height={chartHeight}>
              {normalizedRows.map((row, rowIndex) => {
                const y = rowIndex * (barHeight + rowGap);
                const total = getRowTotal(row);
                let xCursor = labelWidth;

                return (
                  <React.Fragment key={row.id}>
                    <SvgText
                      x={0}
                      y={y + 13}
                      fill={COLORS.text}
                      fontSize={11}
                      fontWeight="700"
                    >
                      {row.label.length > 13 ? `${row.label.slice(0, 13)}…` : row.label}
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
                      const width =
                        total > 0
                          ? Math.max((value / total) * chartInnerWidth, value > 0 ? 4 : 0)
                          : 0;

                      const segmentX = xCursor;
                      xCursor += width;

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

          <View style={styles.legendRow}>
            {legend.map((item) => (
              <View key={item.key} style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {summaryText ? (
        <View style={styles.sectionCompact}>
          <Text style={styles.summaryText}>{summaryText}</Text>
        </View>
      ) : null}

      {hasData ? (
        <View style={styles.sectionCompact}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Player Breakdown</Text>
            <Text style={styles.sectionSub}>Dense detail cards</Text>
          </View>

          <View style={styles.metricGridDense}>
            {normalizedRows.map((row) => {
              const total = getRowTotal(row);
              const primary = getPrimarySegment(row);
              const tone = getMetricTone(primary?.key);
              const playerColor = resolvePlayerColor(row, players);

              return (
                <View
                  key={`card-${row.id}`}
                  style={[
                    styles.metricCardDense,
                    { backgroundColor: withAlpha(playerColor, 0.14) },
                  ]}
                >
                  <Text style={styles.metricLabelCompact} numberOfLines={1}>
                    {row.label}
                  </Text>
                  <Text style={[styles.metricValueCompact, { color: tone.value }]}>
                    {compactNumber(total)}
                  </Text>
                  <Text style={styles.metricSubCompact} numberOfLines={2}>
                    {primary ? `${primary.label} leads` : "No mix data"}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

StackedBarChart.displayName = "StackedBarChart";

export default memo(StackedBarChart);

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    gap: 6,
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

  underlineSelectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 12,
    rowGap: 8,
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

  featuredSignalsWrap: {
    flexDirection: "row",
    gap: 4,
  },
  featuredSignalCard: {
    width: "52%",
    minHeight: 132,
    borderRadius: 14,
    padding: 10,
    justifyContent: "space-between",
  },
  featuredSignalLabel: {
    color: COLORS.sub,
    fontSize: 12,
    lineHeight: 14,
    marginBottom: 6,
  },
  featuredSignalValue: {
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 28,
    marginBottom: 6,
  },
  featuredSignalSub: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 14,
  },
  secondarySignalColumn: {
    flex: 1,
    justifyContent: "space-between",
    gap: 4,
  },
  secondarySignalCard: {
    borderRadius: 12,
    padding: 10,
    minHeight: 64,
  },

  chartFrame: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 2,
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

  summaryText: {
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 15,
  },

  metricGridDense: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  metricCardDense: {
    width: "32%",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 56,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricLabelCompact: {
    color: COLORS.sub,
    fontSize: 10,
    lineHeight: 12,
    marginBottom: 4,
  },
  metricValueCompact: {
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 16,
  },
  metricSubCompact: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
    lineHeight: 12,
  },
});
