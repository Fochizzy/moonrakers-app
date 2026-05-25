import { chartColors, withAlpha } from "@/utils/chartTheme";

export type ChartTone =
  | "neutral"
  | "accent"
  | "blue"
  | "green"
  | "danger"
  | "warning";

export type ChartStageTone = "standard" | "comparison" | "compact";

export type ChartStagePreset = {
  shellFill: string;
  shellBorder: string;
  plotFill: string;
  plotBorder: string;
  beamFill: string;
  beamStroke: string;
  glowColor: string;
  inactiveOpacity: number;
  focusCardFill: string;
  focusCardBorder: string;
};

export const CHART_COLORS = {
  bg: "#081120",
  card: "rgba(12,18,38,0.92)",
  cardAlt: "rgba(16,24,48,0.95)",
  panel: "rgba(16,24,48,0.95)",
  panelStrong: chartColors.panelBgStrong,
  text: "#E2E8F0",
  textStrong: "#F8FAFC",
  wrap: "#E2E8F0",
  sub: "#94A3B8",
  muted: "#64748B",
  accent: "#A855F7",
  accentSoft: "rgba(168,85,247,0.18)",
  blue: "#3B82F6",
  blueSoft: "rgba(59,130,246,0.18)",
  green: "#22C55E",
  greenSoft: "rgba(34,197,94,0.16)",
  danger: "#F87171",
  dangerSoft: "rgba(248,113,113,0.14)",
  red: "#EF4444",
  redSoft: "rgba(239,68,68,0.16)",
  warning: "#F59E0B",
  warningSoft: "rgba(245,158,11,0.18)",
  gold: "#FBBF24",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.16)",
  grid: "rgba(255,255,255,0.06)",
  whiteSoft: "rgba(255,255,255,0.06)",
  backgroundDim: "rgba(5,10,22,0.70)",
} as const;

export const CHART_LAYOUT = {
  screenPadding: 14,
  sectionGap: 10,
  cardGap: 8,
  sectionRadius: 18,
  cardRadius: 16,
  chipRadius: 999,
} as const;

export const CHART_STAGE_PRESETS: Record<ChartStageTone, ChartStagePreset> = {
  standard: {
    shellFill: CHART_COLORS.cardAlt,
    shellBorder: CHART_COLORS.border,
    plotFill: "rgba(10,18,38,0.9)",
    plotBorder: withAlpha("#FFFFFF", 0.06),
    beamFill: withAlpha(CHART_COLORS.accent, 0.16),
    beamStroke: withAlpha(CHART_COLORS.accent, 0.32),
    glowColor: withAlpha(CHART_COLORS.accent, 0.28),
    inactiveOpacity: 0.34,
    focusCardFill: withAlpha(CHART_COLORS.accent, 0.08),
    focusCardBorder: withAlpha(CHART_COLORS.accent, 0.34),
  },
  comparison: {
    shellFill: CHART_COLORS.cardAlt,
    shellBorder: CHART_COLORS.borderStrong,
    plotFill: "rgba(8,16,34,0.94)",
    plotBorder: withAlpha("#FFFFFF", 0.08),
    beamFill: withAlpha(CHART_COLORS.blue, 0.16),
    beamStroke: withAlpha(CHART_COLORS.blue, 0.32),
    glowColor: withAlpha(CHART_COLORS.blue, 0.24),
    inactiveOpacity: 0.3,
    focusCardFill: withAlpha(CHART_COLORS.blue, 0.08),
    focusCardBorder: withAlpha(CHART_COLORS.blue, 0.3),
  },
  compact: {
    shellFill: CHART_COLORS.card,
    shellBorder: CHART_COLORS.border,
    plotFill: "rgba(10,18,34,0.88)",
    plotBorder: withAlpha("#FFFFFF", 0.04),
    beamFill: withAlpha(CHART_COLORS.accent, 0.12),
    beamStroke: withAlpha(CHART_COLORS.accent, 0.24),
    glowColor: withAlpha(CHART_COLORS.accent, 0.2),
    inactiveOpacity: 0.26,
    focusCardFill: withAlpha(CHART_COLORS.cardAlt, 0.96),
    focusCardBorder: CHART_COLORS.border,
  },
} as const;

export function getChartStagePreset(tone: ChartStageTone = "standard") {
  return CHART_STAGE_PRESETS[tone] ?? CHART_STAGE_PRESETS.standard;
}

export function getChartToneStyles(tone: ChartTone = "neutral") {
  switch (tone) {
    case "accent":
      return { bg: CHART_COLORS.accentSoft, value: CHART_COLORS.accent };
    case "blue":
      return { bg: CHART_COLORS.blueSoft, value: CHART_COLORS.blue };
    case "green":
      return { bg: CHART_COLORS.greenSoft, value: CHART_COLORS.green };
    case "danger":
      return { bg: CHART_COLORS.dangerSoft, value: CHART_COLORS.danger };
    case "warning":
      return { bg: CHART_COLORS.warningSoft, value: CHART_COLORS.warning };
    case "neutral":
    default:
      return { bg: CHART_COLORS.whiteSoft, value: CHART_COLORS.textStrong };
  }
}

export function getChartCardBackground(
  variant: "default" | "alt" | "highlight" = "default"
) {
  switch (variant) {
    case "alt":
      return CHART_COLORS.cardAlt;
    case "highlight":
      return withAlpha(CHART_COLORS.accent, 0.12);
    case "default":
    default:
      return CHART_COLORS.card;
  }
}

export function getChartCardBorder(
  tone: ChartTone = "neutral",
  emphasized = false
) {
  if (!emphasized || tone === "neutral") return CHART_COLORS.border;
  return withAlpha(getChartToneStyles(tone).value, 0.42);
}

export function getQuietChipStyle(tone: ChartTone = "neutral") {
  const resolved = getChartToneStyles(tone);
  return {
    backgroundColor: withAlpha(resolved.value, tone === "neutral" ? 0.08 : 0.14),
    borderColor: withAlpha(resolved.value, tone === "neutral" ? 0.14 : 0.26),
    textColor: tone === "neutral" ? CHART_COLORS.sub : resolved.value,
  };
}

export { withAlpha as withChartAlpha };
