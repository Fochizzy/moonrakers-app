import React from "react";
import { ScrollView } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";

import {
  HEATMAP_LAYOUT,
  HeatmapMode,
  MatrixRow,
  SelectedCell,
  formatDisplayValue,
  getCellTextColor,
  truncateLabel,
} from "./heatmapUtils";

type Props = {
  dataLength: number;
  matrix: MatrixRow[];
  selectedCell: SelectedCell | null;
  selectedMode: HeatmapMode;
  onSelectCell: (cell: SelectedCell) => void;
};

const COLORS = {
  panel: "rgba(16,24,48,0.95)",
  card: "rgba(12,18,38,0.92)",
  text: "#E2E8F0",
  sub: "#94A3B8",
  muted: "#64748B",
  accent: "#A855F7",
  accentSoft: "rgba(168,85,247,0.18)",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  whiteSoft: "rgba(255,255,255,0.06)",
};

const { NAME_W, SUMMARY_W, CELL_W, CELL_H, HEADER_H, PAD } = HEATMAP_LAYOUT;

function withAlpha(hex: string, alpha: number) {
  if (typeof hex !== "string") return `rgba(168,85,247,${alpha})`;

  if (hex.startsWith("#") && hex.length === 7) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  return hex;
}

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function safeMode(value: unknown, fallback: HeatmapMode): HeatmapMode {
  return value === "raw" || value === "normalized" || value === "rank"
    ? value
    : fallback;
}

