import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import RelationshipGraph from "@/components/charts/RelationshipGraph";
import { buildRelationshipInsightModel } from "@/components/charts/relationshipGraphModel";
import Text from "@/components/ui/Text";
import type { NormalizedGame } from "@/utils/charts";
import AssistNetworkDetailsCard from "./AssistNetworkDetailsCard";
import AssistNetworkImpactSection from "./AssistNetworkImpactSection";
import buildAssistNetworkDataset from "./buildAssistNetworkDataset";
import buildAssistNetworkImpact from "./buildAssistNetworkImpact";
import buildAssistNetworkLayout from "./buildAssistNetworkLayout";

type Player = { id: string; name?: string; color?: string };
type Props = {
  games?: NormalizedGame[];
  players?: Player[];
  scopedPlayerIds?: string[];
  exactScopePlayerIds?: string[];
  mode?: "flow" | "network";
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
  exactScopePlayerIds,
  mode = "network",
  title = "Assist Network",
  subtitle = "Directed assist flow across the filtered sample.",
}: Props) {
  const safeGames = Array.isArray(games) ? games : [];
  const safePlayers = Array.isArray(players) ? players : [];
  const visiblePlayers = useMemo(() => {
    if (!scopedPlayerIds?.length) return safePlayers;
    const allowed = new Set(scopedPlayerIds.map(String));
    return safePlayers.filter((player) => allowed.has(String(player.id)));
  }, [safePlayers, scopedPlayerIds]);

  const dataset = useMemo(
    () =>
      buildAssistNetworkDataset({
        games: safeGames,
        scopedPlayerIds,
        exactScopePlayerIds,
      }),
    [exactScopePlayerIds, safeGames, scopedPlayerIds]
  );
  const layout = useMemo(
    () => buildAssistNetworkLayout(dataset.edges, visiblePlayers),
    [dataset.edges, visiblePlayers]
  );
  const weightedRelationships = useMemo(
    () => buildWeightedRelationships(layout.links),
    [layout.links]
  );
  const insight = useMemo(
    () => buildRelationshipInsightModel(visiblePlayers, weightedRelationships),
    [visiblePlayers, weightedRelationships]
  );
  const impact = useMemo(
    () =>
      buildAssistNetworkImpact({
        games: safeGames,
        exactScopePlayerIds,
      }),
    [exactScopePlayerIds, safeGames]
  );

  const topLink = layout.links[0] ?? null;
  const hubName = layout.nodes[0]?.label ?? insight.hub?.player.name ?? "No hub yet";
  const netGiverName = insight.netGiver?.player.name ?? "None";
  const netReceiverName = insight.netReceiver?.player.name ?? "None";
  const hasRecordedLinks = dataset.edges.length > 0;
  const showZeroLinkNotice =
    dataset.exactScopeApplied && dataset.gameCount > 0 && !hasRecordedLinks;
  const topLinkLabel = topLink
    ? `${topLink.sourceLabel} -> ${topLink.targetLabel}`
    : "No visible link";
  const topLinkValue = topLink ? topLink.labelText : "0.0/game";
  const story = topLink
    ? `${hubName} is the current hub, and ${topLinkLabel} leads at ${topLinkValue}.`
    : `${hubName} is the current hub in the exact filtered table.`;

  if (dataset.exactScopeApplied && dataset.gameCount === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.emptyText}>
          No exact-match games found for this table.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {showZeroLinkNotice ? (
        <Text style={styles.emptyText}>
          These exact-match games have no recorded assist links yet.
        </Text>
      ) : (
        <AssistNetworkDetailsCard
          hubName={hubName}
          netGiverName={netGiverName}
          netReceiverName={netReceiverName}
          topLinkLabel={topLinkLabel}
          topLinkValue={topLinkValue}
          story={story}
        />
      )}

      <RelationshipGraph
        players={visiblePlayers as any}
        relationships={dataset.edges as any}
        scopedPlayerIds={scopedPlayerIds}
        variant="assist_network"
        mode={mode}
        title={title}
        subtitle={subtitle}
        showReadoutCards={false}
      />

      <AssistNetworkImpactSection
        cards={impact.cards}
        sampleGameCount={impact.sampleGameCount}
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
