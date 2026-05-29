import React, { useMemo, useState } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { usePathname, useRouter } from "expo-router";
import Svg, { Circle, Line, Path, Polygon, Text as SvgText } from "react-native-svg";

import ChartFocusCard from "@/components/charts/ChartFocusCard";
import ChartStage from "@/components/charts/ChartStage";
import Text from "@/components/ui/Text";
import {
  buildDefinitionsRoute,
  resolveDefinitionSourceLabel,
} from "@/utils/appRoutes";
import { CHART_COLORS } from "../chartVisualSystem";
import {
  buildRadarChartModel,
  useRadarChartModel,
  type RadarEntry,
  type RadarModel,
  type RadarStats,
  type RadarTraitKey,
} from "./useRadarChartModel";

type RadarComparisonSeries = {
  key?: string;
  label: string;
  stats: RadarStats;
  accentColor?: string | null;
};

type Props = {
  primary: RadarStats;
  comparison?: RadarStats;
  comparisons?: RadarComparisonSeries[];
  primaryLabel?: string;
  comparisonLabel?: string;
  title?: string;
  showHeader?: boolean;
};

type ComparisonSeriesModel = {
  key: string;
  label: string;
  badge: string;
  stroke: string;
  fill: string;
  dashArray?: string;
  model: RadarModel;
};

type ReportSection = {
  title: string;
  paragraphs: string[];
};

type ReportSectionIdentity = {
  badge: string;
  label: string;
};

const GRID_RATIOS = [0.25, 0.5, 0.75, 1] as const;
const COMPARISON_SERIES_PRESETS = [
  {
    stroke: "#94A3B8",
    fill: "rgba(148,163,184,0.08)",
    dashArray: "5 4",
  },
  {
    stroke: "#38BDF8",
    fill: "rgba(56,189,248,0.08)",
    dashArray: "10 4",
  },
  {
    stroke: "#F59E0B",
    fill: "rgba(245,158,11,0.08)",
    dashArray: "2 4",
  },
  {
    stroke: "#34D399",
    fill: "rgba(52,211,153,0.08)",
    dashArray: "12 3 2 3",
  },
] as const;

function withAlpha(hex: string, alpha: string) {
  if (!hex.startsWith("#")) return hex;
  return `${hex}${alpha}`;
}

