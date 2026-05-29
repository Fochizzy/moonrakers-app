import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Text from '@/components/ui/Text';
import { CompareMode, DensityMode, Group, Player, StoredGame } from '@/utils/compareTypes';

type Props = {
  title?: string;
  subtitle?: string;
  mode: CompareMode;
  density: DensityMode;
  players: Player[];
  groups: Group[];
  games?: StoredGame[];
  playerMap: Map<string, Player>;
  selectedPlayerIds: string[];
  selectedGroupIds: string[];
  onTogglePlayer: (id: string) => void;
  onToggleGroup: (id: string) => void;
  onSetDensity: (mode: DensityMode) => void;
  onClear: () => void;
  onAnalyze: () => void;
  specialSelection?: {
    title: string;
    subtitle: string;
    active: boolean;
    onPress: () => void;
  } | null;
};

const MAX_COMPARE_PLAYERS = 5;
const PANEL = 'rgba(15, 23, 42, 0.92)';
const PANEL_ALT = 'rgba(11, 18, 32, 0.96)';
const BORDER = 'rgba(148, 163, 184, 0.18)';
const BORDER_STRONG = 'rgba(125, 235, 255, 0.55)';
const TEXT = '#E5EEF9';
const SUBTEXT = '#8FA6C4';
const ACCENT = '#7DEBFF';
const ACCENT_SOFT = 'rgba(86, 120, 255, 0.22)';

function getEntities(mode: CompareMode, players: Player[], groups: Group[]) {
  return mode === 'players' ? players : groups;
}

function getSelectionIds(mode: CompareMode, selectedPlayerIds: string[], selectedGroupIds: string[]) {
  return mode === 'players' ? selectedPlayerIds : selectedGroupIds;
}

