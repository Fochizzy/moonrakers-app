import React from "react";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import {
  CHART_COLORS,
  getChartToneStyles,
  withChartAlpha,
  type ChartTone,
} from "./chartVisualTokens";
import type { ChartPreviewKind } from "./chartCatalog";

type Props = {
  kind: ChartPreviewKind;
  tone?: ChartTone;
  width?: number;
  height?: number;
};

function buildPath(points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function PreviewTrend({
  stroke,
  fill,
  width,
  height,
}: {
  stroke: string;
  fill: string;
  width: number;
  height: number;
}) {
  const points = [
    { x: 10, y: height - 16 },
    { x: width * 0.32, y: height - 26 },
    { x: width * 0.58, y: height - 12 },
    { x: width - 14, y: 18 },
  ];

  return (
    <>
      <Path
        d={`${buildPath(points)} L ${width - 14} ${height - 8} L 10 ${height - 8} Z`}
        fill={fill}
      />
      <Path d={buildPath(points)} stroke={stroke} strokeWidth={2.4} fill="none" />
      {points.map((point, index) => (
        <Circle
          key={`trend-${index}`}
          cx={point.x}
          cy={point.y}
          r={3}
          fill={stroke}
        />
      ))}
    </>
  );
}

function PreviewRanking({
  stroke,
  width,
  height,
}: {
  stroke: string;
  width: number;
  height: number;
}) {
  const series = [
    [
      { x: 10, y: 16 },
      { x: width * 0.4, y: height * 0.58 },
      { x: width - 12, y: 20 },
    ],
    [
      { x: 10, y: height - 20 },
      { x: width * 0.42, y: height * 0.42 },
      { x: width - 12, y: 28 },
    ],
    [
      { x: 10, y: height * 0.52 },
      { x: width * 0.43, y: height * 0.3 },
      { x: width - 12, y: height - 16 },
    ],
  ];

  return (
    <>
      {[1, 2, 3].map((rank, index) => {
        const y = 10 + index * ((height - 20) / 2);
        return (
          <Line
            key={`rank-line-${rank}`}
            x1={8}
            y1={y}
            x2={width - 8}
            y2={y}
            stroke={CHART_COLORS.grid}
            strokeWidth={1}
          />
        );
      })}
      {series.map((points, index) => (
        <Path
          key={`rank-series-${index}`}
          d={buildPath(points)}
          stroke={withChartAlpha(stroke, 0.95 - index * 0.2)}
          strokeWidth={2.2}
          fill="none"
        />
      ))}
    </>
  );
}

function PreviewElo({
  stroke,
  fill,
  width,
  height,
}: {
  stroke: string;
  fill: string;
  width: number;
  height: number;
}) {
  const leadSeries = [
    { x: 12, y: height - 18 },
    { x: width * 0.28, y: height * 0.56 },
    { x: width * 0.52, y: height * 0.48 },
    { x: width * 0.74, y: height * 0.3 },
    { x: width - 12, y: height * 0.2 },
  ];
  const chaseSeries = [
    { x: 12, y: height * 0.34 },
    { x: width * 0.28, y: height * 0.46 },
    { x: width * 0.52, y: height * 0.42 },
    { x: width * 0.74, y: height * 0.52 },
    { x: width - 12, y: height * 0.6 },
  ];

  return (
    <>
      {[0.24, 0.5, 0.76].map((ratio, index) => (
        <Line
          key={`elo-grid-${index}`}
          x1={10}
          y1={10 + (height - 20) * ratio}
          x2={width - 10}
          y2={10 + (height - 20) * ratio}
          stroke={CHART_COLORS.grid}
          strokeWidth={1}
        />
      ))}
      <Path
        d={`${buildPath(leadSeries)} L ${width - 12} ${height - 10} L 12 ${height - 10} Z`}
        fill={fill}
      />
      <Path d={buildPath(leadSeries)} stroke={stroke} strokeWidth={2.4} fill="none" />
      <Path
        d={buildPath(chaseSeries)}
        stroke={withChartAlpha(CHART_COLORS.warning, 0.86)}
        strokeWidth={2}
        fill="none"
      />
      {leadSeries.slice(1).map((point, index) => (
        <Circle
          key={`elo-lead-${index}`}
          cx={point.x}
          cy={point.y}
          r={2.8}
          fill={stroke}
        />
      ))}
      <Circle
        cx={leadSeries[leadSeries.length - 1]?.x ?? width - 12}
        cy={leadSeries[leadSeries.length - 1]?.y ?? height * 0.2}
        r={4.2}
        fill={CHART_COLORS.cardAlt}
        stroke={stroke}
        strokeWidth={2}
      />
    </>
  );
}

function PreviewMatchup({
  stroke,
  width,
  height,
}: {
  stroke: string;
  width: number;
  height: number;
}) {
  return (
    <>
      <Rect
        x={14}
        y={height * 0.28}
        width={18}
        height={height * 0.48}
        rx={6}
        fill={withChartAlpha(stroke, 0.22)}
        stroke={withChartAlpha(stroke, 0.6)}
      />
      <Rect
        x={width - 32}
        y={height * 0.14}
        width={18}
        height={height * 0.62}
        rx={6}
        fill={withChartAlpha(CHART_COLORS.blue, 0.24)}
        stroke={withChartAlpha(CHART_COLORS.blue, 0.7)}
      />
      <Line
        x1={40}
        y1={height * 0.5}
        x2={width - 40}
        y2={height * 0.5}
        stroke={CHART_COLORS.sub}
        strokeDasharray="3 3"
      />
      <Circle cx={width * 0.45} cy={height * 0.5} r={4} fill={stroke} />
      <Circle cx={width * 0.58} cy={height * 0.5} r={4} fill={CHART_COLORS.blue} />
    </>
  );
}

function PreviewRadar({
  stroke,
  width,
  height,
}: {
  stroke: string;
  width: number;
  height: number;
}) {
  const cx = width / 2;
  const cy = height / 2;
  const polygon = [
    [cx, 12],
    [width - 16, height * 0.36],
    [width * 0.72, height - 14],
    [width * 0.28, height - 10],
    [14, height * 0.38],
  ];

  return (
    <>
      <Path
        d={`M ${polygon.map(([x, y]) => `${x} ${y}`).join(" L ")} Z`}
        fill={withChartAlpha(stroke, 0.18)}
        stroke={withChartAlpha(stroke, 0.72)}
        strokeWidth={2}
      />
      {[0.42, 0.68].map((scale, index) => (
        <Path
          key={`radar-ring-${index}`}
          d={`M ${polygon
            .map(([x, y]) => `${cx + (x - cx) * scale} ${cy + (y - cy) * scale}`)
            .join(" L ")} Z`}
          fill="none"
          stroke={CHART_COLORS.grid}
          strokeWidth={1}
        />
      ))}
    </>
  );
}

function PreviewBar({
  stroke,
  width,
  height,
}: {
  stroke: string;
  width: number;
  height: number;
}) {
  const bars = [0.4, 0.72, 0.55, 0.86];
  return (
    <>
      {bars.map((ratio, index) => {
        const barWidth = 12;
        const x = 14 + index * 18;
        const barHeight = ratio * (height - 18);
        return (
          <Rect
            key={`bar-${index}`}
            x={x}
            y={height - barHeight - 8}
            width={barWidth}
            height={barHeight}
            rx={5}
            fill={withChartAlpha(stroke, 0.24 + index * 0.12)}
            stroke={withChartAlpha(stroke, 0.66)}
          />
        );
      })}
    </>
  );
}

function PreviewHeatmap({
  stroke,
  width,
  height,
}: {
  stroke: string;
  width: number;
  height: number;
}) {
  const rows = 3;
  const cols = 5;
  const gap = 4;
  const cellWidth = (width - 20 - gap * (cols - 1)) / cols;
  const cellHeight = (height - 18 - gap * (rows - 1)) / rows;
  const intensities = [
    0.22, 0.4, 0.55, 0.8, 0.35,
    0.15, 0.62, 0.3, 0.9, 0.48,
    0.5, 0.28, 0.72, 0.44, 0.18,
  ];

  return (
    <>
      {Array.from({ length: rows * cols }, (_, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const x = 10 + col * (cellWidth + gap);
        const y = 8 + row * (cellHeight + gap);
        const alpha = intensities[index];

        return (
          <Rect
            key={`cell-${index}`}
            x={x}
            y={y}
            width={cellWidth}
            height={cellHeight}
            rx={4}
            fill={withChartAlpha(stroke, alpha)}
            stroke={CHART_COLORS.border}
          />
        );
      })}
    </>
  );
}

function PreviewNetwork({
  stroke,
  width,
  height,
}: {
  stroke: string;
  width: number;
  height: number;
}) {
  const nodes = [
    { x: width * 0.24, y: height * 0.66, r: 6 },
    { x: width * 0.52, y: height * 0.28, r: 7 },
    { x: width * 0.78, y: height * 0.62, r: 5 },
  ];

  return (
    <>
      <Line x1={nodes[0].x} y1={nodes[0].y} x2={nodes[1].x} y2={nodes[1].y} stroke={withChartAlpha(stroke, 0.65)} strokeWidth={2} />
      <Line x1={nodes[1].x} y1={nodes[1].y} x2={nodes[2].x} y2={nodes[2].y} stroke={withChartAlpha(stroke, 0.55)} strokeWidth={2} />
      <Line x1={nodes[0].x} y1={nodes[0].y} x2={nodes[2].x} y2={nodes[2].y} stroke={CHART_COLORS.grid} strokeWidth={1.5} />
      {nodes.map((node, index) => (
        <Circle
          key={`node-${index}`}
          cx={node.x}
          cy={node.y}
          r={node.r}
          fill={withChartAlpha(stroke, 0.2 + index * 0.12)}
          stroke={withChartAlpha(stroke, 0.8)}
          strokeWidth={1.4}
        />
      ))}
    </>
  );
}

function PreviewComposition({
  stroke,
  width,
  height,
}: {
  stroke: string;
  width: number;
  height: number;
}) {
  const segments = [
    { width: width * 0.28, fill: withChartAlpha(stroke, 0.84) },
    { width: width * 0.18, fill: withChartAlpha(CHART_COLORS.blue, 0.84) },
    { width: width * 0.22, fill: withChartAlpha(CHART_COLORS.green, 0.84) },
    { width: width * 0.14, fill: withChartAlpha(CHART_COLORS.warning, 0.84) },
  ];
  let offset = 10;

  return (
    <>
      {segments.map((segment, index) => {
        const rect = (
          <Rect
            key={`composition-${index}`}
            x={offset}
            y={height * 0.34}
            width={segment.width}
            height={height * 0.34}
            rx={6}
            fill={segment.fill}
          />
        );
        offset += segment.width + 6;
        return rect;
      })}
    </>
  );
}

function PreviewConsistency({
  stroke,
  width,
  height,
}: {
  stroke: string;
  width: number;
  height: number;
}) {
  const ranges = [
    { x: 18, top: 18, bottom: height - 18, median: height * 0.46 },
    { x: width * 0.38, top: 24, bottom: height - 24, median: height * 0.54 },
    { x: width * 0.7, top: 16, bottom: height - 14, median: height * 0.42 },
  ];

  return (
    <>
      {ranges.map((range, index) => (
        <React.Fragment key={`consistency-${index}`}>
          <Line
            x1={range.x}
            y1={range.top}
            x2={range.x}
            y2={range.bottom}
            stroke={withChartAlpha(stroke, 0.72)}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Line
            x1={range.x - 10}
            y1={range.median}
            x2={range.x + 10}
            y2={range.median}
            stroke={CHART_COLORS.textStrong}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </React.Fragment>
      ))}
    </>
  );
}

function PreviewScatter({
  stroke,
  width,
  height,
}: {
  stroke: string;
  width: number;
  height: number;
}) {
  const dots = [
    { x: width * 0.24, y: height * 0.66, r: 4 },
    { x: width * 0.38, y: height * 0.5, r: 4 },
    { x: width * 0.56, y: height * 0.42, r: 5 },
    { x: width * 0.68, y: height * 0.28, r: 4 },
    { x: width * 0.78, y: height * 0.58, r: 3.6 },
  ];

  return (
    <>
      <Line x1={10} y1={height - 14} x2={width - 8} y2={height - 14} stroke={CHART_COLORS.grid} strokeWidth={1} />
      <Line x1={10} y1={height - 14} x2={10} y2={12} stroke={CHART_COLORS.grid} strokeWidth={1} />
      {dots.map((dot, index) => (
        <Circle
          key={`scatter-${index}`}
          cx={dot.x}
          cy={dot.y}
          r={dot.r}
          fill={withChartAlpha(stroke, 0.32 + index * 0.1)}
          stroke={withChartAlpha(stroke, 0.88)}
          strokeWidth={1}
        />
      ))}
    </>
  );
}

function PreviewReplay({
  stroke,
  width,
  height,
}: {
  stroke: string;
  width: number;
  height: number;
}) {
  const first = buildPath([
    { x: 10, y: height * 0.7 },
    { x: width * 0.36, y: height * 0.56 },
    { x: width * 0.62, y: height * 0.4 },
    { x: width - 12, y: height * 0.24 },
  ]);
  const second = buildPath([
    { x: 10, y: height * 0.34 },
    { x: width * 0.36, y: height * 0.46 },
    { x: width * 0.62, y: height * 0.58 },
    { x: width - 12, y: height * 0.72 },
  ]);

  return (
    <>
      <Path d={first} stroke={stroke} strokeWidth={2.2} fill="none" />
      <Path d={second} stroke={withChartAlpha(CHART_COLORS.blue, 0.9)} strokeWidth={2.2} fill="none" />
    </>
  );
}

const CHART_PREVIEW_RENDERERS: Record<
  ChartPreviewKind,
  (props: { stroke: string; fill: string; width: number; height: number }) => React.ReactNode
> = {
  trend: PreviewTrend,
  elo: ({ stroke, fill, width, height }) => (
    <PreviewElo stroke={stroke} fill={fill} width={width} height={height} />
  ),
  scatter: ({ stroke, width, height }) => (
    <PreviewScatter stroke={stroke} width={width} height={height} />
  ),
  ranking: ({ stroke, width, height }) => (
    <PreviewRanking stroke={stroke} width={width} height={height} />
  ),
  matchup: ({ stroke, width, height }) => (
    <PreviewMatchup stroke={stroke} width={width} height={height} />
  ),
  radar: ({ stroke, width, height }) => (
    <PreviewRadar stroke={stroke} width={width} height={height} />
  ),
  bar: ({ stroke, width, height }) => (
    <PreviewBar stroke={stroke} width={width} height={height} />
  ),
  heatmap: ({ stroke, width, height }) => (
    <PreviewHeatmap stroke={stroke} width={width} height={height} />
  ),
  network: ({ stroke, width, height }) => (
    <PreviewNetwork stroke={stroke} width={width} height={height} />
  ),
  composition: ({ stroke, width, height }) => (
    <PreviewComposition stroke={stroke} width={width} height={height} />
  ),
  band: ({ stroke, width, height }) => (
    <PreviewConsistency stroke={stroke} width={width} height={height} />
  ),
  replay: ({ stroke, width, height }) => (
    <PreviewReplay stroke={stroke} width={width} height={height} />
  ),
};

export default function ChartHubPreview({
  kind,
  tone = "neutral",
  width = 108,
  height = 66,
}: Props) {
  const toneStyles = getChartToneStyles(tone);
  const fill = withChartAlpha(toneStyles.value, 0.16);
  const render =
    CHART_PREVIEW_RENDERERS[kind] ?? CHART_PREVIEW_RENDERERS.trend;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect
        x={0.5}
        y={0.5}
        width={width - 1}
        height={height - 1}
        rx={12}
        fill={withChartAlpha(CHART_COLORS.cardAlt, 0.94)}
        stroke={CHART_COLORS.border}
      />
      <Rect
        x={7}
        y={7}
        width={width - 14}
        height={height - 14}
        rx={10}
        fill={withChartAlpha(CHART_COLORS.bg, 0.74)}
        stroke={withChartAlpha(toneStyles.value, 0.14)}
      />
      {render({
        stroke: toneStyles.value,
        fill,
        width,
        height,
      })}
    </Svg>
  );
}
