import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
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
  quickSelectIds: string[];
  subjectMode: ConditionalSubjectMode;
  conditionalState: ConditionalState;
  conditionalAnalysis: ConditionalAnalysis;
  sortedConditionalPlayers: ConditionalEntityDelta[];
  onToggleEntity: (id: string) => void;
  onRemoveEntity: (id: string) => void;
  onSetAnchor: (id: string) => void;
  onClear: () => void;
  onRunCompare: () => void;
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

function getEntityName(entities: Entity[], id: string | null | undefined): string | null {
  if (!id) return null;
  return entities.find((entity) => entity.id === id)?.name ?? null;
}

function listEntityNames(entities: Entity[], ids: string[]): string[] {
  return ids
    .map((id) => entities.find((entity) => entity.id === id)?.name)
    .filter((value): value is string => Boolean(value));
}

function formatEntityList(names: string[]): string | null {
  if (!names.length) return null;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function toPossessiveLabel(name: string): string {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

function getSentenceParts(
  entities: Entity[],
  state: ConditionalState,
  subjectMode: ConditionalSubjectMode
) {
  const anchor = getEntityName(entities, state.anchorId) ?? 'anchor';
  const action = state.viewMode === 'present' ? 'does' : 'does not';
  const matcher = state.selectionMode === 'must' ? 'all of' : 'any of';
  const relatedNames = listEntityNames(
    entities,
    state.selectionMode === 'must' ? state.mustIncludeIds : state.mayIncludeIds
  );
  const fallbackRelated = subjectMode === 'groups' ? 'group partner' : 'partner';
  const related = formatEntityList(relatedNames) ?? fallbackRelated;
  const outcomeLabel = getEntityName(entities, state.anchorId)
    ? toPossessiveLabel(anchor)
    : 'anchor';

  return { anchor, action, matcher, related, outcomeLabel };
}

function buildSummaryLines(rows: ConditionalEntityDelta[], subjectMode: ConditionalSubjectMode): string[] {
  if (!rows.length) return ['No results yet.'];

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

function hasMeaningfulConditionalDelta(rows: ConditionalEntityDelta[]): boolean {
  return rows.some((row) => {
    if (row.isAnchor) return false;
    return (
      Math.abs(toNumber(row.winRateDelta)) > 0.01 ||
      Math.abs(toNumber(row.prestigeDelta)) > 0.01 ||
      Math.abs(toNumber(row.scoreDelta)) > 0.01 ||
      Math.abs(toNumber(row.synergyDelta)) > 0.01
    );
  });
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
  quickSelectIds,
  subjectMode,
  conditionalState,
  conditionalAnalysis,
  sortedConditionalPlayers,
  onToggleEntity,
  onSetAnchor,
  onClear,
  onRunCompare,
  onSetSelectionMode,
  onSetViewMode,
  onToggleCollapsed,
  onSort,
}: Props) {
  const [showBaseline, setShowBaseline] = useState(false);
  const [anchorSearchQuery, setAnchorSearchQuery] = useState('');
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  const entities = useMemo(() => activeEntities(subjectMode, players, groups), [subjectMode, players, groups]);
  const selectedIds = useMemo(() => getSelectionIds(conditionalState), [conditionalState]);
  const availableEntities = useMemo(
    () => entities.filter((entity) => entity.id !== conditionalState.anchorId),
    [entities, conditionalState.anchorId]
  );
  const quickSelectEntities = useMemo(
    () =>
      quickSelectIds.map((id) => entities.find((entity) => entity.id === id)).filter((entity): entity is Entity => Boolean(entity)),
    [entities, quickSelectIds]
  );
  const partnerQuickSelectEntities = useMemo(
    () => quickSelectEntities.filter((entity) => entity.id !== conditionalState.anchorId),
    [conditionalState.anchorId, quickSelectEntities]
  );
  const normalizedAnchorSearchQuery = anchorSearchQuery.trim().toLowerCase();
  const normalizedPartnerSearchQuery = partnerSearchQuery.trim().toLowerCase();
  const filteredAnchorEntities = useMemo(
    () =>
      entities.filter((entity) =>
        normalizedAnchorSearchQuery.length === 0
          ? true
          : entity.name.toLowerCase().includes(normalizedAnchorSearchQuery)
      ),
    [entities, normalizedAnchorSearchQuery]
  );
  const filteredPartnerEntities = useMemo(
    () =>
      availableEntities.filter((entity) =>
        normalizedPartnerSearchQuery.length === 0
          ? true
          : entity.name.toLowerCase().includes(normalizedPartnerSearchQuery)
      ),
    [availableEntities, normalizedPartnerSearchQuery]
  );
  const sentenceParts = useMemo(
    () => getSentenceParts(entities, conditionalState, subjectMode),
    [entities, conditionalState, subjectMode]
  );
  const summaryLines = useMemo(
    () => buildSummaryLines(sortedConditionalPlayers, subjectMode),
    [sortedConditionalPlayers, subjectMode]
  );
  const shouldShowConditionalSummary = useMemo(
    () => hasMeaningfulConditionalDelta(sortedConditionalPlayers),
    [sortedConditionalPlayers]
  );
  const collapsed = !!conditionalState.selectorCollapsed;
  const sampleSize = conditionalAnalysis?.sampleSize ?? 0;
  const hasSentenceSelection = Boolean(conditionalState.anchorId) && selectedIds.length > 0;
  const shouldShowConditionalDetails = conditionalState.hasRunCompare && hasSentenceSelection && sampleSize > 0;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{title ?? 'Conditional'}</Text>
          <Text style={styles.title}>Live sentence</Text>
          {description ? <Text style={styles.subtitle}>{description}</Text> : null}
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
          <Text style={styles.sentenceTokenTertiary}>{sentenceParts.outcomeLabel}</Text>
          <Text style={styles.sentenceStatic}> outcomes change.</Text>
        </Text>
      </View>

      {!collapsed ? (
        <View style={styles.builderStack}>
          <View style={styles.builderSection}>
            <Text style={styles.builderLabel}>Anchor</Text>
            <TextInput
              value={anchorSearchQuery}
              onChangeText={setAnchorSearchQuery}
              placeholder={subjectMode === 'groups' ? 'Search groups for anchor' : 'Search players for anchor'}
              placeholderTextColor="#8FA6C4"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.searchInput}
            />
            <Text style={styles.builderHelp}>
              Search and tap a result to set the anchor for this condition.
            </Text>

            {quickSelectEntities.length > 0 ? (
              <View style={styles.quickSelectBlock}>
                <Text style={styles.quickSelectLabel}>Quick select</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickSelectCards}>
                  {quickSelectEntities.map((entity) => {
                    const active = conditionalState.anchorId === entity.id;
                    return (
                      <Pressable
                        key={`anchor-quick-${entity.id}`}
                        onPress={() => onSetAnchor(entity.id)}
                        style={[styles.quickSelectCard, active && styles.quickSelectCardActive]}
                      >
                        <View
                          style={[
                            styles.selectorDot,
                            entity.color ? { backgroundColor: entity.color } : null,
                            active && styles.selectorDotActive,
                          ]}
                        />
                        <Text style={[styles.quickSelectText, active && styles.quickSelectTextActive]} numberOfLines={1}>
                          {entity.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {normalizedAnchorSearchQuery.length > 0 ? (
              filteredAnchorEntities.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>
                  {filteredAnchorEntities.map((entity) => {
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
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.emptySearchState}>
                  <Text style={styles.emptySearchText}>
                    {subjectMode === 'groups' ? 'No groups match this search.' : 'No players match this search.'}
                  </Text>
                </View>
              )
            ) : null}
          </View>

          <View style={styles.controlGrid}>
            <View style={styles.controlPanel}>
              <Text style={styles.controlTitle}>Presence</Text>

              <View style={styles.optionRow}>
                <Pressable
                  onPress={() => onSetViewMode('present')}
                  style={[styles.optionCard, conditionalState.viewMode === 'present' && styles.optionCardActive]}
                >
                  <Text style={[styles.optionLabel, conditionalState.viewMode === 'present' && styles.optionLabelActive]}>
                    Does
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => onSetViewMode('absent')}
                  style={[styles.optionCard, conditionalState.viewMode === 'absent' && styles.optionCardActive]}
                >
                  <Text style={[styles.optionLabel, conditionalState.viewMode === 'absent' && styles.optionLabelActive]}>
                    Does not
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.controlPanel}>
              <Text style={styles.controlTitle}>Match rule</Text>

              <View style={styles.optionRow}>
                <Pressable
                  onPress={() => onSetSelectionMode('must')}
                  style={[styles.optionCard, conditionalState.selectionMode === 'must' && styles.optionCardSecondary]}
                >
                  <Text style={[styles.optionLabel, conditionalState.selectionMode === 'must' && styles.optionLabelActive]}>
                    All of
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => onSetSelectionMode('may')}
                  style={[styles.optionCard, conditionalState.selectionMode === 'may' && styles.optionCardSecondary]}
                >
                  <Text style={[styles.optionLabel, conditionalState.selectionMode === 'may' && styles.optionLabelActive]}>
                    Any of
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.builderSection}>
            <Text style={styles.builderLabel}>Partners</Text>
            <TextInput
              value={partnerSearchQuery}
              onChangeText={setPartnerSearchQuery}
              placeholder={subjectMode === 'groups' ? 'Search groups for partners' : 'Search players for partners'}
              placeholderTextColor="#8FA6C4"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.searchInput}
            />
            <Text style={styles.builderHelp}>
              Search and add one or more partners for the condition.
            </Text>

            {partnerQuickSelectEntities.length > 0 ? (
              <View style={styles.quickSelectBlock}>
                <Text style={styles.quickSelectLabel}>Quick select</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickSelectCards}>
                  {partnerQuickSelectEntities.map((entity) => {
                    const active = selectedIds.includes(entity.id);
                    return (
                      <Pressable
                        key={`partner-quick-${entity.id}`}
                        onPress={() => onToggleEntity(entity.id)}
                        style={[styles.quickSelectCard, active && styles.quickSelectCardActive]}
                      >
                        <View
                          style={[
                            styles.selectorDot,
                            entity.color ? { backgroundColor: entity.color } : null,
                            active && styles.selectorDotActive,
                          ]}
                        />
                        <Text style={[styles.quickSelectText, active && styles.quickSelectTextActive]} numberOfLines={1}>
                          {entity.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}
            {normalizedPartnerSearchQuery.length > 0 ? (
              filteredPartnerEntities.length > 0 ? (
                <View style={styles.selectionGrid}>
                  {filteredPartnerEntities.map((entity) => {
                    const active = selectedIds.includes(entity.id);

                    return (
                      <Pressable
                        key={entity.id}
                        onPress={() => onToggleEntity(entity.id)}
                        style={[
                          styles.selectorCard,
                          styles.partnerSelectorCard,
                          active && styles.partnerSelectorCardActive,
                        ]}
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
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptySearchState}>
                  <Text style={styles.emptySearchText}>
                    {subjectMode === 'groups' ? 'No groups match this search.' : 'No players match this search.'}
                  </Text>
                </View>
              )
            ) : null}
          </View>

          <Pressable
            onPress={onRunCompare}
            disabled={!hasSentenceSelection}
            style={[
              styles.compareButton,
              !hasSentenceSelection && styles.compareButtonDisabled,
            ]}
          >
            <Text style={styles.compareButtonText}>Compare</Text>
          </Pressable>
        </View>
      ) : null}

      {shouldShowConditionalDetails ? (
        <>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryTile}>
              <Text style={styles.summaryLabel}>Samples</Text>
              <Text style={styles.summaryValue}>{sampleSize}</Text>
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
            <Text style={styles.sectionTitle}>Sort by</Text>
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
            <Text style={styles.sectionTitle}>Results</Text>

            {sortedConditionalPlayers.length === 0 ? (
              <Text style={styles.emptyText}>No conditional data yet.</Text>
            ) : (
              <View style={styles.rows}>
                {sortedConditionalPlayers.map((row) => (
                  <View key={row.id} style={[styles.resultRow, row.isAnchor && styles.resultRowAnchor]}>
                    <View style={styles.resultHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultName}>{row.name}</Text>
                        <Text style={styles.resultSub}>
                          {row.isAnchor ? 'Anchor' : `${row.sampleGames} games`}
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

          {shouldShowConditionalSummary ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Summary</Text>
              {summaryLines.map((line) => (
                <Text key={line} style={styles.helpText}>
                  • {line}
                </Text>
              ))}
              {!!conditionalAnalysis?.summary ? <Text style={styles.helpText}>• {conditionalAnalysis.summary}</Text> : null}
            </View>
          ) : null}

          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Baseline</Text>
              <Pressable onPress={() => setShowBaseline((prev) => !prev)} style={styles.sectionToggle}>
                <Text style={styles.sectionToggleText}>{showBaseline ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>

            {showBaseline ? (
              sortedConditionalPlayers.length === 0 ? (
                <Text style={styles.emptyText}>No baseline data yet.</Text>
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
              )
            ) : null}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 8,
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
    paddingVertical: 8,
    paddingHorizontal: 10,
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
  searchInput: {
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    backgroundColor: 'rgba(11, 18, 32, 0.94)',
    color: '#E5EEF9',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  quickSelectBlock: {
    gap: 5,
  },
  quickSelectLabel: {
    color: '#8FA6C4',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  quickSelectCards: {
    gap: 6,
    paddingRight: 6,
  },
  quickSelectCard: {
    minWidth: 112,
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickSelectCardActive: {
    backgroundColor: 'rgba(86, 120, 255, 0.22)',
    borderColor: 'rgba(125, 235, 255, 0.52)',
  },
  quickSelectText: {
    color: '#E5EEF9',
    fontSize: 11,
    fontWeight: '800',
    flexShrink: 1,
  },
  quickSelectTextActive: {
    color: '#FFFFFF',
  },
  horizontalCards: {
    gap: 6,
    paddingRight: 6,
  },
  selectorCard: {
    width: 140,
    minHeight: 60,
    borderRadius: 12,
    padding: 8,
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
    padding: 7,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    gap: 6,
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
    gap: 6,
  },
  optionCard: {
    flex: 1,
    minHeight: 56,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
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
    gap: 6,
  },
  emptySearchState: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    backgroundColor: 'rgba(11, 18, 32, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emptySearchText: {
    color: '#8FA6C4',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  partnerSelectorCard: {
    width: '48.4%',
    minHeight: 60,
  },
  partnerSelectorCardActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.16)',
    borderColor: 'rgba(74, 222, 128, 0.42)',
  },
  compareButton: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: 'rgba(86, 120, 255, 0.32)',
    borderWidth: 1,
    borderColor: 'rgba(125, 235, 255, 0.52)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareButtonDisabled: {
    backgroundColor: 'rgba(71, 85, 105, 0.22)',
    borderColor: 'rgba(148,163,184,0.16)',
  },
  compareButtonText: {
    color: '#F8FBFF',
    fontSize: 12,
    fontWeight: '900',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  summaryTile: {
    flex: 1,
    minWidth: 120,
    borderRadius: 14,
    padding: 12,
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
    marginTop: 6,
    color: '#F8FBFF',
    fontSize: 19,
    fontWeight: '900',
  },
  sectionBlock: {
    gap: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: '#F8FBFF',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionToggle: {
    minWidth: 52,
    minHeight: 26,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.20)',
  },
  sectionToggleText: {
    color: '#D9E6F7',
    fontSize: 10,
    fontWeight: '800',
  },
  sortGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sortCard: {
    width: '48.4%',
    minHeight: 70,
    borderRadius: 14,
    padding: 12,
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
    gap: 6,
  },
  resultRow: {
    borderRadius: 12,
    padding: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.90)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    gap: 5,
  },
  resultRowAnchor: {
    backgroundColor: 'rgba(86, 120, 255, 0.16)',
    borderColor: 'rgba(125, 235, 255, 0.34)',
  },
  basisRow: {
    borderRadius: 12,
    padding: 8,
    backgroundColor: 'rgba(11, 18, 32, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    gap: 5,
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
    gap: 6,
  },
  metricCell: {
    width: '31%',
    minWidth: 88,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
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
    marginTop: 5,
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
