import React from "react";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import {
  CHART_COLORS,
  getChartToneStyles,
  withChartAlpha,
  type ChartTone,
} from "./chartVisualSystem";
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
  const stacks = [
    [0.24, 0.18, 0.12],
    [0.15, 0.21, 0.26],
    [0.12, 0.16, 0.3],
  ];
  const colors = [stroke, CHART_COLORS.blue, CHART_COLORS.green];

  return (
    <>
      {stacks.map((stack, index) => {
        const x = 16 + index * 22;
        let currentY = height - 8;
        return stack.map((segment, segmentIndex) => {
          const segmentHeight = segment * (height - 18);
          currentY -= segmentHeight;
          return (
            <Rect
              key={`stack-${index}-${segmentIndex}`}
              x={x}
              y={currentY}
              width={14}
              height={segmentHeight}
              rx={segmentIndex === 0 ? 0 : 3}
              fill={withChartAlpha(colors[segmentIndex], 0.75)}
            />
          );
        });
      })}
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
  const points = [
    { x: 12, y: height * 0.6 },
    { x: width * 0.35, y: height * 0.35 },
    { x: width * 0.58, y: height * 0.52 },
    { x: width - 12, y: height * 0.24 },
  ];

  return (
    <>
      <Line
        x1={10}
        y1={height - 12}
        x2={width - 10}
        y2={height - 12}
        stroke={CHART_COLORS.grid}
        strokeWidth={1}
      />
      <Path d={buildPath(points)} stroke={stroke} strokeWidth={2.2} fill="none" />
      {points.map((point, index) => (
        <Rect
          key={`replay-${index}`}
          x={point.x - 4}
          y={point.y - 4}
          width={8}
          height={8}
          rx={2}
          fill={withChartAlpha(stroke, 0.8)}
        />
      ))}
    </>
  );
}

function PreviewBand({
  stroke,
  width,
  height,
}: {
  stroke: string;
  width: number;
  height: number;
}) {
  const centers = [20, width * 0.5, width - 20];
  const spans = [
    { low: height * 0.36, high: height * 0.8, median: height * 0.56 },
    { low: height * 0.18, high: height * 0.84, median: height * 0.52 },
    { low: height * 0.26, high: height * 0.7, median: height * 0.48 },
  ];

  return (
    <>
      {centers.map((center, index) => (
        <React.Fragment key={`band-${index}`}>
          <Line
            x1={center}
            y1={spans[index].low}
            x2={center}
            y2={spans[index].high}
            stroke={withChartAlpha(stroke, 0.72)}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Circle cx={center} cy={spans[index].median} r={4} fill={CHART_COLORS.textStrong} />
          <Circle cx={center} cy={spans[index].median} r={2.5} fill={stroke} />
        </React.Fragment>
      ))}
    </>
  );
}

export default function ChartHubPreview({
  kind,
  tone = "accent",
  width = 112,
  height = 72,
}: Props) {
  const toneStyle = getChartToneStyles(tone);
  const stroke = toneStyle.value;
  const fill = withChartAlpha(stroke, 0.18);

  return (
    <Svg width={width} height={height}>
      <Rect
        x={0.75}
        y={0.75}
        width={width - 1.5}
        height={height - 1.5}
        rx={16}
        fill={withChartAlpha(stroke, 0.08)}
        stroke={withChartAlpha(stroke, 0.22)}
      />

      {kind === "radar" ? <PreviewRadar stroke={stroke} width={width} height={height} /> : null}
      {kind === "trend" ? <PreviewTrend stroke={stroke} fill={fill} width={width} height={height} /> : null}
      {kind === "matchup" ? <PreviewMatchup stroke={stroke} width={width} height={height} /> : null}
      {kind === "ranking" ? <PreviewRanking stroke={stroke} width={width} height={height} /> : null}
      {kind === "bar" ? <PreviewBar stroke={stroke} width={width} height={height} /> : null}
      {kind === "heatmap" ? <PreviewHeatmap stroke={stroke} width={width} height={height} /> : null}
      {kind === "network" ? <PreviewNetwork stroke={stroke} width={width} height={height} /> : null}
      {kind === "composition" ? <PreviewComposition stroke={stroke} width={width} height={height} /> : null}
      {kind === "replay" ? <PreviewReplay stroke={stroke} width={width} height={height} /> : null}
      {kind === "band" ? <PreviewBand stroke={stroke} width={width} height={height} /> : null}
    </Svg>
  );
}
