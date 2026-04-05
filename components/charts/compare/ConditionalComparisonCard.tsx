import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Text from '@/components/ui/Text';
import {
  ConditionalAnalysis,
  ConditionalEntityDelta,
  ConditionalState,
  ConditionalSubjectMode,
} from '@/utils/conditionalCompareHelpers';
import { Group, Player } from '@/utils/compareTypes';

type Entity = {
  id: string;
  name: string;
  color?: string;
};

type Props = {
  players: Player[];
  groups: Group[];
  subjectMode: ConditionalSubjectMode;
  conditionalState: ConditionalState;
  conditionalAnalysis: ConditionalAnalysis;
  sortedConditionalPlayers: ConditionalEntityDelta[];
  onToggleEntity: (id: string) => void;
  onRemoveEntity: (id: string) => void;
  onSetAnchor: (id: string) => void;
  onClear: () => void;
  onApplyCurrentCompare: () => void;
  onApplyTopSynergy: () => void;
  onApplyTopWins: () => void;
  onSetSelectionMode: (nextMode: 'must' | 'may') => void;
  onSetViewMode: (nextMode: 'present' | 'absent') => void;
  onToggleCollapsed: () => void;
  onSort: (key: 'winRateDelta' | 'prestigeDelta' | 'scoreDelta' | 'synergyDelta') => void;
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function formatPercent(value: unknown): string {
  return `${Math.round(toNumber(value))}%`;
}

function formatMetric(value: unknown, digits = 1): string {
  const num = toNumber(value);
  return Number.isInteger(num) ? String(num) : num.toFixed(digits);
}

function formatSigned(value: unknown, digits = 1): string {
  const num = toNumber(value);
  const sign = num > 0 ? '+' : '';
  return `${sign}${formatMetric(num, digits)}`;
}

function activeEntities(subjectMode: ConditionalSubjectMode, players: Player[], groups: Group[]): Entity[] {
  if (subjectMode === 'groups') {
    return groups.map((group) => ({ id: group.id, name: group.name }));
  }
  return players.map((player) => ({ id: player.id, name: player.name, color: player.color }));
}

function getSelectionIds(state: ConditionalState): string[] {
  return Array.from(new Set([...(state.mustIncludeIds ?? []), ...(state.mayIncludeIds ?? [])]));
}

function getEntityName(entities: Entity[], id: string | null | undefined): string {
  if (!id) return 'Choose one';
  return entities.find((entity) => entity.id === id)?.name ?? 'Choose one';
}

function listEntityNames(entities: Entity[], ids: string[]): string {
  const names = ids
    .map((id) => entities.find((entity) => entity.id === id)?.name)
    .filter((value): value is string => Boolean(value));

  if (!names.length) return 'Choose one';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function buildIfThenSentence(entities: Entity[], state: ConditionalState, subjectMode: ConditionalSubjectMode): string {
  const anchor = getEntityName(entities, state.anchorId);
  const action = state.viewMode === 'present' ? 'does' : 'does not';
  const matcher = state.selectionMode === 'must' ? 'all of' : 'any of';
  const related = listEntityNames(
    entities,
    state.selectionMode === 'must' ? state.mustIncludeIds : state.mayIncludeIds
  );
  const noun = subjectMode === 'groups' ? 'group' : 'player';
  return `If ${anchor} ${action} appear with ${matcher} ${related}, then this leaderboard shows how ${noun} outcomes change.`;
}

function buildSummaryLines(rows: ConditionalEntityDelta[], subjectMode: ConditionalSubjectMode): string[] {
  if (!rows.length) {
    return ['No conditional results yet.'];
  }

  const noun = subjectMode === 'groups' ? 'group' : 'player';
  const winLeader = [...rows].sort((a, b) => toNumber(b.winRateDelta) - toNumber(a.winRateDelta))[0];
  const prestigeLeader = [...rows].sort((a, b) => toNumber(b.prestigeDelta) - toNumber(a.prestigeDelta))[0];
  const synergyLeader = [...rows].sort((a, b) => toNumber(b.synergyDelta) - toNumber(a.synergyDelta))[0];

  return [
    `${winLeader.name} has the biggest ${noun} win-rate swing at ${formatSigned(winLeader.winRateDelta, 1)}.`,
    `${prestigeLeader.name} has the biggest prestige swing at ${formatSigned(prestigeLeader.prestigeDelta, 1)} per game.`,
    `${synergyLeader.name} has the biggest synergy shift at ${formatSigned(synergyLeader.synergyDelta, 2)}.`,
  ];
}

export default function ConditionalComparisonCard({
  players,
  groups,
  subjectMode,
  conditionalState,
  conditionalAnalysis,
  sortedConditionalPlayers,
  onToggleEntity,
  onRemoveEntity,
  onSetAnchor,
  onClear,
  onApplyCurrentCompare,
  onApplyTopSynergy,
  onApplyTopWins,
  onSetSelectionMode,
  onSetViewMode,
  onToggleCollapsed,
  onSort,
}: Props) {
  const entities = useMemo(
    () => activeEntities(subjectMode, players, groups),
    [subjectMode, players, groups]
  );

  const selectedIds = useMemo(() => getSelectionIds(conditionalState), [conditionalState]);

  const availableEntities = useMemo(
    () => entities.filter((entity) => entity.id !== conditionalState.anchorId),
    [entities, conditionalState.anchorId]
  );

  const sentence = useMemo(
    () => buildIfThenSentence(entities, conditionalState, subjectMode),
    [entities, conditionalState, subjectMode]
  );

  const summaryLines = useMemo(
    () => buildSummaryLines(sortedConditionalPlayers, subjectMode),
    [sortedConditionalPlayers, subjectMode]
  );

  const collapsed = !!conditionalState.selectorCollapsed;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Conditional Comparison</Text>

        <View style={styles.headerActions}>
          <Pressable onPress={onClear} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </Pressable>

          <Pressable onPress={onToggleCollapsed} style={styles.collapseButton}>
            <Text style={styles.collapseButtonText}>{collapsed ? 'Expand' : 'Collapse'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sentenceCard}>
        <Text style={styles.sentenceEyebrow}>Live Condition</Text>
        <Text style={styles.sentenceText}>{sentence}</Text>
      </View>

      {!collapsed ? (
        <View style={styles.builderStack}>
          <View style={styles.builderRow}>
            <Text style={styles.builderLabel}>If...</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
              {entities.map((entity) => {
                const active = conditionalState.anchorId === entity.id;
                return (
                  <Pressable
                    key={entity.id}
                    onPress={() => onSetAnchor(entity.id)}
                    style={[styles.entityPill, active && styles.entityPillAnchor]}
                  >
                    <Text style={[styles.entityPillText, active && styles.entityPillTextActive]}>
                      {entity.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.builderRow}>
            <Text style={styles.builderLabel}>Does / Does Not...</Text>
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => onSetViewMode('present')}
                style={[styles.actionPill, conditionalState.viewMode === 'present' && styles.actionPillActive]}
              >
                <Text style={[styles.actionPillText, conditionalState.viewMode === 'present' && styles.actionPillTextActive]}>
                  Does
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onSetViewMode('absent')}
                style={[styles.actionPill, conditionalState.viewMode === 'absent' && styles.actionPillActive]}
              >
                <Text style={[styles.actionPillText, conditionalState.viewMode === 'absent' && styles.actionPillTextActive]}>
                  Does Not
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onSetSelectionMode('must')}
                style={[styles.actionPill, conditionalState.selectionMode === 'must' && styles.actionPillSecondaryActive]}
              >
                <Text style={[styles.actionPillText, conditionalState.selectionMode === 'must' && styles.actionPillTextActive]}>
                  All Of
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onSetSelectionMode('may')}
                style={[styles.actionPill, conditionalState.selectionMode === 'may' && styles.actionPillSecondaryActive]}
              >
                <Text style={[styles.actionPillText, conditionalState.selectionMode === 'may' && styles.actionPillTextActive]}>
                  Any Of
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.builderRow}>
            <Text style={styles.builderLabel}>With...</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
              {availableEntities.map((entity) => {
                const active = selectedIds.includes(entity.id);
                return (
                  <Pressable
                    key={entity.id}
                    onPress={() => onToggleEntity(entity.id)}
                    style={[styles.entityPill, active && styles.entityPillActive]}
                  >
                    <Text style={[styles.entityPillText, active && styles.entityPillTextActive]}>
                      {entity.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      ) : null}

      <View style={styles.summaryGrid}>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryLabel}>Samples</Text>
          <Text style={styles.summaryValue}>{conditionalAnalysis?.sampleSize ?? 0}</Text>
        </View>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryLabel}>Anchor Win Rate</Text>
          <Text style={styles.summaryValue}>{formatPercent(conditionalAnalysis?.winRate)}</Text>
        </View>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryLabel}>Anchor Prestige</Text>
          <Text style={styles.summaryValue}>{formatMetric(conditionalAnalysis?.avgPrestige)}</Text>
        </View>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryLabel}>Anchor Score</Text>
          <Text style={styles.summaryValue}>{formatMetric(conditionalAnalysis?.avgScore)}</Text>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Conditional Leaderboard</Text>

        <View style={styles.sortRow}>
          <Pressable style={styles.sortChip} onPress={() => onSort('winRateDelta')}>
            <Text style={styles.sortChipText}>Win Δ</Text>
          </Pressable>
          <Pressable style={styles.sortChip} onPress={() => onSort('prestigeDelta')}>
            <Text style={styles.sortChipText}>Prestige Δ</Text>
          </Pressable>
          <Pressable style={styles.sortChip} onPress={() => onSort('scoreDelta')}>
            <Text style={styles.sortChipText}>Score Δ</Text>
          </Pressable>
          <Pressable style={styles.sortChip} onPress={() => onSort('synergyDelta')}>
            <Text style={styles.sortChipText}>Synergy Δ</Text>
          </Pressable>
        </View>
      </View>

      {sortedConditionalPlayers.length === 0 ? (
        <Text style={styles.emptyText}>No conditional data yet for this selection.</Text>
      ) : (
        <View style={styles.rows}>
          {sortedConditionalPlayers.map((row) => (
            <View key={row.id} style={[styles.resultRow, row.isAnchor && styles.resultRowAnchor]}>
              <View style={styles.resultIdentity}>
                <Text style={styles.resultName}>{row.name}</Text>
                {row.isAnchor ? <Text style={styles.resultAnchorTag}>Anchor</Text> : null}
              </View>

              <View style={styles.metricStrip}>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Games</Text>
                  <Text style={styles.metricValue}>{row.sampleGames}</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Win %</Text>
                  <Text style={styles.metricValue}>{formatPercent(row.sampleWinRate)}</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Prestige</Text>
                  <Text style={styles.metricValue}>{formatMetric(row.samplePrestigePerGame)}</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Score</Text>
                  <Text style={styles.metricValue}>{formatMetric(row.sampleScorePerGame)}</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Win Δ</Text>
                  <Text style={styles.metricValue}>{formatSigned(row.winRateDelta, 1)}</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Synergy Δ</Text>
                  <Text style={styles.metricValue}>{formatSigned(row.synergyDelta, 2)}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Summary</Text>
        {summaryLines.map((line) => (
          <Text key={line} style={styles.helpText}>
            • {line}
          </Text>
        ))}
        {!!conditionalAnalysis?.summary ? (
          <Text style={styles.helpText}>• {conditionalAnalysis.summary}</Text>
        ) : null}
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Based on</Text>
      </View>

      {sortedConditionalPlayers.length === 0 ? (
        <Text style={styles.emptyText}>No baseline comparison data yet.</Text>
      ) : (
        <View style={styles.rows}>
          {sortedConditionalPlayers.map((row) => (
            <View key={`${row.id}-baseline`} style={styles.basisRow}>
              <Text style={styles.resultName}>{row.name}</Text>
              <View style={styles.metricStrip}>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Base Win %</Text>
                  <Text style={styles.metricValue}>{formatPercent(row.overallWinRate)}</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Base Prestige</Text>
                  <Text style={styles.metricValue}>{formatMetric(row.overallPrestigePerGame)}</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Base Score</Text>
                  <Text style={styles.metricValue}>{formatMetric(row.overallScorePerGame)}</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Base Synergy</Text>
                  <Text style={styles.metricValue}>{formatMetric(row.overallSynergy, 2)}</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Sample Games</Text>
                  <Text style={styles.metricValue}>{row.sampleGames}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: 'rgba(7, 12, 24, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.18)',
    gap: 14,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: '#f8fafc',
  },
  collapseButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.28)',
    backgroundColor: 'rgba(15,23,42,0.88)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  collapseButtonText: {
    color: '#e2e8f0',
    fontWeight: '800',
    fontSize: 12,
  },
  clearButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: 'rgba(127,29,29,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.45)',
  },
  clearButtonText: {
    color: '#fecaca',
    fontSize: 12,
    fontWeight: '800',
  },
  sentenceCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(71,85,105,0.35)',
    gap: 8,
  },
  sentenceEyebrow: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sentenceText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 23,
  },
  builderStack: {
    gap: 12,
  },
  builderRow: {
    gap: 8,
  },
  builderLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(71,85,105,0.45)',
  },
  actionPillActive: {
    backgroundColor: 'rgba(37,99,235,0.25)',
    borderColor: 'rgba(96,165,250,0.7)',
  },
  actionPillSecondaryActive: {
    backgroundColor: 'rgba(14,116,144,0.25)',
    borderColor: 'rgba(34,211,238,0.7)',
  },
  actionPillText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '800',
  },
  actionPillTextActive: {
    color: '#ffffff',
  },
  selectorScroll: {
    gap: 8,
    paddingRight: 8,
  },
  entityPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(71,85,105,0.4)',
  },
  entityPillActive: {
    backgroundColor: 'rgba(37,99,235,0.22)',
    borderColor: 'rgba(96,165,250,0.62)',
  },
  entityPillAnchor: {
    backgroundColor: 'rgba(14,116,144,0.24)',
    borderColor: 'rgba(34,211,238,0.62)',
  },
  entityPillText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '800',
  },
  entityPillTextActive: {
    color: '#ffffff',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryTile: {
    minWidth: 110,
    flexGrow: 1,
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(71,85,105,0.35)',
  },
  summaryLabel: {
    color: '#9fb3d1',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  summaryValue: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
  },
  sectionBlock: {
    gap: 10,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
  },
  helpText: {
    color: '#9fb3d1',
    fontSize: 12,
    lineHeight: 18,
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(71,85,105,0.45)',
  },
  sortChipText: {
    color: '#dbeafe',
    fontSize: 11,
    fontWeight: '800',
  },
  rows: {
    gap: 10,
  },
  resultRow: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(71,85,105,0.35)',
    gap: 10,
  },
  resultRowAnchor: {
    borderColor: 'rgba(96,165,250,0.72)',
    backgroundColor: 'rgba(30,41,59,0.98)',
  },
  basisRow: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: 'rgba(15,23,42,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(71,85,105,0.3)',
    gap: 10,
  },
  resultIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  resultName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
  },
  resultAnchorTag: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '800',
  },
  metricStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCell: {
    minWidth: 74,
  },
  metricLabel: {
    color: '#9fb3d1',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 12,
  },
});