export default function HeatmapGrid({
  dataLength,
  matrix,
  selectedCell,
  selectedMode,
  onSelectCell,
}: Props) {
  const safeLength =
    typeof dataLength === "number" && Number.isFinite(dataLength) && dataLength > 0
      ? Math.floor(dataLength)
      : 0;

  const safeMatrix = Array.isArray(matrix) ? matrix : [];

  const svgWidth = PAD + NAME_W + SUMMARY_W + safeLength * CELL_W + PAD;
  const svgHeight = PAD * 2 + HEADER_H + safeMatrix.length * CELL_H;

  const selectedRound = safeNumber(selectedCell?.round, 0) || null;
  const selectedPlayerId = safeString(selectedCell?.playerId, null as any);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={svgWidth} height={svgHeight}>
        <Rect
          x={0}
          y={0}
          width={svgWidth}
          height={svgHeight}
          rx={16}
          fill={COLORS.panel}
          stroke={COLORS.borderStrong}
        />

        <Rect
          x={PAD}
          y={PAD}
          width={NAME_W + SUMMARY_W - 4}
          height={HEADER_H - 4}
          rx={10}
          fill={COLORS.whiteSoft}
          stroke={COLORS.border}
        />

        <SvgText
          x={PAD + 10}
          y={PAD + 22}
          fill={COLORS.sub}
          fontSize="10"
          fontWeight="800"
        >
          Player
        </SvgText>
        <SvgText
          x={PAD + NAME_W + 18}
          y={PAD + 22}
          fill={COLORS.sub}
          fontSize="10"
          fontWeight="800"
          textAnchor="middle"
        >
          Avg
        </SvgText>
        <SvgText
          x={PAD + NAME_W + 72}
          y={PAD + 22}
          fill={COLORS.sub}
          fontSize="10"
          fontWeight="800"
          textAnchor="middle"
        >
          Peak
        </SvgText>
        <SvgText
          x={PAD + NAME_W + 130}
          y={PAD + 22}
          fill={COLORS.sub}
          fontSize="10"
          fontWeight="800"
          textAnchor="middle"
        >
          Latest
        </SvgText>

        {Array.from({ length: safeLength }).map((_, index) => {
          const round = index + 1;
          const activeCol = selectedRound === round;
          const x = PAD + NAME_W + SUMMARY_W + index * CELL_W;

          return (
            <React.Fragment key={`round-${round}`}>
              {activeCol ? (
                <Rect
                  x={x}
                  y={PAD}
                  width={CELL_W}
                  height={svgHeight - PAD * 2}
                  fill="rgba(255,255,255,0.035)"
                />
              ) : null}

              <SvgText
                x={x + CELL_W / 2}
                y={PAD + 22}
                fill={activeCol ? COLORS.accent : COLORS.sub}
                fontSize="11"
                fontWeight="800"
                textAnchor="middle"
              >
                {String(round)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {safeMatrix.map((rawRow, rowIndex) => {
          const row = rawRow ?? ({} as MatrixRow);

          const rowId = safeString((row as any).id, `row-${rowIndex}`);
          const rowName = safeString((row as any).name, "Unknown");
          const rowColor = safeString((row as any).colorValue, COLORS.accent);

          const averageRaw = safeNumber((row as any).averageRaw, 0);
          const peakRaw = safeNumber((row as any).peakRaw, 0);
          const latestRaw = safeNumber((row as any).latestRaw, 0);

          const rowCells = Array.isArray((row as any).cells) ? (row as any).cells : [];
          const y = PAD + HEADER_H + rowIndex * CELL_H;
          const activeRow = selectedPlayerId === rowId;

          return (
            <React.Fragment key={rowId}>
              {activeRow ? (
                <Rect
                  x={PAD}
                  y={y}
                  width={svgWidth - PAD * 2}
                  height={CELL_H}
                  fill="rgba(255,255,255,0.035)"
                />
              ) : null}

              <Rect
                x={PAD}
                y={y + 2}
                width={NAME_W + SUMMARY_W - 4}
                height={CELL_H - 4}
                rx={10}
                fill={withAlpha(rowColor, activeRow ? 0.14 : 0.07)}
                stroke={activeRow ? withAlpha(rowColor, 0.72) : COLORS.border}
                strokeWidth={activeRow ? 1.4 : 1}
              />

              <SvgText
                x={PAD + 10}
                y={y + 24}
                fill={rowColor}
                fontSize="11"
                fontWeight="800"
              >
                {truncateLabel(rowName)}
              </SvgText>

              <SvgText
                x={PAD + NAME_W + 18}
                y={y + 24}
                fill={COLORS.text}
                fontSize="11"
                fontWeight="800"
                textAnchor="middle"
              >
                {averageRaw.toFixed(1)}
              </SvgText>

              <SvgText
                x={PAD + NAME_W + 72}
                y={y + 24}
                fill={COLORS.text}
                fontSize="11"
                fontWeight="800"
                textAnchor="middle"
              >
                {peakRaw.toFixed(1)}
              </SvgText>

              <SvgText
                x={PAD + NAME_W + 130}
                y={y + 24}
                fill={COLORS.text}
                fontSize="11"
                fontWeight="800"
                textAnchor="middle"
              >
                {latestRaw.toFixed(1)}
              </SvgText>

              {Array.from({ length: safeLength }).map((_, colIndex) => {
                const rawCell = rowCells[colIndex] ?? {};
                const round = safeNumber((rawCell as any).round, colIndex + 1);
                const intensity = safeNumber((rawCell as any).intensity, 0);
                const rawValue = safeNumber((rawCell as any).rawValue, 0);
                const displayValue =
                  (rawCell as any).displayValue ?? rawValue;
                const fill = safeString(
                  (rawCell as any).fill,
                  withAlpha(rowColor, 0.12)
                );

                const x = PAD + NAME_W + SUMMARY_W + colIndex * CELL_W;
                const isSelected =
                  selectedPlayerId === rowId && selectedRound === round;

                return (
                  <React.Fragment key={`${rowId}-${colIndex}`}>
                    <Rect
                      x={x + 3}
                      y={y + 3}
                      width={CELL_W - 6}
                      height={CELL_H - 6}
                      rx={9}
                      fill={fill}
                      stroke={isSelected ? rowColor : COLORS.border}
                      strokeWidth={isSelected ? 1.6 : 1}
                      onPress={() =>
                        onSelectCell({
                          playerId: rowId,
                          playerName: rowName,
                          round,
                          rawValue,
                          displayValue,
                          color: rowColor,
                          mode: safeMode(selectedMode, "raw"),
                        })
                      }
                    />

                    {isSelected ? (
                      <Rect
                        x={x + 1.5}
                        y={y + 1.5}
                        width={CELL_W - 3}
                        height={CELL_H - 3}
                        rx={10}
                        fill="none"
                        stroke={withAlpha(rowColor, 0.34)}
                        strokeWidth={1}
                      />
                    ) : null}

                    <SvgText
                      x={x + CELL_W / 2}
                      y={y + 24}
                      fill={getCellTextColor(intensity)}
                      fontSize="11"
                      fontWeight="800"
                      textAnchor="middle"
                    >
                      {formatDisplayValue(displayValue, safeMode(selectedMode, "raw"))}
                    </SvgText>
                  </React.Fragment>
                );
              })}
            </React.Fragment>
          );
        })}
      </Svg>
    </ScrollView>
  );
}
