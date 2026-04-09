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
  title?: string;
  description?: string;
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

function getSentenceParts(
  entities: Entity[],
  state: ConditionalState,
  subjectMode: ConditionalSubjectMode
) {
  const anchor = getEntityName(entities, state.anchorId);
  const action = state.viewMode === 'present' ? 'does' : 'does not';
  const matcher = state.selectionMode === 'must' ? 'all of' : 'any of';
  const related = listEntityNames(
    entities,
    state.selectionMode === 'must' ? state.mustIncludeIds : state.mayIncludeIds
  );
  const noun = subjectMode === 'groups' ? 'group' : 'player';

  return { anchor, action, matcher, related, noun };
}

function buildSummaryLines(rows: ConditionalEntityDelta[], subjectMode: ConditionalSubjectMode): string[] {
  if (!rows.length) return ['No conditional results yet.'];

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

const SORT_ITEMS: Array<{ key: 'winRateDelta' | 'prestigeDelta' | 'scoreDelta' | 'synergyDelta'; label: string; sub: string }> = [
  { key: 'winRateDelta', label: 'Win Δ', sub: 'Outcome swing' },
  { key: 'prestigeDelta', label: 'Prestige Δ', sub: 'Scoring pace' },
  { key: 'scoreDelta', label: 'Score Δ', sub: 'Point pressure' },
  { key: 'synergyDelta', label: 'Synergy Δ', sub: 'Table fit' },
];

export default function ConditionalComparisonCard({
  title,
  description,
  players,
  groups,
  subjectMode,
  conditionalState,
  conditionalAnalysis,
  sortedConditionalPlayers,
  onToggleEntity,
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
  const entities = useMemo(() => activeEntities(subjectMode, players, groups), [subjectMode, players, groups]);
  const selectedIds = useMemo(() => getSelectionIds(conditionalState), [conditionalState]);
  const availableEntities = useMemo(
    () => entities.filter((entity) => entity.id !== conditionalState.anchorId),
    [entities, conditionalState.anchorId]
  );
  const sentence = useMemo(
    () => buildIfThenSentence(entities, conditionalState, subjectMode),
    [entities, conditionalState, subjectMode]
  );
  const sentenceParts = useMemo(
    () => getSentenceParts(entities, conditionalState, subjectMode),
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
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{title ?? 'Conditional affect'}</Text>
          <Text style={styles.title}>Sentence-driven comparison</Text>
          <Text style={styles.subtitle}>
            {description ?? 'Build a condition with larger selector cards. The live sentence stays front and center.'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable onPress={onClear} style={[styles.topButton, styles.clearButton]}>
            <Text style={styles.topButtonText}>Clear</Text>
          </Pressable>
          <Pressable onPress={onToggleCollapsed} style={styles.topButton}>
            <Text style={styles.topButtonText}>{collapsed ? 'Expand' : 'Collapse'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sentenceCardCompact}>
        <Text style={styles.sentenceTextCompact}>
          <Text style={styles.sentenceStatic}>If </Text>
          <Text style={styles.sentenceTokenPrimary}>{sentenceParts.anchor}</Text>
          <Text style={styles.sentenceStatic}> </Text>
          <Text style={styles.sentenceTokenSecondary}>{sentenceParts.action}</Text>
          <Text style={styles.sentenceStatic}> appear with </Text>
          <Text style={styles.sentenceTokenSecondary}>{sentenceParts.matcher}</Text>
          <Text style={styles.sentenceStatic}> </Text>
          <Text style={styles.sentenceTokenPrimary}>{sentenceParts.related}</Text>
          <Text style={styles.sentenceStatic}>{`, then this leaderboard shows how `}</Text>
          <Text style={styles.sentenceTokenTertiary}>{sentenceParts.noun}</Text>
          <Text style={styles.sentenceStatic}> outcomes change.</Text>
        </Text>
      </View>

      {!collapsed ? (
        <View style={styles.builderStack}>
          <View style={styles.builderSection}>
            <Text style={styles.builderLabel}>1. Anchor</Text>
            <Text style={styles.builderHelp}>Choose the main player or group the sentence starts from.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>
              {entities.map((entity) => {
                const active = conditionalState.anchorId === entity.id;
                return (
                  <Pressable
                    key={entity.id}
                    onPress={() => onSetAnchor(entity.id)}
                    style={[styles.selectorCard, active && styles.selectorCardAnchor]}
                  >
                    <View style={styles.selectorIdentity}>
                      <View
                        style={[
                          styles.selectorDot,
                          entity.color ? { backgroundColor: entity.color } : null,
                          active && styles.selectorDotActive,
                        ]}
                      />
                      <Text style={[styles.selectorTitle, active && styles.selectorTitleActive]}>{entity.name}</Text>
                    </View>
                    <Text style={[styles.selectorSub, active && styles.selectorSubActive]}>
                      {active ? 'Anchor selected' : 'Tap to set as anchor'}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.controlGrid}>
            <View style={styles.controlPanel}>
              <Text style={styles.controlTitle}>2. Presence</Text>
              <Text style={styles.controlSub}>Set whether the anchor appears or does not appear.</Text>

              <View style={styles.optionRow}>
                <Pressable
                  onPress={() => onSetViewMode('present')}
                  style={[styles.optionCard, conditionalState.viewMode === 'present' && styles.optionCardActive]}
                >
                  <Text style={[styles.optionLabel, conditionalState.viewMode === 'present' && styles.optionLabelActive]}>
                    Does
                  </Text>
                  <Text style={[styles.optionHint, conditionalState.viewMode === 'present' && styles.optionHintActive]}>
                    Anchor is present
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => onSetViewMode('absent')}
                  style={[styles.optionCard, conditionalState.viewMode === 'absent' && styles.optionCardActive]}
                >
                  <Text style={[styles.optionLabel, conditionalState.viewMode === 'absent' && styles.optionLabelActive]}>
                    Does not
                  </Text>
                  <Text style={[styles.optionHint, conditionalState.viewMode === 'absent' && styles.optionHintActive]}>
                    Anchor is absent
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.controlPanel}>
              <Text style={styles.controlTitle}>3. Match rule</Text>
              <Text style={styles.controlSub}>Choose whether all selected partners must appear, or any one can.</Text>

              <View style={styles.optionRow}>
                <Pressable
                  onPress={() => onSetSelectionMode('must')}
                  style={[styles.optionCard, conditionalState.selectionMode === 'must' && styles.optionCardSecondary]}
                >
                  <Text style={[styles.optionLabel, conditionalState.selectionMode === 'must' && styles.optionLabelActive]}>
                    All of
                  </Text>
                  <Text style={[styles.optionHint, conditionalState.selectionMode === 'must' && styles.optionHintActive]}>
                    Require every selected item
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => onSetSelectionMode('may')}
                  style={[styles.optionCard, conditionalState.selectionMode === 'may' && styles.optionCardSecondary]}
                >
                  <Text style={[styles.optionLabel, conditionalState.selectionMode === 'may' && styles.optionLabelActive]}>
                    Any of
                  </Text>
                  <Text style={[styles.optionHint, conditionalState.selectionMode === 'may' && styles.optionHintActive]}>
                    Match one or more items
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.builderSection}>
            <Text style={styles.builderLabel}>4. Partners</Text>
            <Text style={styles.builderHelp}>Add the people or groups that complete the sentence.</Text>
            <View style={styles.selectionGrid}>
              {availableEntities.map((entity) => {
                const active = selectedIds.includes(entity.id);

                return (
                  <Pressable
                    key={entity.id}
                    onPress={() => onToggleEntity(entity.id)}
                    style={[styles.partnerCard, active && styles.partnerCardActive]}
                  >
                    <View style={styles.selectorIdentity}>
                      <View style={[styles.selectorDot, entity.color ? { backgroundColor: entity.color } : null]} />
                      <Text style={[styles.selectorTitle, active && styles.selectorTitleActive]}>{entity.name}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.quickActions}>
            <Pressable onPress={onApplyCurrentCompare} style={styles.quickActionCard}>
              <Text style={styles.quickActionTitle}>Use Current Compare</Text>
            </Pressable>
            <Pressable onPress={onApplyTopWins} style={styles.quickActionCard}>
              <Text style={styles.quickActionTitle}>Top Wins</Text>
            </Pressable>
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
        <Text style={styles.sectionTitle}>Sort leaderboard by</Text>
        <View style={styles.sortGrid}>
          {SORT_ITEMS.map((item) => (
            <Pressable key={item.key} onPress={() => onSort(item.key)} style={styles.sortCard}>
              <Text style={styles.sortTitle}>{item.label}</Text>
              <Text style={styles.sortSub}>{item.sub}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Conditional leaderboard</Text>

        {sortedConditionalPlayers.length === 0 ? (
          <Text style={styles.emptyText}>No conditional data yet for this selection.</Text>
        ) : (
          <View style={styles.rows}>
            {sortedConditionalPlayers.map((row) => (
              <View key={row.id} style={[styles.resultRow, row.isAnchor && styles.resultRowAnchor]}>
                <View style={styles.resultHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName}>{row.name}</Text>
                    <Text style={styles.resultSub}>
                      {row.isAnchor ? 'Anchor baseline row' : `${row.sampleGames} sample games`}
                    </Text>
                  </View>
                  {row.isAnchor ? (
                    <View style={styles.anchorBadge}>
                      <Text style={styles.anchorBadgeText}>Anchor</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.metricGrid}>
                  <View style={styles.metricCell}>
                    <Text style={styles.metricLabel} numberOfLines={1}>Win %</Text>
                    <Text style={styles.metricValue}>{formatPercent(row.sampleWinRate)}</Text>
                  </View>
                  <View style={styles.metricCell}>
                    <Text style={styles.metricLabel} numberOfLines={1}>Prestige</Text>
                    <Text style={styles.metricValue}>{formatMetric(row.samplePrestigePerGame)}</Text>
                  </View>
                  <View style={styles.metricCell}>
                    <Text style={styles.metricLabel} numberOfLines={1}>Score</Text>
                    <Text style={styles.metricValue}>{formatMetric(row.sampleScorePerGame)}</Text>
                  </View>
                  <View style={styles.metricCell}>
                    <Text style={styles.metricLabel} numberOfLines={1}>Win Δ</Text>
                    <Text style={styles.metricValue}>{formatSigned(row.winRateDelta, 1)}</Text>
                  </View>
                  <View style={styles.metricCell}>
                    <Text style={styles.metricLabel} numberOfLines={1}>Prestige Δ</Text>
                    <Text style={styles.metricValue}>{formatSigned(row.prestigeDelta, 1)}</Text>
                  </View>
                  <View style={styles.metricCell}>
                    <Text style={styles.metricLabel} numberOfLines={1}>Synergy Δ</Text>
                    <Text style={styles.metricValue}>{formatSigned(row.synergyDelta, 2)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Summary</Text>
        {summaryLines.map((line) => (
          <Text key={line} style={styles.helpText}>
            • {line}
          </Text>
        ))}
        {!!conditionalAnalysis?.summary ? <Text style={styles.helpText}>• {conditionalAnalysis.summary}</Text> : null}
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Baseline comparison</Text>

        {sortedConditionalPlayers.length === 0 ? (
          <Text style={styles.emptyText}>No baseline comparison data yet.</Text>
        ) : (
          <View style={styles.rows}>
            {sortedConditionalPlayers.map((row) => (
              <View key={`${row.id}-baseline`} style={styles.basisRow}>
                <Text style={styles.resultName}>{row.name}</Text>
                <View style={styles.metricGrid}>
                  <View style={styles.metricCell}>
                    <Text style={styles.metricLabel} numberOfLines={1}>Base Win %</Text>
                    <Text style={styles.metricValue}>{formatPercent(row.overallWinRate)}</Text>
                  </View>
                  <View style={styles.metricCell}>
                    <Text style={styles.metricLabel} numberOfLines={1}>Base Prestige</Text>
                    <Text style={styles.metricValue}>{formatMetric(row.overallPrestigePerGame)}</Text>
                  </View>
                  <View style={styles.metricCell}>
                    <Text style={styles.metricLabel} numberOfLines={1}>Base Score</Text>
                    <Text style={styles.metricValue}>{formatMetric(row.overallScorePerGame)}</Text>
                  </View>
                  <View style={styles.metricCell}>
                    <Text style={styles.metricLabel} numberOfLines={1}>Base Synergy</Text>
                    <Text style={styles.metricValue}>{formatMetric(row.overallSynergy, 2)}</Text>
                  </View>
                  <View style={styles.metricCell}>
                    <Text style={styles.metricLabel} numberOfLines={1}>Sample Games</Text>
                    <Text style={styles.metricValue}>{row.sampleGames}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: 'rgba(7, 12, 24, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.18)',
    gap: 6,
  },
  eyebrow: {
    color: '#7DEBFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 2,
  },
  title: {
    color: '#F8FBFF',
    fontSize: 15,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 4,
    color: '#96A8C4',
    fontSize: 11,
    lineHeight: 15,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  headerActions: {
    gap: 6,
  },
  topButton: {
    minWidth: 74,
    minHeight: 34,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
    backgroundColor: 'rgba(15,23,42,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    backgroundColor: 'rgba(127,29,29,0.20)',
    borderColor: 'rgba(248,113,113,0.20)',
  },
  topButtonText: {
    color: '#E2E8F0',
    fontWeight: '800',
    fontSize: 12,
  },
  sentenceCardCompact: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(10, 18, 36, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(125,235,255,0.24)',
  },
  sentenceTextCompact: {
    color: '#F8FBFF',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },
  sentenceStatic: {
    color: '#D9E6F7',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },
  sentenceTokenPrimary: {
    color: '#7DEBFF',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  sentenceTokenSecondary: {
    color: '#C4B5FD',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  sentenceTokenTertiary: {
    color: '#86EFAC',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  builderStack: {
    gap: 6,
  },
  builderSection: {
    gap: 6,
  },
  builderLabel: {
    color: '#F8FBFF',
    fontSize: 12,
    fontWeight: '800',
  },
  builderHelp: {
    color: '#96A8C4',
    fontSize: 10,
    lineHeight: 14,
  },
  horizontalCards: {
    gap: 6,
    paddingRight: 6,
  },
  selectorCard: {
    width: 148,
    minHeight: 68,
    borderRadius: 12,
    padding: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    justifyContent: 'space-between',
  },
  selectorCardAnchor: {
    backgroundColor: 'rgba(86, 120, 255, 0.22)',
    borderColor: 'rgba(125, 235, 255, 0.52)',
  },
  selectorIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(148,163,184,0.42)',
  },
  selectorDotActive: {
    shadowColor: '#7DEBFF',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  selectorTitle: {
    flex: 1,
    color: '#E5EEF9',
    fontSize: 12,
    fontWeight: '800',
  },
  selectorTitleActive: {
    color: '#FFFFFF',
  },
  selectorSub: {
    color: '#8FA6C4',
    fontSize: 10,
    marginTop: 4,
  },
  selectorSubActive: {
    color: '#D7F7FF',
  },
  controlGrid: {
    gap: 6,
  },
  controlPanel: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    gap: 8,
  },
  controlTitle: {
    color: '#F8FBFF',
    fontSize: 12,
    fontWeight: '800',
  },
  controlSub: {
    color: '#96A8C4',
    fontSize: 10,
    lineHeight: 14,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionCard: {
    flex: 1,
    minHeight: 84,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    backgroundColor: 'rgba(11, 18, 32, 0.94)',
    justifyContent: 'center',
  },
  optionCardActive: {
    backgroundColor: 'rgba(86, 120, 255, 0.22)',
    borderColor: 'rgba(125, 235, 255, 0.52)',
  },
  optionCardSecondary: {
    backgroundColor: 'rgba(168, 85, 247, 0.18)',
    borderColor: 'rgba(196, 181, 253, 0.48)',
  },
  optionLabel: {
    color: '#E5EEF9',
    fontSize: 12,
    fontWeight: '800',
  },
  optionLabelActive: {
    color: '#FFFFFF',
  },
  optionHint: {
    color: '#8FA6C4',
    fontSize: 12,
    marginTop: 5,
    lineHeight: 17,
  },
  optionHintActive: {
    color: '#E6F8FF',
  },
  selectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  partnerCard: {
    width: '48.4%',
    minHeight: 42,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    justifyContent: 'center',
  },
  partnerCardActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.16)',
    borderColor: 'rgba(74, 222, 128, 0.42)',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickActionCard: {
    flex: 1,
    minWidth: 150,
    minHeight: 42,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionTitle: {
    color: '#F8FBFF',
    fontSize: 12,
    fontWeight: '800',
  },
  quickActionSub: {
    color: '#8FA6C4',
    fontSize: 12,
    marginTop: 5,
    lineHeight: 18,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryTile: {
    flex: 1,
    minWidth: 120,
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
  },
  summaryLabel: {
    color: '#8FA6C4',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  summaryValue: {
    marginTop: 7,
    color: '#F8FBFF',
    fontSize: 21,
    fontWeight: '900',
  },
  sectionBlock: {
    gap: 8,
  },
  sectionTitle: {
    color: '#F8FBFF',
    fontSize: 12,
    fontWeight: '800',
  },
  sortGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortCard: {
    width: '48.4%',
    minHeight: 78,
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    justifyContent: 'center',
  },
  sortTitle: {
    color: '#F8FBFF',
    fontSize: 12,
    fontWeight: '800',
  },
  sortSub: {
    marginTop: 4,
    color: '#8FA6C4',
    fontSize: 12,
  },
  rows: {
    gap: 8,
  },
  resultRow: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.90)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    gap: 6,
  },
  resultRowAnchor: {
    backgroundColor: 'rgba(86, 120, 255, 0.16)',
    borderColor: 'rgba(125, 235, 255, 0.34)',
  },
  basisRow: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: 'rgba(11, 18, 32, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    gap: 6,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultName: {
    color: '#F8FBFF',
    fontSize: 12,
    fontWeight: '800',
  },
  resultSub: {
    color: '#8FA6C4',
    fontSize: 12,
    marginTop: 4,
  },
  anchorBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(125, 235, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(125, 235, 255, 0.28)',
  },
  anchorBadgeText: {
    color: '#EFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCell: {
    width: '31%',
    minWidth: 96,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'rgba(8, 14, 28, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.10)',
  },
  metricLabel: {
    color: '#8FA6C4',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    color: '#F8FBFF',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 6,
  },
  helpText: {
    color: '#C9D8EC',
    fontSize: 13,
    lineHeight: 20,
  },
  emptyText: {
    color: '#8FA6C4',
    fontSize: 13,
    lineHeight: 19,
  },
});