function safeNum(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatPct(value: number) {
  return `${Math.round(safeNum(value) * 100)}%`;
}

function formatDeltaPoints(value: number) {
  return `${Math.round(Math.abs(safeNum(value)) * 100)} pts`;
}

function buildGridPolygon(
  points: Array<{ outerX: number; outerY: number }>,
  ratio: number,
  center: number,
) {
  const safePoints = points
    .map((point) => {
      const x = center + (safeNum(point.outerX, center) - center) * ratio;
      const y = center + (safeNum(point.outerY, center) - center) * ratio;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .filter(Boolean)
    .join(" ");

  return /NaN|Infinity|undefined|null/.test(safePoints) ? "" : safePoints;
}

function getComparisonAverage(entries: RadarEntry[]) {
  return entries.length > 0
    ? entries.reduce((sum, entry) => sum + safeNum(entry.comparisonValue), 0) / entries.length
    : 0;
}

function getTopPositiveEdge(entries: RadarEntry[]) {
  return (
    [...entries]
      .filter((entry) => safeNum(entry.delta) > 0.001)
      .sort((left, right) => right.delta - left.delta)[0] ?? null
  );
}

function getTopNegativeEdge(entries: RadarEntry[]) {
  return (
    [...entries]
      .filter((entry) => safeNum(entry.delta) < -0.001)
      .sort((left, right) => left.delta - right.delta)[0] ?? null
  );
}

function getComparisonTopTrait(entries: RadarEntry[]) {
  return [...entries].sort((left, right) => right.comparisonValue - left.comparisonValue)[0] ?? null;
}

function buildProfileSummaryLines(args: {
  averageStrength: number;
  primaryLabel: string;
  topTrait: RadarEntry | null;
  weakestTrait: RadarEntry | null;
}) {
  const { averageStrength, primaryLabel, topTrait, weakestTrait } = args;
  const lines: string[] = [];

  if (topTrait && weakestTrait && topTrait.key !== weakestTrait.key) {
    lines.push(
      `${primaryLabel} peaks in ${topTrait.label.toLowerCase()} at ${formatPct(
        topTrait.value,
      )} and stays lightest in ${weakestTrait.label.toLowerCase()} at ${formatPct(
        weakestTrait.value,
      )}.`,
    );
  } else if (topTrait) {
    lines.push(
      `${primaryLabel} peaks in ${topTrait.label.toLowerCase()} at ${formatPct(topTrait.value)}.`,
    );
  }

  lines.push(
    `Across all eight traits, ${primaryLabel} averages ${formatPct(
      averageStrength,
    )}, giving a quick read on how rounded the overall profile looks.`,
  );

  return lines.slice(0, 2);
}

function buildSingleComparisonSummaryLines(args: {
  primaryAverage: number;
  primaryLabel: string;
  series: ComparisonSeriesModel;
}) {
  const { primaryAverage, primaryLabel, series } = args;
  const entries = series.model.entries;
  const comparisonAverage = getComparisonAverage(entries);
  const topPositiveEdge = getTopPositiveEdge(entries);
  const topNegativeEdge = getTopNegativeEdge(entries);
  const comparisonTopTrait = getComparisonTopTrait(entries);
  const lines: string[] = [];

  if (topPositiveEdge && topNegativeEdge) {
    lines.push(
      `${primaryLabel} leads ${series.label} most in ${topPositiveEdge.label.toLowerCase()} (${formatDeltaPoints(
        topPositiveEdge.delta,
      )}), while ${series.label} pushes back hardest in ${topNegativeEdge.label.toLowerCase()} (${formatDeltaPoints(
        topNegativeEdge.delta,
      )}).`,
    );
  } else if (topPositiveEdge) {
    lines.push(
      `${primaryLabel}'s clearest edge over ${series.label} is ${topPositiveEdge.label.toLowerCase()} (${formatDeltaPoints(
        topPositiveEdge.delta,
      )}).`,
    );
  } else if (topNegativeEdge) {
    lines.push(
      `${series.label}'s clearest edge over ${primaryLabel} is ${topNegativeEdge.label.toLowerCase()} (${formatDeltaPoints(
        topNegativeEdge.delta,
      )}).`,
    );
  }

  lines.push(
    `Across all eight traits, ${primaryLabel} averages ${formatPct(
      primaryAverage,
    )} versus ${formatPct(comparisonAverage)} for ${series.label}, so the overall shape ${
      primaryAverage >= comparisonAverage
        ? "leans more complete on the focus-player side."
        : "leans more complete on the comparison side."
    }`,
  );

  if (comparisonTopTrait) {
    lines.push(
      `${series.label} profiles most around ${comparisonTopTrait.label.toLowerCase()}, which is the main lens that changes how this matchup reads.`,
    );
  }

  return lines.slice(0, 3);
}

function buildComparisonOverviewLines(args: {
  primaryAverage: number;
  primaryLabel: string;
  seriesModels: ComparisonSeriesModel[];
}) {
  const { primaryAverage, primaryLabel, seriesModels } = args;
  const averageGaps = seriesModels.map((series) => ({
    label: series.label,
    gap: primaryAverage - getComparisonAverage(series.model.entries),
  }));
  const sortedByGap = [...averageGaps].sort(
    (left, right) => Math.abs(right.gap) - Math.abs(left.gap),
  );
  const closest = [...averageGaps].sort(
    (left, right) => Math.abs(left.gap) - Math.abs(right.gap),
  )[0];
  const widest = sortedByGap[0];
  const consistentPositiveTraits = seriesModels[0]?.model.entries
    .filter((entry) =>
      seriesModels.every((series) => {
        const match = series.model.entries.find((candidate) => candidate.key === entry.key);
        return safeNum(match?.delta) >= 0;
      }),
    )
    .map((entry) => entry.label.toLowerCase()) ?? [];
  const consistentNegativeTraits = seriesModels[0]?.model.entries
    .filter((entry) =>
      seriesModels.every((series) => {
        const match = series.model.entries.find((candidate) => candidate.key === entry.key);
        return safeNum(match?.delta) <= 0;
      }),
    )
    .map((entry) => entry.label.toLowerCase()) ?? [];
  const swingTrait =
    seriesModels[0]?.model.entries
      .map((entry) => {
        const deltas = seriesModels
          .map((series) => {
            const match = series.model.entries.find((candidate) => candidate.key === entry.key);
            return safeNum(match?.delta);
          })
          .filter((delta) => Number.isFinite(delta));
        const max = deltas.length ? Math.max(...deltas) : 0;
        const min = deltas.length ? Math.min(...deltas) : 0;
        return {
          label: entry.label.toLowerCase(),
          spread: max - min,
        };
      })
      .sort((left, right) => right.spread - left.spread)[0] ?? null;

  const lines: string[] = [];
  if (closest && widest) {
    lines.push(
      `${primaryLabel} stays closest in overall trait average to ${closest.label}, but changes most sharply when measured against ${widest.label}.`,
    );
  }

  if (consistentPositiveTraits.length > 0) {
    lines.push(
      `The most stable through-lines stay on the focus-player side in ${consistentPositiveTraits
        .slice(0, 3)
        .join(", ")}, which suggests those strengths survive different tables and opponents.`,
    );
  }

  if (consistentNegativeTraits.length > 0) {
    lines.push(
      `The most repeated pressure points show up in ${consistentNegativeTraits
        .slice(0, 3)
        .join(", ")}, so those are the traits most likely to bend when the surrounding player pool changes.`,
    );
  }

  if (swingTrait) {
    lines.push(
      `${swingTrait.label[0].toUpperCase()}${swingTrait.label.slice(
        1,
      )} shifts the most across the selected comparisons, which makes it the clearest read on whether this profile is matchup-sensitive or stable.`,
    );
  }

  return lines.slice(0, 4);
}

function buildSummaryLines(args: {
  comparisonSeriesModels: ComparisonSeriesModel[];
  model: RadarModel;
  primaryAverage: number;
  primaryLabel: string;
}) {
  const { comparisonSeriesModels, model, primaryAverage, primaryLabel } = args;

  if (comparisonSeriesModels.length > 0) {
    if (comparisonSeriesModels.length === 1) {
      return buildSingleComparisonSummaryLines({
        primaryAverage,
        primaryLabel,
        series: comparisonSeriesModels[0],
      });
    }

    return buildComparisonOverviewLines({
      primaryAverage,
      primaryLabel,
      seriesModels: comparisonSeriesModels,
    });
  }

  return buildProfileSummaryLines({
    averageStrength: primaryAverage,
    primaryLabel,
    topTrait: model.summary.topTrait,
    weakestTrait: model.summary.weakestTrait,
  });
}

function buildDeepComparisonReport(args: {
  primaryAverage: number;
  primaryLabel: string;
  seriesModels: ComparisonSeriesModel[];
}) {
  const { primaryAverage, primaryLabel, seriesModels } = args;
  if (seriesModels.length <= 1) {
    return [] as ReportSection[];
  }

  const overviewParagraphs = [
    buildComparisonOverviewLines({
      primaryAverage,
      primaryLabel,
      seriesModels,
    }).join(" "),
    `${primaryLabel} is being compared through ${seriesModels.length} different player lenses, so this report is less about who is simply stronger and more about which traits keep their shape, which traits bend, and which traits only show up under certain matchup conditions.`,
  ].filter(Boolean);

  const comparisonSections = seriesModels.map((series) => {
    const lines = buildSingleComparisonSummaryLines({
      primaryAverage,
      primaryLabel,
      series,
    });
    const comparisonAverage = getComparisonAverage(series.model.entries);
    const topPositiveEdge = getTopPositiveEdge(series.model.entries);
    const topNegativeEdge = getTopNegativeEdge(series.model.entries);

    return {
      title: `${series.badge}. ${series.label}`,
      paragraphs: [
        lines.join(" "),
        `${series.label} changes the matchup read by pulling the focus player ${
          primaryAverage >= comparisonAverage ? "toward preservation" : "toward adaptation"
        } overall, but the real story sits in ${
          topPositiveEdge?.label?.toLowerCase() ?? "the highest edge"
        } versus ${
          topNegativeEdge?.label?.toLowerCase() ?? "the main response trait"
        }, which is where the profile either holds its identity or starts to flex.`,
      ],
    };
  });

  const consistencySection: ReportSection = {
    title: "Consistency Outlook",
    paragraphs: [
      `When the same strengths keep appearing across different compare players, that points to a stable playstyle rather than a table-specific illusion. When the leading and trailing traits keep swapping as the comparison set changes, the profile is still coherent, but it is more context-dependent and should be read as adaptive rather than fixed.`,
      `${primaryLabel}'s consistency here should be read from the repeated themes first and the largest outlier second. If the same trait edges keep surviving, the focus player's style is portable. If only one or two comparisons create the big swings, those are matchup triggers rather than a full identity rewrite.`,
    ],
  };

  return [
    {
      title: "Overview",
      paragraphs: overviewParagraphs,
    },
    ...comparisonSections,
    consistencySection,
  ];
}

function getReportSectionIdentity(title: string): ReportSectionIdentity | null {
  const match = title.match(/^(P\d+)\.\s+(.+)$/);
  if (!match) return null;

  return {
    badge: match[1],
    label: match[2],
  };
}

function getReportSectionSubtitle(args: {
  identity: ReportSectionIdentity | null;
  primaryLabel: string;
  title: string;
}) {
  const { identity, primaryLabel, title } = args;

  if (identity) {
    return `How ${identity.label} changes the read on ${primaryLabel}`;
  }

  if (title === "Overview") {
    return `Cross-matchup read on ${primaryLabel}`;
  }

  if (title === "Consistency Outlook") {
    return "Portable strengths versus matchup triggers";
  }

  return "";
}

function ReportParagraphPanels({
  paragraphs,
  sectionTitle,
}: {
  paragraphs: string[];
  sectionTitle: string;
}) {
  return (
    <View style={styles.reportParagraphStack}>
      {paragraphs.map((paragraph, index) => (
        <View key={`${sectionTitle}-${index}`} style={styles.reportParagraphPanel}>
          <BulletRows
            keyPrefix={`${sectionTitle}-${index}`}
            lines={[paragraph]}
            stackStyle={styles.reportBulletStack}
            rowStyle={styles.reportBulletRow}
            dotStyle={styles.reportBulletDot}
            textStyle={styles.reportParagraph}
          />
        </View>
      ))}
    </View>
  );
}

function BulletRows({
  dotStyle,
  keyPrefix,
  lines,
  rowStyle,
  stackStyle,
  textStyle,
}: {
  dotStyle?: StyleProp<ViewStyle>;
  keyPrefix: string;
  lines: string[];
  rowStyle?: StyleProp<ViewStyle>;
  stackStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={[styles.summaryBulletStack, stackStyle]}>
      {lines.map((line, index) => (
        <View key={`${keyPrefix}-${index}`} style={[styles.summaryBulletRow, rowStyle]}>
          <View style={[styles.summaryBulletDot, dotStyle]} />
          <Text style={[styles.summaryLine, textStyle]}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

function SummaryBulletRows({
  keyPrefix,
  lines,
}: {
  keyPrefix: string;
  lines: string[];
}) {
  return <BulletRows keyPrefix={keyPrefix} lines={lines} />;
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

export default function RadarChart({
  primary,
  comparison,
  comparisons,
  primaryLabel = "Primary",
  comparisonLabel = "Comparison",
  title = "Player Radar",
  showHeader = true,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const normalizedComparisons = useMemo(() => {
    if (comparisons?.length) {
      return comparisons.slice(0, 4);
    }

    if (comparison) {
      return [
        {
          key: "comparison-1",
          label: comparisonLabel,
          stats: comparison,
        },
      ];
    }

    return [] as RadarComparisonSeries[];
  }, [comparison, comparisonLabel, comparisons]);

  const model = useRadarChartModel(primary, undefined, 280);
  const [focusedKey, setFocusedKey] = useState<RadarTraitKey | null>(null);
  const focused = useMemo(
    () => model.entries.find((entry) => entry.key === focusedKey) ?? model.summary.topTrait,
    [focusedKey, model.entries, model.summary.topTrait],
  );
  const comparisonSeriesModels = useMemo<ComparisonSeriesModel[]>(
    () =>
      normalizedComparisons.map((series, index) => {
        const preset = COMPARISON_SERIES_PRESETS[index] ?? COMPARISON_SERIES_PRESETS[0];
        return {
          key: series.key ?? `comparison-${index + 1}`,
          label: series.label,
          badge: `P${index + 1}`,
          stroke: preset.stroke,
          fill: preset.fill,
          dashArray: preset.dashArray,
          model: buildRadarChartModel(primary, series.stats, 280),
        };
      }),
    [normalizedComparisons, primary],
  );

  const primaryAverage = safeNum(model.summary.averageStrength);
  const summaryLines = buildSummaryLines({
    comparisonSeriesModels,
    model,
    primaryAverage,
    primaryLabel,
  });
  const deepReportSections = buildDeepComparisonReport({
    primaryAverage,
    primaryLabel,
    seriesModels: comparisonSeriesModels,
  });
  const overviewReportSection =
    deepReportSections.find((section) => section.title === "Overview") ?? null;
  const consistencyReportSection =
    deepReportSections.find((section) => section.title === "Consistency Outlook") ?? null;
  const comparisonReportSections = deepReportSections.filter(
    (section) => section.title !== "Overview" && section.title !== "Consistency Outlook",
  );

  const heroSeriesEntry = useMemo(() => {
    if (!comparisonSeriesModels.length) {
      return null;
    }

    return comparisonSeriesModels
      .flatMap((series) =>
        series.model.entries.map((entry) => ({
          series,
          entry,
        })),
      )
      .sort(
        (left, right) =>
          Math.abs(safeNum(right.entry.delta)) - Math.abs(safeNum(left.entry.delta)),
      )[0] ?? null;
  }, [comparisonSeriesModels]);

  const heroEntry = heroSeriesEntry?.entry ?? model.summary.topTrait ?? focused;
  const heroAccent = heroSeriesEntry?.series.stroke ?? CHART_COLORS.accent;
  const validPrimaryPath = typeof model.primaryPath === "string" && model.primaryPath.length > 0;
  const comparisonCount = comparisonSeriesModels.length;
  const definitionSourceLabel = resolveDefinitionSourceLabel(pathname);

  return (
    <View style={styles.wrap}>
      {showHeader ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {comparisonCount > 1
              ? `${primaryLabel} against ${comparisonCount} comparison players across the full trait profile.`
              : comparisonCount === 1
                ? `${primaryLabel} vs ${comparisonSeriesModels[0]?.label ?? comparisonLabel} across the full trait profile.`
                : `${primaryLabel}'s current trait profile.`}
          </Text>
        </View>
      ) : null}

      {heroEntry ? (
        <ChartFocusCard
          title={heroEntry.label}
          value={
            comparisonCount > 0
              ? `${safeNum(heroEntry.delta) > 0 ? "+" : ""}${Math.round(
                  safeNum(heroEntry.delta) * 100,
                )} pts`
              : formatPct(heroEntry.value)
          }
          helper={
            comparisonCount > 1
              ? "Largest matchup swing"
              : comparisonCount === 1
                ? "Largest edge"
                : "Strongest trait"
          }
          story={
            comparisonCount > 0 && heroSeriesEntry
              ? `Against ${heroSeriesEntry.series.label}, ${heroEntry.meaning}`
              : heroEntry.meaning
          }
          tone="comparison"
          accentColor={heroAccent}
          compact
        />
      ) : null}

      <ChartStage
        tone="comparison"
        style={styles.chartStage}
        plotStyle={styles.chartStagePlot}
        header={
          <SectionHeader
            title="Traits"
            sub={
              comparisonCount > 1
                ? `${primaryLabel} vs ${comparisonCount} compares`
                : comparisonCount === 1
                  ? `${primaryLabel} vs ${comparisonSeriesModels[0]?.label ?? comparisonLabel}`
                  : primaryLabel
            }
          />
        }
        footer={
          <Text style={styles.stageFooter}>
            Avg {formatPct(primaryAverage)}
            {comparisonCount > 0 ? ` | ${comparisonCount} compare${comparisonCount === 1 ? "" : "s"}` : ""}
          </Text>
        }
      >
        <View style={styles.legendWrap}>
          <View style={styles.legendItem}>
            <View style={styles.legendPrimarySwatch} />
            <Text style={styles.legendText}>{primaryLabel}</Text>
          </View>
          {comparisonSeriesModels.map((series) => (
            <View key={series.key} style={styles.legendItem}>
              <View
                style={[
                  styles.legendBadge,
                  { borderColor: withAlpha(series.stroke, "88"), backgroundColor: withAlpha(series.stroke, "22") },
                ]}
              >
                <Text style={[styles.legendBadgeText, { color: series.stroke }]}>{series.badge}</Text>
              </View>
              <View
                style={[
                  styles.legendComparisonSwatch,
                  {
                    borderColor: series.stroke,
                    backgroundColor: withAlpha(series.stroke, "12"),
                  },
                ]}
              />
              <Text style={styles.legendText}>{series.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.chartShell}>
          <Svg width={model.metrics.size} height={model.metrics.size}>
            {GRID_RATIOS.map((ratio) => {
              const polygonPoints = buildGridPolygon(model.points, ratio, model.metrics.center);
              if (!polygonPoints) return null;
              return (
                <Polygon
                  key={`grid-${ratio}`}
                  points={polygonPoints}
                  fill="none"
                  stroke={withAlpha("#ffffff", ratio === 1 ? "20" : "10")}
                  strokeWidth={1}
                />
              );
            })}

            {model.points.map((point) => {
              const active = point.key === focused?.key;
              const labelX = safeNum(point.outerX) + Math.cos(point.angle) * 16;
              const labelY = safeNum(point.outerY) + Math.sin(point.angle) * 16;

              return (
                <React.Fragment key={point.key}>
                  <Line
                    x1={model.metrics.center}
                    y1={model.metrics.center}
                    x2={safeNum(point.outerX, model.metrics.center)}
                    y2={safeNum(point.outerY, model.metrics.center)}
                    stroke={active ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.12)"}
                    strokeWidth={active ? 1.6 : 1}
                  />
                  <SvgText
                    x={safeNum(labelX, model.metrics.center)}
                    y={safeNum(labelY, model.metrics.center)}
                    fill={active ? "#F8FAFC" : "#94A3B8"}
                    fontSize="10"
                    fontWeight={active ? "700" : "600"}
                    textAnchor={
                      Math.abs(labelX - model.metrics.center) < 8
                        ? "middle"
                        : labelX < model.metrics.center
                          ? "end"
                          : "start"
                    }
                  >
                    {point.shortLabel}
                  </SvgText>
                </React.Fragment>
              );
            })}

            {comparisonSeriesModels.map((series) =>
              series.model.comparisonPath ? (
                <Path
                  key={`${series.key}-path-fill`}
                  d={series.model.comparisonPath}
                  fill={series.fill}
                  stroke={series.stroke}
                  strokeWidth={1.7}
                  strokeDasharray={series.dashArray}
                />
              ) : null,
            )}

            {validPrimaryPath ? (
              <>
                <Path
                  d={model.primaryPath}
                  fill="rgba(139,92,246,0.16)"
                  stroke="rgba(139,92,246,0.24)"
                  strokeWidth={7}
                />
                <Path
                  d={model.primaryPath}
                  fill="rgba(139,92,246,0.22)"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                />
              </>
            ) : null}

            {comparisonSeriesModels.map((series) =>
              series.model.points.map((point) => (
                <Circle
                  key={`${series.key}-${point.key}-cmp`}
                  cx={safeNum(point.comparisonX, model.metrics.center)}
                  cy={safeNum(point.comparisonY, model.metrics.center)}
                  r={point.key === focused?.key ? 4 : 3}
                  fill={series.stroke}
                  stroke="#F8FAFC"
                  strokeWidth={point.key === focused?.key ? 1.2 : 0.8}
                />
              )),
            )}

            {model.points.map((point) => {
              const active = point.key === focused?.key;
              return (
                <React.Fragment key={`${point.key}-primary`}>
                  {active ? (
                    <Circle
                      cx={safeNum(point.valueX, model.metrics.center)}
                      cy={safeNum(point.valueY, model.metrics.center)}
                      r={10}
                      fill="rgba(168,85,247,0.14)"
                      stroke="rgba(255,255,255,0.22)"
                      strokeWidth={1}
                    />
                  ) : null}
                  <Circle
                    cx={safeNum(point.valueX, model.metrics.center)}
                    cy={safeNum(point.valueY, model.metrics.center)}
                    r={active ? 5 : 3.5}
                    fill="#8B5CF6"
                    stroke="#F8FAFC"
                    strokeWidth={active ? 1.4 : 0.9}
                    onPress={() => setFocusedKey(point.key)}
                  />
                </React.Fragment>
              );
            })}
          </Svg>
        </View>
      </ChartStage>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>
          {comparisonCount > 0 ? "Comparison Summary" : "Profile Summary"}
        </Text>
        <SummaryBulletRows keyPrefix="summary" lines={summaryLines} />
      </View>

      {comparisonSeriesModels.length > 0 ? (
        <View style={styles.comparisonStack}>
          {comparisonSeriesModels.map((series) => {
            const summaryForSeries = buildSingleComparisonSummaryLines({
              primaryAverage,
              primaryLabel,
              series,
            });

            return (
              <View key={series.key} style={styles.comparisonCard}>
                <View style={styles.comparisonHeader}>
                  <View
                    style={[
                      styles.legendBadge,
                      {
                        borderColor: withAlpha(series.stroke, "88"),
                        backgroundColor: withAlpha(series.stroke, "22"),
                      },
                    ]}
                  >
                    <Text style={[styles.legendBadgeText, { color: series.stroke }]}>
                      {series.badge}
                    </Text>
                  </View>
                  <View style={styles.comparisonHeaderCopy}>
                    <Text style={styles.comparisonTitle}>{series.label}</Text>
                    <Text style={styles.comparisonSubtitle}>
                      Trait-by-trait pressure on {primaryLabel}
                    </Text>
                  </View>
                </View>

                <SummaryBulletRows keyPrefix={series.key} lines={summaryForSeries} />

                <View style={styles.traitGrid}>
                  {series.model.entries.map((entry) => {
                    const active = entry.key === focused?.key;
                    const delta = safeNum(entry.delta);

                    return (
                      <View
                        key={`${series.key}-${entry.key}`}
                        style={[
                          styles.traitCard,
                          active ? styles.traitCardActive : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.traitLabel,
                            active ? styles.definitionLabelActive : null,
                          ]}
                        >
                          {entry.label}
                        </Text>
                        <Text style={styles.traitStat}>
                          {primaryLabel}: {formatPct(entry.value)}
                        </Text>
                        <Text style={styles.traitStat}>
                          {series.label}: {formatPct(entry.comparisonValue)}
                        </Text>
                        <Text
                          style={[
                            styles.traitDelta,
                            { color: delta >= 0 ? CHART_COLORS.accent : series.stroke },
                          ]}
                        >
                          {delta >= 0 ? "+" : "-"}
                          {formatDeltaPoints(delta)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {deepReportSections.length > 0 ? (
        <View style={styles.deepReportStack}>
          <View style={styles.deepReportIntroCard}>
            <Text style={styles.definitionTitle}>Deep Comparison Report</Text>
            <Text style={styles.definitionSubtitle}>
              A longer read on which traits stay portable and which ones shift across the selected comparison players.
            </Text>
          </View>

          {overviewReportSection ? (
            <View style={styles.deepReportSectionCard}>
              <View style={styles.reportSectionHeader}>
                <View style={styles.reportSectionHeaderCopy}>
                  <Text style={styles.reportSectionTitle}>{overviewReportSection.title}</Text>
                  <Text style={styles.reportSectionSubtitle}>
                    {getReportSectionSubtitle({
                      identity: null,
                      primaryLabel,
                      title: overviewReportSection.title,
                    })}
                  </Text>
                </View>
              </View>
              <ReportParagraphPanels
                paragraphs={overviewReportSection.paragraphs}
                sectionTitle={overviewReportSection.title}
              />
            </View>
          ) : null}

          {comparisonReportSections.map((section) => {
            const identity = getReportSectionIdentity(section.title);

            return (
              <View key={section.title} style={styles.deepReportSectionCard}>
                <View style={styles.reportSectionHeader}>
                  {identity ? (
                    <View style={styles.reportSectionBadge}>
                      <Text style={styles.reportSectionBadgeText}>{identity.badge}</Text>
                    </View>
                  ) : null}
                  <View style={styles.reportSectionHeaderCopy}>
                    <Text style={styles.reportSectionTitle}>
                      {identity?.label ?? section.title}
                    </Text>
                    <Text style={styles.reportSectionSubtitle}>
                      {getReportSectionSubtitle({
                        identity,
                        primaryLabel,
                        title: section.title,
                    })}
                    </Text>
                  </View>
                </View>
                <ReportParagraphPanels
                  paragraphs={section.paragraphs}
                  sectionTitle={section.title}
                />
              </View>
            );
          })}

          {consistencyReportSection ? (
            <View style={styles.deepReportSectionCard}>
              <View style={styles.reportSectionHeader}>
                <View style={styles.reportSectionHeaderCopy}>
                  <Text style={styles.reportSectionTitle}>{consistencyReportSection.title}</Text>
                  <Text style={styles.reportSectionSubtitle}>
                    {getReportSectionSubtitle({
                      identity: null,
                      primaryLabel,
                      title: consistencyReportSection.title,
                    })}
                  </Text>
                </View>
              </View>
              <ReportParagraphPanels
                paragraphs={consistencyReportSection.paragraphs}
                sectionTitle={consistencyReportSection.title}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.definitionCard}>
        <Text style={styles.definitionTitle}>Trait Definitions</Text>
        <Text style={styles.definitionSubtitle}>
          Tap a point to highlight its matching axis definition, or tap a row to open the full glossary term.
        </Text>
        <View style={styles.definitionList}>
          {model.entries.map((entry) => {
            const active = entry.key === focused?.key;
            return (
              <Pressable
                key={entry.key}
                accessibilityRole="button"
                accessibilityLabel={`Open glossary term for ${entry.label}`}
                onPress={() =>
                  router.push(
                    buildDefinitionsRoute({
                      metric: entry.key,
                      sourceLabel: definitionSourceLabel,
                    }),
                  )
                }
                style={({ pressed }) => [
                  styles.definitionItem,
                  active ? styles.definitionItemActive : null,
                  pressed ? styles.definitionItemPressed : null,
                ]}
              >
                <Text style={[styles.definitionLabel, active ? styles.definitionLabelActive : null]}>
                  {entry.label}
                </Text>
                <Text style={styles.definitionBody}>{entry.meaning}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  header: {
    gap: 2,
  },
  title: {
    color: CHART_COLORS.textStrong,
    fontSize: 16,
    fontWeight: "900",
  },
  subtitle: {
    color: CHART_COLORS.sub,
    fontSize: 10,
    lineHeight: 14,
  },
  chartStage: {
    marginBottom: 6,
  },
  chartStagePlot: {
    paddingVertical: 10,
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
  },
  sectionTitle: {
    color: CHART_COLORS.textStrong,
    fontSize: 15,
    fontWeight: "800",
    flexShrink: 1,
  },
  sectionSub: {
    color: CHART_COLORS.sub,
    fontSize: 10,
    textAlign: "right",
    flexShrink: 1,
  },
  legendWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CHART_COLORS.border,
    backgroundColor: CHART_COLORS.cardAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  legendPrimarySwatch: {
    width: 18,
    height: 6,
    borderRadius: 999,
    backgroundColor: CHART_COLORS.accent,
  },
  legendComparisonSwatch: {
    width: 18,
    height: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  legendText: {
    color: CHART_COLORS.text,
    fontSize: 11,
    fontWeight: "700",
  },
  legendBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  legendBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  chartShell: {
    alignItems: "center",
  },
  stageFooter: {
    color: CHART_COLORS.sub,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  summaryCard: {
    gap: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CHART_COLORS.borderStrong,
    backgroundColor: CHART_COLORS.cardAlt,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summaryTitle: {
    color: CHART_COLORS.textStrong,
    fontSize: 14,
    fontWeight: "800",
  },
  summaryBulletStack: {
    gap: 8,
  },
  summaryBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  summaryBulletDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: CHART_COLORS.accent,
    marginTop: 6,
    flexShrink: 0,
  },
  summaryLine: {
    flex: 1,
    color: CHART_COLORS.text,
    fontSize: 12,
    lineHeight: 18,
  },
  comparisonStack: {
    gap: 10,
  },
  comparisonCard: {
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CHART_COLORS.borderStrong,
    backgroundColor: CHART_COLORS.cardAlt,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  comparisonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  comparisonHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  comparisonTitle: {
    color: CHART_COLORS.textStrong,
    fontSize: 14,
    fontWeight: "800",
  },
  comparisonSubtitle: {
    color: CHART_COLORS.sub,
    fontSize: 11,
    lineHeight: 16,
  },
  traitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  traitCard: {
    width: "48%",
    gap: 3,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CHART_COLORS.border,
    backgroundColor: "rgba(8,16,34,0.72)",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  traitCardActive: {
    borderColor: "rgba(168,85,247,0.42)",
    backgroundColor: "rgba(168,85,247,0.10)",
  },
  traitLabel: {
    color: CHART_COLORS.textStrong,
    fontSize: 11,
    fontWeight: "800",
  },
  traitStat: {
    color: CHART_COLORS.sub,
    fontSize: 10,
    lineHeight: 14,
  },
  traitDelta: {
    fontSize: 10,
    fontWeight: "800",
  },
  deepReportStack: {
    gap: 10,
  },
  deepReportIntroCard: {
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CHART_COLORS.borderStrong,
    backgroundColor: CHART_COLORS.cardAlt,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  deepReportSectionCard: {
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CHART_COLORS.borderStrong,
    backgroundColor: CHART_COLORS.cardAlt,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  reportSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reportSectionBadge: {
    minWidth: 34,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CHART_COLORS.border,
    backgroundColor: "rgba(148,163,184,0.12)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  reportSectionBadgeText: {
    color: CHART_COLORS.textStrong,
    fontSize: 11,
    fontWeight: "900",
  },
  reportSectionHeaderCopy: {
    flex: 1,
    gap: 3,
  },
  reportSectionTitle: {
    color: CHART_COLORS.textStrong,
    fontSize: 14,
    fontWeight: "800",
  },
  reportSectionSubtitle: {
    color: CHART_COLORS.sub,
    fontSize: 11,
    lineHeight: 17,
  },
  reportParagraphStack: {
    gap: 10,
  },
  reportParagraphPanel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CHART_COLORS.border,
    backgroundColor: "rgba(8,16,34,0.56)",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  reportParagraph: {
    flex: 1,
    color: CHART_COLORS.text,
    fontSize: 12,
    lineHeight: 20,
  },
  reportBulletStack: {
    gap: 0,
  },
  reportBulletRow: {
    gap: 12,
  },
  reportBulletDot: {
    width: 7,
    height: 7,
    marginTop: 7,
    backgroundColor: "rgba(103,232,249,0.82)",
  },
  definitionCard: {
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CHART_COLORS.border,
    backgroundColor: CHART_COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  definitionTitle: {
    color: CHART_COLORS.textStrong,
    fontSize: 14,
    fontWeight: "800",
  },
  definitionSubtitle: {
    color: CHART_COLORS.sub,
    fontSize: 11,
    lineHeight: 16,
  },
  definitionList: {
    gap: 8,
  },
  definitionItem: {
    gap: 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CHART_COLORS.border,
    backgroundColor: "rgba(8,16,34,0.72)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  definitionItemActive: {
    borderColor: "rgba(168,85,247,0.42)",
    backgroundColor: "rgba(168,85,247,0.12)",
  },
  definitionItemPressed: {
    opacity: 0.84,
  },
  definitionLabel: {
    color: CHART_COLORS.textStrong,
    fontSize: 12,
    fontWeight: "800",
  },
  definitionLabelActive: {
    color: CHART_COLORS.accent,
  },
  definitionBody: {
    color: CHART_COLORS.sub,
    fontSize: 11,
    lineHeight: 16,
  },
});
