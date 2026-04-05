import React from 'react';
import { ScrollView } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

import { chartColors, withAlpha } from '@/utils/chartTheme';
import {
  HEATMAP_LAYOUT,
  HeatmapMode,
  MatrixRow,
  SelectedCell,
  formatDisplayValue,
  getCellTextColor,
  truncateLabel,
} from './heatmapUtils';

type Props = {
  dataLength: number;
  matrix: MatrixRow[];
  selectedCell: SelectedCell | null;
  selectedMode: HeatmapMode;
  onSelectCell: (cell: SelectedCell) => void;
};

const { NAME_W, SUMMARY_W, CELL_W, CELL_H, HEADER_H, PAD } = HEATMAP_LAYOUT;

export default function HeatmapGrid({
  dataLength,
  matrix,
  selectedCell,
  selectedMode,
  onSelectCell,
}: Props) {
  const svgWidth = PAD + NAME_W + SUMMARY_W + dataLength * CELL_W + PAD;
  const svgHeight = PAD * 2 + HEADER_H + matrix.length * CELL_H;

  const selectedRound = selectedCell?.round ?? null;
  const selectedPlayerId = selectedCell?.playerId ?? null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={svgWidth} height={svgHeight}>
        <Rect x={0} y={0} width={svgWidth} height={svgHeight} rx={16} fill={chartColors.panelBg} stroke={chartColors.borderStrong} />

        {Array.from({ length: dataLength }).map((_, index) => {
          const activeCol = selectedRound === index + 1;
          const x = PAD + NAME_W + SUMMARY_W + index * CELL_W;
          return (
            <React.Fragment key={`round-${index + 1}`}>
              {activeCol ? <Rect x={x} y={PAD} width={CELL_W} height={svgHeight - PAD * 2} fill="rgba(255,255,255,0.035)" /> : null}
              <SvgText x={x + CELL_W / 2} y={PAD + 22} fill={activeCol ? chartColors.text : chartColors.subtext} fontSize="11" fontWeight="800" textAnchor="middle">{String(index + 1)}</SvgText>
            </React.Fragment>
          );
        })}

        {matrix.map((row, rowIndex) => {
          const y = PAD + HEADER_H + rowIndex * CELL_H;
          const activeRow = selectedPlayerId === row.id;
          return (
            <React.Fragment key={row.id}>
              {activeRow ? <Rect x={PAD} y={y} width={svgWidth - PAD * 2} height={CELL_H} fill="rgba(255,255,255,0.035)" /> : null}

              <Rect x={PAD} y={y + 2} width={NAME_W + SUMMARY_W - 4} height={CELL_H - 4} rx={10} fill={withAlpha(row.colorValue, activeRow ? 0.14 : 0.07)} stroke={activeRow ? withAlpha(row.colorValue, 0.7) : 'rgba(255,255,255,0.06)'} strokeWidth={activeRow ? 1.4 : 1} />
              <SvgText x={PAD + 10} y={y + 24} fill={row.colorValue} fontSize="11" fontWeight="800">{truncateLabel(row.name || 'Unknown')}</SvgText>
              <SvgText x={PAD + NAME_W + 18} y={y + 24} fill={chartColors.text} fontSize="11" fontWeight="800" textAnchor="middle">{row.averageRaw.toFixed(1)}</SvgText>
              <SvgText x={PAD + NAME_W + 72} y={y + 24} fill={chartColors.text} fontSize="11" fontWeight="800" textAnchor="middle">{row.peakRaw.toFixed(1)}</SvgText>
              <SvgText x={PAD + NAME_W + 130} y={y + 24} fill={chartColors.text} fontSize="11" fontWeight="800" textAnchor="middle">{row.latestRaw.toFixed(1)}</SvgText>

              {row.cells.map((cell, colIndex) => {
                const x = PAD + NAME_W + SUMMARY_W + colIndex * CELL_W;
                const isSelected = selectedPlayerId === row.id && selectedRound === cell.round;
                return (
                  <React.Fragment key={`${row.id}-${colIndex}`}>
                    <Rect
                      x={x + 3}
                      y={y + 3}
                      width={CELL_W - 6}
                      height={CELL_H - 6}
                      rx={9}
                      fill={cell.fill}
                      stroke={isSelected ? row.colorValue : 'rgba(255,255,255,0.08)'}
                      strokeWidth={isSelected ? 1.6 : 1}
                      onPress={() =>
                        onSelectCell({
                          playerId: row.id,
                          playerName: row.name,
                          round: cell.round,
                          rawValue: cell.rawValue,
                          displayValue: cell.displayValue,
                          color: row.colorValue,
                          mode: selectedMode,
                        })
                      }
                    />
                    <SvgText x={x + CELL_W / 2} y={y + 24} fill={getCellTextColor(cell.intensity)} fontSize="11" fontWeight="800" textAnchor="middle">{formatDisplayValue(cell.displayValue, selectedMode)}</SvgText>
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
