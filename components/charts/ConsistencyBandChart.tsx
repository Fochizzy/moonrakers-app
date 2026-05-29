import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import ChartFocusCard from "./ChartFocusCard";
import ChartStage from "./ChartStage";
import SeriesIdentityBadge from "./SeriesIdentityBadge";
import Text from "@/components/ui/Text";
import { CHART_COLORS } from "./chartVisualSystem";
import { buildLineSeriesIdentities } from "./lineSeriesIdentity";
import { getMetricOrFallback } from "@/utils/metricMap";
import { buildConsistencyBandModel } from "./consistencyBandModel";

type Player = {
  id: string;
  name?: string;
  color?: string;
};

type SnapshotPoint = {
  label?: string;
  snapshot?: Record<string, Record<string, number | string>>;
};

type Props = {
  data?: SnapshotPoint[];
  players?: Player[];
  statKey?: string;
  selectedPlayerIds?: string[];
  scopedPlayerIds?: string[];
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
};

function round(value: number, digits = 1) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function filterPlayers(players: Player[], selectedPlayerIds?: string[], scopedPlayerIds?: string[]) {
  const ids = selectedPlayerIds?.length ? selectedPlayerIds : scopedPlayerIds;
  if (!ids?.length) return players;
  const allowed = new Set(ids.map(String));
  const filtered = players.filter((player) => allowed.has(String(player.id)));
  return filtered.length ? filtered : players;
}

