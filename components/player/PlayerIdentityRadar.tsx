import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Polygon,
  Line,
  Circle,
  Text as SvgText,
  G,
} from 'react-native-svg';

import {
  buildPlayerIdentity,
  type PlayerIdentityInput,
  type IdentityAxis,
} from '@/utils/playerIdentity';

type Props = {
  player: PlayerIdentityInput;
  accent?: string;
  size?: number;
};

function buildRadarPoints(
  axes: IdentityAxis[],
  center: number,
  radius: number
) {
  const angleStep = (Math.PI * 2) / axes.length;
  const startAngle = -Math.PI / 2;

  return axes
    .map((axis, i) => {
      const angle = startAngle + i * angleStep;
      const r = (axis.value / 100) * radius;
      const x = center + Math.cos(angle) * r;
      const y = center + Math.sin(angle) * r;
      return `${x},${y}`;
    })
    .join(' ');
}

function buildSummary(axes: IdentityAxis[]) {
  const topTwo = [...axes].sort((a, b) => b.value - a.value).slice(0, 2);
  const low = [...axes].sort((a, b) => a.value - b.value)[0];

  return `${topTwo[0]?.adjective ?? 'Balanced'} ${topTwo[0]?.label.toLowerCase()} player with strong ${
    topTwo[1]?.label.toLowerCase() ?? 'secondary'
  } profile. Lowest current axis is ${low?.label.toLowerCase() ?? 'unknown'}, which suggests the clearest growth area.`;
}

export default function PlayerIdentityRadar({
  player,
  accent = '#63E6FF',
  size = 280,
}: Props) {
  const identity = useMemo(() => buildPlayerIdentity(player), [player]);
  const axes = identity.axes;
  const summary = useMemo(() => buildSummary(axes), [axes]);

  const center = size / 2;
  const radius = size * 0.34;
  const levels = 4;
  const labelRadius = radius + 28;

  const angleStep = (Math.PI * 2) / axes.length;
  const startAngle = -Math.PI / 2;
  const polygonPoints = buildRadarPoints(axes, center, radius);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Player Identity</Text>
      <Text style={styles.subtitle}>
        Six-axis profile of how this player tends to pressure, convert, support, and win.
      </Text>

      <View style={styles.chartWrap}>
        <Svg width={size} height={size}>
          <G>
            {Array.from({ length: levels }).map((_, levelIndex) => {
              const level = (levelIndex + 1) / levels;
              const ringPoints = axes
                .map((_, i) => {
                  const angle = startAngle + i * angleStep;
                  const r = radius * level;
                  const x = center + Math.cos(angle) * r;
                  const y = center + Math.sin(angle) * r;
                  return `${x},${y}`;
                })
                .join(' ');

              return (
                <Polygon
                  key={`ring-${levelIndex}`}
                  points={ringPoints}
                  fill="none"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth={1}
                />
              );
            })}

            {axes.map((axis, i) => {
              const angle = startAngle + i * angleStep;
              const x = center + Math.cos(angle) * radius;
              const y = center + Math.sin(angle) * radius;

              const lx = center + Math.cos(angle) * labelRadius;
              const ly = center + Math.sin(angle) * labelRadius;

              return (
                <G key={axis.key}>
                  <Line
                    x1={center}
                    y1={center}
                    x2={x}
                    y2={y}
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth={1}
                  />
                  <SvgText
                    x={lx}
                    y={ly}
                    fill="#DCE8FF"
                    fontSize="11"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {axis.label}
                  </SvgText>
                </G>
              );
            })}

            <Polygon
              points={polygonPoints}
              fill="rgba(99,230,255,0.18)"
              stroke={accent}
              strokeWidth={2}
            />

            {axes.map((axis, i) => {
              const angle = startAngle + i * angleStep;
              const r = (axis.value / 100) * radius;
              const x = center + Math.cos(angle) * r;
              const y = center + Math.sin(angle) * r;

              return <Circle key={`${axis.key}-dot`} cx={x} cy={y} r={4} fill={accent} />;
            })}
          </G>
        </Svg>
      </View>

      <View style={styles.axisList}>
        {axes.map((axis) => (
          <View key={axis.key} style={styles.axisRow}>
            <View style={styles.axisHeader}>
              <Text style={styles.axisLabel}>{axis.label}</Text>
              <Text style={[styles.axisAdj, { color: accent }]}>{axis.adjective}</Text>
            </View>

            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${axis.value}%`,
                    backgroundColor: accent,
                  },
                ]}
              />
            </View>

            <Text style={styles.axisDescription}>{axis.description}</Text>
            <Text style={styles.axisMeaning}>{axis.gameplayMeaning}</Text>
          </View>
        ))}
      </View>

      <View style={styles.meaningBox}>
        <Text style={styles.meaningTitle}>What this means for play</Text>
        <Text style={styles.meaningText}>{summary}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0B1224',
    padding: 16,
  },
  title: {
    color: '#F4F7FF',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  subtitle: {
    color: '#9EB0D5',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 14,
  },
  chartWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  axisList: {
    gap: 14,
    marginBottom: 16,
  },
  axisRow: {
    gap: 6,
  },
  axisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  axisLabel: {
    color: '#EAF1FF',
    fontSize: 13,
    fontWeight: '800',
  },
  axisAdj: {
    fontSize: 12,
    fontWeight: '900',
  },
  barTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  axisDescription: {
    color: '#8FA1C7',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
  axisMeaning: {
    color: '#B8C8E8',
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '600',
  },
  meaningBox: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  meaningTitle: {
    color: '#F4F7FF',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
  },
  meaningText: {
    color: '#B8C8E8',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
});
