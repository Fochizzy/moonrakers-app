import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";

import Text from "@/components/ui/Text";

export type PlaystyleScatterPoint = {
  id: string;
  x: number;
  y: number;
  color?: string;
};

type Props = {
  title: string;
  subtitle: string;
  yLabel: string;
  points: PlaystyleScatterPoint[];
  accentColor?: string;
  emptyText?: string;
};

const WIDTH = 312;
const HEIGHT = 208;
const LEFT = 34;
const RIGHT = 12;
const TOP = 18;
const BOTTOM = 30;
const INNER_WIDTH = WIDTH - LEFT - RIGHT;
const INNER_HEIGHT = HEIGHT - TOP - BOTTOM;

function formatAxisValue(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 10 || Number.isInteger(value)) {
    return String(Math.round(value));
  }
  return value.toFixed(1);
}

function getYRange(points: PlaystyleScatterPoint[]) {
  if (!points.length) {
    return { min: 0, mid: 0.5, max: 1, span: 1 };
  }

  const values = points.map((point) => point.y);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  if (minValue === maxValue) {
    const fallbackMax = maxValue === 0 ? 1 : maxValue * 1.15;
    return {
      min: Math.min(0, minValue),
      mid: (Math.min(0, minValue) + fallbackMax) / 2,
      max: fallbackMax,
      span: Math.max(1, fallbackMax - Math.min(0, minValue)),
    };
  }

  const padding = Math.max((maxValue - minValue) * 0.12, 0.15);
  const min = Math.min(0, minValue - padding);
  const max = maxValue + padding;

  return {
    min,
    mid: min + (max - min) / 2,
    max,
    span: max - min,
  };
}

export default function PlaystyleScatterCard({
  title,
  subtitle,
  yLabel,
  points,
  accentColor = "#67E8F9",
  emptyText = "Not enough chart points yet.",
}: Props) {
  const yRange = useMemo(() => getYRange(points), [points]);

  const xFor = (value: number) => LEFT + value * INNER_WIDTH;
  const yFor = (value: number) =>
    TOP + INNER_HEIGHT - ((value - yRange.min) / Math.max(yRange.span, 1)) * INNER_HEIGHT;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View
          style={[
            styles.countBadge,
            {
              borderColor: `${accentColor}55`,
              backgroundColor: `${accentColor}14`,
            },
          ]}
        >
          <Text style={[styles.countBadgeText, { color: accentColor }]}>
            {points.length} pts
          </Text>
        </View>
      </View>

      {points.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No scatter yet</Text>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      ) : (
        <>
          <Svg width={WIDTH} height={HEIGHT}>
            {[0, 0.5, 1].map((tick) => {
              const x = xFor(tick);
              return (
                <React.Fragment key={`x-${tick}`}>
                  <Line
                    x1={x}
                    y1={TOP}
                    x2={x}
                    y2={TOP + INNER_HEIGHT}
                    stroke="rgba(148,163,184,0.14)"
                    strokeWidth={1}
                  />
                  <SvgText
                    x={x}
                    y={HEIGHT - 8}
                    fill="rgba(199,214,243,0.82)"
                    fontSize="10"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {`${Math.round(tick * 100)}%`}
                  </SvgText>
                </React.Fragment>
              );
            })}

            {[yRange.max, yRange.mid, yRange.min].map((tick) => {
              const y = yFor(tick);
              return (
                <React.Fragment key={`y-${tick}`}>
                  <Line
                    x1={LEFT}
                    y1={y}
                    x2={LEFT + INNER_WIDTH}
                    y2={y}
                    stroke="rgba(148,163,184,0.14)"
                    strokeWidth={1}
                  />
                  <SvgText
                    x={LEFT - 8}
                    y={y + 3}
                    fill="rgba(199,214,243,0.82)"
                    fontSize="10"
                    fontWeight="700"
                    textAnchor="end"
                  >
                    {formatAxisValue(tick)}
                  </SvgText>
                </React.Fragment>
              );
            })}

            <Line
              x1={LEFT}
              y1={TOP + INNER_HEIGHT}
              x2={LEFT + INNER_WIDTH}
              y2={TOP + INNER_HEIGHT}
              stroke="rgba(248,251,255,0.42)"
              strokeWidth={1.2}
            />
            <Line
              x1={LEFT}
              y1={TOP}
              x2={LEFT}
              y2={TOP + INNER_HEIGHT}
              stroke="rgba(248,251,255,0.42)"
              strokeWidth={1.2}
            />

            {points.map((point) => (
              <Circle
                key={point.id}
                cx={xFor(point.x)}
                cy={yFor(point.y)}
                r={4.5}
                fill={point.color ?? accentColor}
                stroke="rgba(248,251,255,0.92)"
                strokeWidth={0.9}
              />
            ))}
          </Svg>

          <View style={styles.axisRow}>
            <Text style={styles.axisLabel}>Stay at Base Rate</Text>
            <Text style={styles.axisLabel}>{yLabel}</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    backgroundColor: "rgba(15,23,42,0.94)",
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: "#F8FBFF",
    fontSize: 13,
    fontWeight: "900",
  },
  subtitle: {
    color: "#C7D6F3",
    fontSize: 11,
    lineHeight: 16,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  axisRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  axisLabel: {
    color: "#8EA6C8",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyState: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
    backgroundColor: "rgba(4,8,20,0.8)",
    gap: 4,
  },
  emptyTitle: {
    color: "#F8FBFF",
    fontSize: 13,
    fontWeight: "900",
  },
  emptyText: {
    color: "#C7D6F3",
    fontSize: 11,
    lineHeight: 16,
  },
});