export default function ConsistencyBandChart({
  data = [],
  players = [],
  statKey = "totalPrestige",
  selectedPlayerIds,
  scopedPlayerIds,
  title,
  subtitle,
  showHeader = true,
}: Props) {
  const metric = getMetricOrFallback(statKey);

  const visiblePlayers = useMemo(
    () => filterPlayers(players, selectedPlayerIds, scopedPlayerIds),
    [players, scopedPlayerIds, selectedPlayerIds]
  );

  const model = useMemo(
    () =>
      buildConsistencyBandModel({
        players: visiblePlayers as any,
        data: data as any,
        metricKey: statKey,
      }),
    [data, statKey, visiblePlayers]
  );

  const identifiedSeries = useMemo(
    () =>
      buildLineSeriesIdentities(
        model.series.map((row) => ({
          ...row,
          id: row.playerId,
          name: row.name,
        }))
      ),
    [model.series]
  );

  const orderedSeries = useMemo(
    () => [...identifiedSeries].sort((left, right) => right.median - left.median),
    [identifiedSeries]
  );

  const scaleRange = Math.max(1, model.maxValue - model.minValue);
  const medianLeader = model.medianLeader;
  const mostStable = model.mostStable;
  const mostSwingy = model.mostSwingy;

  if (orderedSeries.length < 2) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>No consistency-band data yet</Text>
        <Text style={styles.emptyText}>
          Add at least two scoped players with saved games to compare stability.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showHeader ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title || "Consistency Band"}</Text>
          <Text style={styles.subtitle}>
            {subtitle || `Median and range comparison using ${metric.label.toLowerCase()}.`}
          </Text>
        </View>
      ) : null}

      <ChartFocusCard
        title={medianLeader?.name ?? "Consistency Focus"}
        value={`${round(medianLeader?.median ?? 0, 1)}`}
        helper={
          mostStable && mostSwingy
            ? `${mostStable.name} is steadiest | ${mostSwingy.name} swings widest`
            : `Median-first view of ${metric.label.toLowerCase()}`
        }
        story={
          medianLeader
            ? `${medianLeader.name} sets the median pace right now.`
            : "Use the range rails to compare stability across scoped players."
        }
        tone="comparison"
        accentColor={medianLeader?.color ?? CHART_COLORS.accent}
      />

      <ChartStage
        tone="comparison"
        plotStyle={styles.chartStagePlot}
        header={
          <View style={styles.scaleRow}>
            <Text style={styles.scaleLabel}>{round(model.minValue, 1)}</Text>
            <Text style={styles.scaleCenter}>Range</Text>
            <Text style={styles.scaleLabel}>{round(model.maxValue, 1)}</Text>
          </View>
        }
      >
        <View style={styles.chartCard}>
          {orderedSeries.map((series) => {
            const leftPct = ((series.low - model.minValue) / scaleRange) * 100;
            const widthPct = ((series.high - series.low) / scaleRange) * 100;
            const medianPct = ((series.median - model.minValue) / scaleRange) * 100;
            const isStable = series.playerId === mostStable?.playerId;
            const isSwingy = series.playerId === mostSwingy?.playerId;
            const isLeader = series.playerId === medianLeader?.playerId;

            return (
              <View
                key={series.playerId}
                style={[
                  styles.row,
                  isLeader && styles.rowLeader,
                  {
                    borderColor: isLeader ? `${series.color}55` : CHART_COLORS.border,
                    backgroundColor: isLeader ? `${series.color}12` : "transparent",
                  },
                ]}
              >
                <View style={styles.labelColumn}>
                  <View style={styles.nameRow}>
                    <View style={[styles.dot, { backgroundColor: series.color }]} />
                    <Text style={styles.playerName}>{series.name}</Text>
                    <SeriesIdentityBadge
                      label={series.collisionBadgeText}
                      color={series.color}
                    />
                  </View>
                  <Text style={styles.playerMeta}>
                    Median {round(series.median, 1)} | sigma {round(series.deviation, 2)}
                  </Text>
                </View>

                <View style={styles.bandShell}>
                  <View style={styles.track} />
                  <View
                    style={[
                      styles.band,
                      {
                        left: `${leftPct}%`,
                        width: `${Math.max(widthPct, 4)}%`,
                        backgroundColor: `${series.color}33`,
                        borderColor: `${series.color}66`,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.medianMarker,
                      {
                        left: `${medianPct}%`,
                        borderColor: series.color,
                        shadowColor: series.color,
                      },
                    ]}
                  />
                </View>

                <View style={styles.flagColumn}>
                  {isStable ? <Text style={styles.flagText}>Most Stable</Text> : null}
                  {isSwingy ? <Text style={styles.flagText}>Swingiest</Text> : null}
                  {isLeader ? <Text style={styles.flagText}>Median Leader</Text> : null}
                </View>
              </View>
            );
          })}
        </View>
      </ChartStage>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  scaleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  scaleLabel: {
    color: CHART_COLORS.textStrong,
    fontSize: 12,
    fontWeight: "800",
  },
  scaleCenter: {
    color: CHART_COLORS.sub,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
  },
  chartCard: {
    padding: 4,
    gap: 12,
  },
  chartStagePlot: {
    gap: 8,
  },
  row: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  rowLeader: {
    shadowColor: CHART_COLORS.accent,
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  labelColumn: {
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  playerName: {
    color: CHART_COLORS.textStrong,
    fontSize: 13,
    fontWeight: "800",
  },
  playerMeta: {
    color: CHART_COLORS.sub,
    fontSize: 10,
    lineHeight: 14,
  },
  bandShell: {
    height: 22,
    justifyContent: "center",
    position: "relative",
  },
  track: {
    height: 4,
    borderRadius: 999,
    backgroundColor: CHART_COLORS.grid,
  },
  band: {
    position: "absolute",
    height: 12,
    marginTop: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  medianMarker: {
    position: "absolute",
    top: 1,
    marginLeft: -6,
    width: 12,
    height: 20,
    borderRadius: 999,
    borderWidth: 2,
    backgroundColor: CHART_COLORS.textStrong,
  },
  flagColumn: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  flagText: {
    color: CHART_COLORS.green,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CHART_COLORS.border,
    backgroundColor: CHART_COLORS.cardAlt,
    padding: 14,
    gap: 6,
  },
  emptyTitle: {
    color: CHART_COLORS.textStrong,
    fontSize: 15,
    fontWeight: "800",
  },
  emptyText: {
    color: CHART_COLORS.sub,
    fontSize: 12,
    lineHeight: 18,
  },
});
