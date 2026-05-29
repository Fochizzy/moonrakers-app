import React from "react";
import { G, Rect, Text as SvgText } from "react-native-svg";

import { CHART_COLORS, withChartAlpha } from "./chartVisualSystem";

type Props = {
  x: number;
  y: number;
  color: string;
  label?: string | null;
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
};

const BADGE_HEIGHT = 18;
const BADGE_PADDING_X = 6;
const BADGE_GAP = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function SeriesIdentitySvgBadge({
  x,
  y,
  color,
  label,
  minX = Number.NEGATIVE_INFINITY,
  maxX = Number.POSITIVE_INFINITY,
  minY = Number.NEGATIVE_INFINITY,
  maxY = Number.POSITIVE_INFINITY,
}: Props) {
  if (!label) {
    return null;
  }

  const width = Math.max(24, label.length * 7 + BADGE_PADDING_X * 2);
  const left = clamp(x - width - BADGE_GAP, minX, Math.max(minX, maxX - width));
  const top = clamp(y - BADGE_HEIGHT / 2, minY, Math.max(minY, maxY - BADGE_HEIGHT));

  return (
    <G>
      <Rect
        x={left}
        y={top}
        width={width}
        height={BADGE_HEIGHT}
        rx={BADGE_HEIGHT / 2}
        fill={withChartAlpha(CHART_COLORS.card, 0.94)}
        stroke={withChartAlpha(color, 0.55)}
        strokeWidth={1}
      />
      <SvgText
        x={left + width / 2}
        y={top + 12}
        fill={CHART_COLORS.textStrong}
        fontSize="9"
        fontWeight="800"
        textAnchor="middle"
      >
        {label}
      </SvgText>
    </G>
  );
}
