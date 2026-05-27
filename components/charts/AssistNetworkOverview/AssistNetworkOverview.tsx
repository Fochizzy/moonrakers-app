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
const RELATIONSHIP_EXCLUSION_NOTE =
  "Two-player games are excluded from the relationship chart.";

function normalizePlayerId(value: unknown) {
  return String(value ?? "").trim();
}

function countGamePlayers(game: NormalizedGame) {
  const playerIds = new Set<string>();

  for (const player of game?.players ?? []) {
    const playerId = normalizePlayerId(player?.id);
    if (playerId) {
      playerIds.add(playerId);
    }
  }

  for (const playerIdRaw of Object.keys(game?.totals ?? {})) {
    const playerId = normalizePlayerId(playerIdRaw);
    if (playerId) {
      playerIds.add(playerId);
    }
  }

  return playerIds.size;
}

function filterRelationshipEligibleGames(games: NormalizedGame[]) {
  return games.filter((game) => countGamePlayers(game) >= 3);
}

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
  const eligibleGames = useMemo(
    () => filterRelationshipEligibleGames(safeGames),
    [safeGames]
  );
  const visiblePlayers = useMemo(() => {
    if (!scopedPlayerIds?.length) return safePlayers;
    const allowed = new Set(scopedPlayerIds.map(String));
    return safePlayers.filter((player) => allowed.has(String(player.id)));
  }, [safePlayers, scopedPlayerIds]);

  const dataset = useMemo(
    () =>
      buildAssistNetworkDataset({
        games: eligibleGames,
        scopedPlayerIds,
        exactScopePlayerIds,
      }),
    [eligibleGames, exactScopePlayerIds, scopedPlayerIds]
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
        games: eligibleGames,
        exactScopePlayerIds,
      }),
    [eligibleGames, exactScopePlayerIds]
  );

  const topLink = layout.links[0] ?? null;
  const hubName = layout.nodes[0]?.label ?? insight.hub?.player.name ?? "No hub yet";
  const netGiverName = insight.netGiver?.player.name ?? "None";
  const netReceiverName = insight.netReceiver?.player.name ?? "None";
  const hasRecordedLinks = dataset.edges.length > 0;
  const showZeroLinkState =
    dataset.exactScopeApplied && dataset.gameCount > 0 && !hasRecordedLinks;
  const zeroLinkTitle = dataset.hasAggregateAssistActivityWithoutDirection
    ? "Legacy Assist Data"
    : "No Assist Links Yet";
  const zeroLinkBody = dataset.hasAggregateAssistActivityWithoutDirection
    ? "These older exact-match games only saved aggregate assist totals, not which teammate gave each assist on the turn. Because the directional source links are missing, arrows, labels, and size changes cannot be shown for this table."
    : "These exact-match games do not have any saved directional assist links yet, so arrows, labels, and size changes cannot be shown for this table.";
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
        <View style={styles.noteCard}>
          <Text style={styles.noteLabel}>Sample Note</Text>
          <Text style={styles.noteBody}>{RELATIONSHIP_EXCLUSION_NOTE}</Text>
        </View>
        <Text style={styles.emptyText}>
          No exact-match games found for this table.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.noteCard}>
        <Text style={styles.noteLabel}>Sample Note</Text>
        <Text style={styles.noteBody}>{RELATIONSHIP_EXCLUSION_NOTE}</Text>
      </View>

      {showZeroLinkState ? (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>{zeroLinkTitle}</Text>
          <Text style={styles.warningBody}>{zeroLinkBody}</Text>
        </View>
      ) : (
        <>
          <AssistNetworkDetailsCard
            hubName={hubName}
            netGiverName={netGiverName}
            netReceiverName={netReceiverName}
            topLinkLabel={topLinkLabel}
            topLinkValue={topLinkValue}
            story={story}
          />

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
        </>
      )}

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
  noteCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.24)",
    backgroundColor: "rgba(15,23,42,0.4)",
    padding: 12,
    gap: 4,
  },
  noteLabel: {
    color: "#CBD5F5",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  noteBody: {
    color: "#E2E8F0",
    fontSize: 12,
    lineHeight: 18,
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
  },
  warningCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(45,212,191,0.34)",
    backgroundColor: "rgba(4,47,46,0.18)",
    padding: 12,
    gap: 6,
  },
  warningTitle: {
    color: "#99F6E4",
    fontSize: 12,
    fontWeight: "800",
  },
  warningBody: {
    color: "#E2E8F0",
    fontSize: 12,
    lineHeight: 18,
  },
});
