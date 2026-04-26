import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import RelationshipGraph from "@/components/charts/RelationshipGraph";
import { buildRelationshipInsightModel } from "@/components/charts/relationshipGraphModel";
import Text from "@/components/ui/Text";
import type { NormalizedGame } from "@/utils/charts";
import AssistNetworkControls, {
  getAssistNetworkLabel,
} from "./AssistNetworkControls";
import AssistNetworkDetailsCard from "./AssistNetworkDetailsCard";
import buildAssistNetworkDataset from "./buildAssistNetworkDataset";
import buildAssistNetworkLayout, {
  type AssistNetworkMode,
} from "./buildAssistNetworkLayout";

type Player = { id: string; name?: string; color?: string };
type Props = {
  games?: NormalizedGame[];
  players?: Player[];
  scopedPlayerIds?: string[];
  mode?: "flow" | "network";
  assistMode?: AssistNetworkMode;
  title?: string;
  subtitle?: string;
};

type WeightedRelationships = Record<string, Record<string, number>>;

function buildWeightedRelationships(
  links: Array<{ source: string; target: string; value: number }>
): WeightedRelationships {
  const next: WeightedRelationships = {};

  for (const link of links) {
    if (!Number.isFinite(link.value) || link.value <= 0) continue;
    if (!next[link.source]) next[link.source] = {};
    next[link.source][link.target] = link.value;
  }

  return next;
}

export default function AssistNetworkOverview({
  games = [],
  players = [],
  scopedPlayerIds,
  mode = "network",
  assistMode = "assistPrestige",
  title = "Assist Network",
  subtitle = "Directed assist flow across the filtered sample.",
}: Props) {
  const [selectedAssistMode, setSelectedAssistMode] =
    useState<AssistNetworkMode>(assistMode);

  useEffect(() => {
    setSelectedAssistMode(assistMode);
  }, [assistMode]);

  const safeGames = Array.isArray(games) ? games : [];
  const safePlayers = Array.isArray(players) ? players : [];
  const visiblePlayers = useMemo(() => {
    if (!scopedPlayerIds?.length) return safePlayers;
    const allowed = new Set(scopedPlayerIds.map(String));
    return safePlayers.filter((player) => allowed.has(String(player.id)));
  }, [safePlayers, scopedPlayerIds]);

  const dataset = useMemo(
    () => buildAssistNetworkDataset({ games: safeGames, scopedPlayerIds }),
    [safeGames, scopedPlayerIds]
  );
  const layout = useMemo(
    () => buildAssistNetworkLayout(dataset.edges, visiblePlayers, selectedAssistMode),
    [dataset.edges, selectedAssistMode, visiblePlayers]
  );
  const weightedRelationships = useMemo(
    () => buildWeightedRelationships(layout.links),
    [layout.links]
  );
  const insight = useMemo(
    () => buildRelationshipInsightModel(visiblePlayers, weightedRelationships),
    [visiblePlayers, weightedRelationships]
  );

  const topLink = layout.links[0] ?? null;
  const hubName = layout.nodes[0]?.label ?? insight.hub?.player.name ?? "No hub yet";
  const netGiverName = insight.netGiver?.player.name ?? "None";
  const netReceiverName = insight.netReceiver?.player.name ?? "None";
  const topLinkLabel = topLink
    ? `${topLink.sourceLabel} -> ${topLink.targetLabel}`
    : "No visible link";
  const topLinkValue = topLink ? topLink.value.toFixed(1) : "0.0";
  const story = topLink
    ? `${hubName} is the current hub, and ${topLinkLabel} is the strongest ${getAssistNetworkLabel(
        selectedAssistMode
      ).toLowerCase()} connection.`
    : `${hubName} is the current hub in the visible network.`;

  if (dataset.exactScopeApplied && dataset.gameCount === 0) {
    return (
      <View style={styles.wrap}>
        <AssistNetworkControls
          value={selectedAssistMode}
          onChange={setSelectedAssistMode}
        />
        <Text style={styles.emptyText}>
          No exact-match games found for this table.
        </Text>
      </View>
    );
  }

  if (dataset.exactScopeApplied && dataset.gameCount > 0 && dataset.edges.length === 0) {
    return (
      <View style={styles.wrap}>
        <AssistNetworkControls
          value={selectedAssistMode}
          onChange={setSelectedAssistMode}
        />
        <Text style={styles.emptyText}>
          These exact-match games have no recorded assist links yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <AssistNetworkDetailsCard
        metricLabel={getAssistNetworkLabel(selectedAssistMode)}
        hubName={hubName}
        netGiverName={netGiverName}
        netReceiverName={netReceiverName}
        topLinkLabel={topLinkLabel}
        topLinkValue={topLinkValue}
        story={story}
      />

      <AssistNetworkControls
        value={selectedAssistMode}
        onChange={setSelectedAssistMode}
      />

      <RelationshipGraph
        players={visiblePlayers as any}
        relationships={dataset.edges as any}
        scopedPlayerIds={scopedPlayerIds}
        variant="assist_network"
        mode={mode}
        assistMode={selectedAssistMode}
        title={title}
        subtitle={subtitle}
        showAssistMetricControl={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
  },
});
