import React, { memo } from 'react';
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Polygon,
  Text as SvgText,
} from 'react-native-svg';

import { chartColors, withAlpha } from '@/utils/chartTheme';

export type RadarPoint = {
  key: string;
  label: string;
  shortLabel?: string;
  value: number;
  comparisonValue?: number;
  angle: number;
  outerX: number;
  outerY: number;
  comparisonX?: number;
  comparisonY?: number;
};

export type RadarTraitKey = string;

export type ChartMetrics = {
  size: number;
  center: number;
  radius: number;
  hitBoxSize: number;
};

export const GRID_RATIOS = [0.25, 0.5, 0.75, 1] as const;

export function getLabelAnchor(point: RadarPoint, center: number) {
  if (Math.abs(point.outerX - center) < 8) return 'middle';
  return point.outerX < center ? 'end' : 'start';
}

export function getLabelPosition(point: RadarPoint, _metrics: ChartMetrics) {
  const pad = 14;
  const x = point.outerX + Math.cos(point.angle) * pad;
  const y = point.outerY + Math.sin(point.angle) * pad;
  return { x, y };
}

function formatPercent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(value, 1)) * 100)}%`;
}

function buildGridPolygon(points: RadarPoint[], ratio: number, center: number): string {
  return points
    .map((point) => {
      const x = center + (point.outerX - center) * ratio;
      const y = center + (point.outerY - center) * ratio;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

type Props = {
  points: RadarPoint[];
  metrics: ChartMetrics;
  primaryPath: string;
  comparisonPath: string;
  compact: boolean;
  showComparisonOverlay: boolean;
  highlightAxis: boolean;
  focusedKey: RadarTraitKey | null;
  averageStrength: number;
  onSelect: (key: RadarTraitKey) => void;
};

function RadarChartSvgComponent({
  points,
  metrics,
  primaryPath,
  comparisonPath,
  compact,
  showComparisonOverlay,
  highlightAxis,
  focusedKey,
  averageStrength,
  onSelect,
}: Props) {
  return (
    <Svg
      width={metrics.size}
      height={metrics.size}
      style={{ alignSelf: 'center' }}
      accessibilityLabel="Radar chart showing archetype trait strengths"
    >
      <G>
        {GRID_RATIOS.map((ratio) => (
          <Polygon
            key={`grid-${ratio}`}
            points={buildGridPolygon(points, ratio, metrics.center)}
            fill="none"
            stroke={withAlpha('#ffffff', ratio === 1 ? 0.14 : 0.1)}
            strokeWidth={1}
          />
        ))}

        {GRID_RATIOS.map((ratio) => (
          <SvgText
            key={`tick-${ratio}`}
            x={metrics.center}
            y={metrics.center - metrics.radius * ratio + 11}
            fill={chartColors.muted}
            fontSize="9"
            textAnchor="middle"
          >
            {formatPercent(ratio)}
          </SvgText>
        ))}

        {points.map((point) => {
          const isSelected = point.key === focusedKey;
          const { x, y } = getLabelPosition(point, metrics);

          return (
            <React.Fragment key={point.key}>
              <Line
                x1={metrics.center}
                y1={metrics.center}
                x2={point.outerX}
                y2={point.outerY}
                stroke={
                  highlightAxis && isSelected
                    ? withAlpha('#ffffff', 0.28)
                    : withAlpha('#ffffff', 0.12)
                }
                strokeWidth={highlightAxis && isSelected ? 1.6 : 1}
              />

              <SvgText
                x={x}
                y={y}
                fill={isSelected ? chartColors.text : chartColors.subtext}
                fontSize="10"
                fontWeight={isSelected ? '700' : '600'}
                textAnchor={getLabelAnchor(point, metrics.center)}
                onPress={() => onSelect(point.key)}
              >
                {compact ? point.shortLabel ?? point.label : point.label}
              </SvgText>
            </React.Fragment>
          );
        })}

        {showComparisonOverlay ? (
          <Path
            d={comparisonPath}
            fill={withAlpha('#94a3b8', 0.08)}
            stroke={withAlpha('#94a3b8', 0.9)}
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
        ) : null}

        <Path
          d={primaryPath}
          fill={withAlpha(chartColors.purple, 0.22)}
          stroke={chartColors.purple}
          strokeWidth={2.25}
        />

        {showComparisonOverlay
          ? points.map((point) => (
              <Circle
                key={`${point.key}-comparison-dot`}
                cx={point.comparisonX ?? point.outerX}
                cy={point.comparisonY ?? point.outerY}
                r={2.75}
                fill="#94a3b8"
                stroke={withAlpha('#ffffff', 0.2)}
              />
            ))
          : null}

        {points.map((point) => {
          const x = metrics.center + Math.cos(point.angle) * metrics.radius * point.value;
          const y = metrics.center + Math.sin(point.angle) * metrics.radius * point.value;
          return (
            <Circle
              key={`${point.key}-primary-dot`}
              cx={x}
              cy={y}
              r={point.key === focusedKey ? 4.5 : 3}
              fill={chartColors.purple}
              opacity={point.key === focusedKey ? 1 : 0.82}
              onPress={() => onSelect(point.key)}
            />
          );
        })}

        <SvgText
          x={metrics.center}
          y={metrics.size - 8}
          fill={chartColors.muted}
          fontSize="10"
          textAnchor="middle"
        >
          Avg strength {formatPercent(averageStrength)}
        </SvgText>
      </G>
    </Svg>
  );
}

export default memo(RadarChartSvgComponent);
