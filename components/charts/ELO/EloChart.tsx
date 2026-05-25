import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import Text from "@/components/ui/Text";
import { CHART_COLORS } from "../chartVisualSystem";
import EloChartPlot from "./EloChartPlot";
import {
  buildEloChartState,
  type EloChartGame,
  type EloChartPlayer,
} from "./buildEloChartState";

type Props = {
  games?: EloChartGame[];
  players?: EloChartPlayer[];
  primaryPlayerId?: string | null;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
};

export default function EloChart({
  games = [],
  players = [],
  primaryPlayerId = null,
  title = "ELO Progression",
  subtitle = "Rating history across tracked games.",
  showHeader = true,
}: Props) {
  const chartState = useMemo(
    () => buildEloChartState({ games, players, primaryPlayerId }),
    [games, players, primaryPlayerId]
  );
  const [selectedIndex, setSelectedIndex] = useState(chartState.selectedIndex);

  useEffect(() => {
    setSelectedIndex(chartState.selectedIndex);
  }, [chartState.selectedIndex, chartState.games.length, chartState.focusedPlayerId]);

  if (!chartState.games.length || !chartState.players.length || !chartState.seriesPaths.length) {
    return (
      <View style={styles.emptyCard}>
        {showHeader ? (
          <>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </>
        ) : null}
        <Text style={styles.emptyText}>No ELO snapshots are available yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {showHeader ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      ) : null}

      <EloChartPlot
        games={chartState.games as any}
        seriesPaths={chartState.seriesPaths as any}
        selectedIndex={selectedIndex}
        selectedMode={chartState.selectedMode}
        minValue={chartState.minValue}
        maxValue={chartState.maxValue}
        onSelectGame={setSelectedIndex}
        focusedPlayerId={chartState.focusedPlayerId ?? undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  header: {
    gap: 4,
  },
  title: {
    color: CHART_COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },
  subtitle: {
    color: CHART_COLORS.sub,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: CHART_COLORS.border,
    backgroundColor: CHART_COLORS.card,
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  emptyText: {
    color: CHART_COLORS.text,
    fontSize: 13,
    lineHeight: 18,
  },
});
