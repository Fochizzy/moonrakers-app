import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import Text from "@/components/ui/Text";
import { buildEloSnapshots } from "@/utils/elo";
import { CHART_COLORS } from "@/components/charts/chartVisualSystem";
import EloChartPlot from "./EloChartPlot";
import {
  buildEloChartState,
  DEFAULT_ELO_MODE,
  ELO_CHART_MODE_OPTIONS,
  type EloChartMode,
  type EloChartGame,
  type EloChartPlayer,
} from "./buildEloChartState";
import { deriveActiveEloChartView } from "./eloChartModeHelpers";

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
  // Nothing upstream publishes an eloSnapshot, so without this the chart would
  // fall back to deriving ratings from a plain win/loss formula of its own and
  // disagree with every other ELO surface in the app. Attaching snapshots from
  // the shared blend keeps the chart on the same calculation as the leaderboard.
  const gamesWithRatings = useMemo(() => {
    const normalized = games.map((game) => ({
      ...game,
      id: String(game?.id ?? game?.gameId ?? "").trim() || undefined,
    }));
    const snapshots = buildEloSnapshots(normalized as never);

    return normalized.map((game) => {
      const snapshot = game.id ? snapshots[game.id] : undefined;
      return snapshot ? { ...game, eloSnapshot: snapshot } : game;
    }) as EloChartGame[];
  }, [games]);

  const chartState = useMemo(
    () => buildEloChartState({ games: gamesWithRatings, players, primaryPlayerId }),
    [gamesWithRatings, players, primaryPlayerId]
  );
  const [selectedIndex, setSelectedIndex] = useState(chartState.selectedIndex);
  const [selectedMode, setSelectedMode] = useState<EloChartMode>(DEFAULT_ELO_MODE);

  const { seriesPaths: activeSeriesPaths, activeRange } = useMemo(
    () => deriveActiveEloChartView(chartState, selectedMode),
    [chartState, selectedMode]
  );

  useEffect(() => {
    setSelectedIndex(chartState.selectedIndex);
  }, [chartState.selectedIndex, chartState.games.length, chartState.focusedPlayerId]);

  if (
    !chartState.games.length ||
    !chartState.players.length ||
    !chartState.eloSeriesPaths.length
  ) {
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
        seriesPaths={activeSeriesPaths as any}
        selectedIndex={selectedIndex}
        selectedMode={selectedMode}
        modeOptions={ELO_CHART_MODE_OPTIONS}
        minValue={activeRange.minValue}
        maxValue={activeRange.maxValue}
        onSelectGame={setSelectedIndex}
        onChangeMode={setSelectedMode}
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