export default function CompareSelectionCard({
  title,
  subtitle,
  mode,
  players,
  groups,
  selectedPlayerIds,
  selectedGroupIds,
  onTogglePlayer,
  onToggleGroup,
  onClear,
  onAnalyze,
  specialSelection = null,
}: Props) {
  const isPlayers = mode === 'players';
  const items = useMemo(() => getEntities(mode, players, groups), [mode, players, groups]);
  const selectedIds = getSelectionIds(mode, selectedPlayerIds, selectedGroupIds);
  const selectedLookup = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedCount = selectedIds.length;
  const analyzeDisabled = selectedCount === 0 && !specialSelection?.active;
  const countValue = specialSelection?.active ? 'Field' : `${selectedCount}`;
  const countLabel = specialSelection?.active
    ? 'aggregate'
    : isPlayers
      ? `of ${MAX_COMPARE_PLAYERS}`
      : 'selected';

  return (
    <View style={styles.shell}>
      <View style={styles.heroRow}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>{isPlayers ? 'Players' : 'Groups'}</Text>
          <Text style={styles.title}>{title ?? 'Choose lineup'}</Text>
        </View>

        <View style={styles.countCard}>
          <Text style={styles.countValue}>{countValue}</Text>
          <Text style={styles.countLabel}>{countLabel}</Text>
        </View>
      </View>

      {isPlayers && specialSelection ? (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Quick read</Text>
            <Text style={styles.panelMeta}>Played field aggregate</Text>
          </View>

          <Pressable
            onPress={specialSelection.onPress}
            style={[
              styles.specialSelectionCard,
              specialSelection.active && styles.specialSelectionCardActive,
            ]}
          >
            <View style={styles.copyWrap}>
              <Text style={styles.rowTitle}>{specialSelection.title}</Text>
              <Text style={styles.rowSub}>{specialSelection.subtitle}</Text>
            </View>

            <View style={[styles.rowAction, specialSelection.active && styles.rowActionSelected]}>
              <Text
                style={[
                  styles.rowActionText,
                  specialSelection.active && styles.rowActionTextSelected,
                ]}
              >
                {specialSelection.active ? 'Selected' : 'Use read'}
              </Text>
            </View>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>{isPlayers ? 'Available players' : 'Available groups'}</Text>
          <Text style={styles.panelMeta}>Tap to add</Text>
        </View>

        <ScrollView style={styles.list} nestedScrollEnabled showsVerticalScrollIndicator={false}>
          <View style={styles.listContent}>
            {items.map((item) => {
              const selected = selectedLookup.has(item.id);
              const limitReached = isPlayers && !selected && selectedCount >= MAX_COMPARE_PLAYERS;
              const rowStatus = limitReached ? 'Limit reached' : null;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    if (limitReached) return;
                    isPlayers ? onTogglePlayer(item.id) : onToggleGroup(item.id);
                  }}
                  style={[
                    styles.selectRow,
                    selected && styles.selectRowActive,
                    limitReached && styles.selectRowDisabled,
                  ]}
                >
                  <View style={styles.selectRowMain}>
                    <View
                      style={[
                        styles.identityDot,
                        isPlayers && (item as Player).color ? { backgroundColor: (item as Player).color } : null,
                        selected && styles.identityDotSelected,
                      ]}
                    />
                    <View style={styles.copyWrap}>
                      <Text style={styles.rowTitle}>{item.name}</Text>
                      {rowStatus ? <Text style={styles.rowSub}>{rowStatus}</Text> : null}
                    </View>
                  </View>

                  <View style={[styles.rowAction, selected && styles.rowActionSelected]}>
                    <Text style={[styles.rowActionText, selected && styles.rowActionTextSelected]}>
                      {selected ? 'Selected' : limitReached ? 'Full' : 'Add'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {specialSelection?.active ? (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Active read</Text>
            <Text style={styles.panelMeta}>Self vs field</Text>
          </View>

          <View style={[styles.slotCard, styles.specialSelectionSlot]}>
            <Text style={styles.slotIndex}>Aggregate</Text>
            <Text style={styles.slotName} numberOfLines={1}>
              {specialSelection.title}
            </Text>
            <Text style={styles.slotHint}>{specialSelection.subtitle}</Text>
          </View>
        </View>
      ) : selectedCount > 0 ? (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Lineup</Text>
            <Text style={styles.panelMeta}>{selectedCount} selected</Text>
          </View>

          <View style={styles.slotGrid}>
            {Array.from({ length: MAX_COMPARE_PLAYERS }).map((_, index) => {
              const id = selectedIds[index];
              const item = items.find((entry) => entry.id === id);

              return (
                <Pressable
                  key={index}
                  onPress={() => {
                    if (!id) return;
                    isPlayers ? onTogglePlayer(id) : onToggleGroup(id);
                  }}
                  style={[styles.slotCard, item ? styles.slotCardFilled : styles.slotCardEmpty]}
                >
                  <Text style={styles.slotIndex}>Slot {index + 1}</Text>
                  <Text style={styles.slotName} numberOfLines={1}>
                    {item ? item.name : 'Empty'}
                  </Text>
                  {item ? <Text style={styles.slotHint}>Remove</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable onPress={onClear} style={[styles.actionButton, styles.secondaryButton]}>
          <Text style={[styles.actionText, styles.secondaryButtonText]}>Clear</Text>
        </Pressable>

        <Pressable
          onPress={onAnalyze}
          disabled={analyzeDisabled}
          style={[styles.actionButton, styles.primaryButton, analyzeDisabled && styles.primaryButtonDisabled]}
        >
          <Text style={[styles.actionText, analyzeDisabled && styles.primaryButtonTextDisabled]}>
            Analyze
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 6,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'stretch',
  },
  heroCopy: {
    flex: 1,
    borderRadius: 12,
    padding: 8,
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: BORDER,
  },
  eyebrow: {
    color: ACCENT,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 3,
  },
  title: {
    color: '#F8FBFF',
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
    color: SUBTEXT,
    fontSize: 10,
    lineHeight: 14,
  },
  countCard: {
    width: 78,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_STRONG,
    backgroundColor: ACCENT_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countValue: {
    color: '#F8FBFF',
    fontSize: 22,
    fontWeight: '900',
  },
  countLabel: {
    color: '#D9E8FF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  panel: {
    backgroundColor: PANEL,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
    gap: 6,
  },
  specialSelectionCard: {
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: PANEL_ALT,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  specialSelectionCardActive: {
    borderColor: BORDER_STRONG,
    backgroundColor: 'rgba(86, 120, 255, 0.20)',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  panelTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '800',
  },
  panelMeta: {
    color: SUBTEXT,
    fontSize: 10,
    fontWeight: '700',
  },
  list: {
    maxHeight: 260,
  },
  listContent: {
    gap: 5,
    paddingBottom: 2,
  },
  selectRow: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: PANEL_ALT,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectRowActive: {
    borderColor: BORDER_STRONG,
    backgroundColor: 'rgba(45, 62, 110, 0.42)',
  },
  selectRowDisabled: {
    opacity: 0.4,
  },
  selectRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  identityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(148, 163, 184, 0.42)',
  },
  identityDotSelected: {
    shadowColor: '#7DEBFF',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  copyWrap: {
    flex: 1,
  },
  rowTitle: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '700',
  },
  rowSub: {
    color: SUBTEXT,
    fontSize: 10,
    marginTop: 1,
  },
  rowAction: {
    minWidth: 54,
    minHeight: 26,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  rowActionSelected: {
    borderColor: BORDER_STRONG,
    backgroundColor: 'rgba(125, 235, 255, 0.12)',
  },
  rowActionText: {
    color: SUBTEXT,
    fontSize: 10,
    fontWeight: '800',
  },
  rowActionTextSelected: {
    color: '#EFFFFF',
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  slotCard: {
    width: '48.4%',
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    justifyContent: 'center',
  },
  slotCardFilled: {
    backgroundColor: 'rgba(86, 120, 255, 0.20)',
    borderColor: BORDER_STRONG,
  },
  slotCardEmpty: {
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    borderColor: BORDER,
  },
  specialSelectionSlot: {
    width: '100%',
    minHeight: 66,
    backgroundColor: 'rgba(86, 120, 255, 0.20)',
    borderColor: BORDER_STRONG,
  },
  slotIndex: {
    color: SUBTEXT,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  slotName: {
    color: '#F8FBFF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  slotHint: {
    color: SUBTEXT,
    fontSize: 9,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 5,
  },
  actionButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  secondaryButton: {
    backgroundColor: 'rgba(127,29,29,0.16)',
    borderColor: 'rgba(248,113,113,0.24)',
  },
  primaryButton: {
    backgroundColor: 'rgba(86, 120, 255, 0.34)',
    borderColor: BORDER_STRONG,
  },
  primaryButtonDisabled: {
    backgroundColor: 'rgba(71, 85, 105, 0.22)',
    borderColor: 'rgba(148, 163, 184, 0.14)',
  },
  actionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F3FCFF',
  },
  secondaryButtonText: {
    color: '#FDB4B4',
  },
  primaryButtonTextDisabled: {
    color: 'rgba(226, 232, 240, 0.56)',
  },
});
