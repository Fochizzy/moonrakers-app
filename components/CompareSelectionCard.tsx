import React from 'react';
import { Pressable, View } from 'react-native';
import Text from '@/components/ui/Text';
import { styles } from './compareStyles';
import { CompareMode, DensityMode, Group, Player } from './compareTypes';
import { getPlayerColor, groupColor } from './compareHelpers';

type Props = {
  mode: CompareMode;
  density: DensityMode;
  players: Player[];
  groups: Group[];
  playerMap: Map<string, Player>;
  selectedPlayerIds: string[];
  selectedGroupIds: string[];
  onTogglePlayer: (id: string) => void;
  onToggleGroup: (id: string) => void;
  onSetDensity: (density: DensityMode) => void;
  onClear: () => void;
  onAnalyze: () => void;
};

export default function CompareSelectionCard({
  mode,
  density,
  players,
  groups,
  playerMap,
  selectedPlayerIds,
  selectedGroupIds,
  onTogglePlayer,
  onToggleGroup,
  onSetDensity,
  onClear,
  onAnalyze,
}: Props) {
  const selectedIds = mode === 'players' ? selectedPlayerIds : selectedGroupIds;
  const canAnalyze = selectedIds.length >= 1;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardEyebrow}>Selection</Text>
        <Text style={styles.cardMeta}>{selectedIds.length} selected</Text>
      </View>

      <Text style={styles.cardTitle}>
        {mode === 'players' ? 'Select Players' : 'Select Groups'}
      </Text>
      <Text style={styles.helper}>
        {mode === 'players'
          ? 'Choose the pilots you want in the tactical analysis.'
          : 'Choose the saved crews you want in the tactical analysis.'}
      </Text>

      <View style={styles.selectionGrid}>
        {mode === 'players'
          ? players.map((player) => {
              const selected = selectedPlayerIds.includes(player.id);
              const playerColor = getPlayerColor(player.color);

              return (
                <Pressable
                  key={player.id}
                  style={[
                    styles.tile,
                    {
                      borderColor: selected
                        ? `${playerColor}88`
                        : 'rgba(255,255,255,0.08)',
                    },
                    selected ? { backgroundColor: `${playerColor}22` } : null,
                  ]}
                  onPress={() => onTogglePlayer(player.id)}
                >
                  <View style={[styles.tileAccent, { backgroundColor: playerColor }]} />
                  <View
                    style={[
                      styles.tileGlow,
                      selected ? { backgroundColor: `${playerColor}22` } : null,
                    ]}
                  />

                  <View style={styles.tileTopRow}>
                    <View style={[styles.dot, { backgroundColor: playerColor }]} />
                    {selected ? (
                      <View
                        style={[
                          styles.selectedBadge,
                          { borderColor: `${playerColor}99` },
                        ]}
                      >
                        <Text style={styles.selectedBadgeText}>Selected</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.tileTitle}>{player.name}</Text>
                  <Text style={styles.tileSubtitle}>{player.color ?? 'Player'}</Text>
                </Pressable>
              );
            })
          : groups.map((group) => {
              const selected = selectedGroupIds.includes(group.id);
              const color = groupColor(group, playerMap);
              const names = group.playerIds
                .map((playerId) => playerMap.get(playerId)?.name)
                .filter(Boolean)
                .slice(0, 3)
                .join(' • ');

              return (
                <Pressable
                  key={group.id}
                  style={[
                    styles.tile,
                    {
                      borderColor: selected ? `${color}88` : 'rgba(255,255,255,0.08)',
                    },
                    selected ? { backgroundColor: `${color}22` } : null,
                  ]}
                  onPress={() => onToggleGroup(group.id)}
                >
                  <View style={[styles.tileAccent, { backgroundColor: color }]} />
                  <View
                    style={[
                      styles.tileGlow,
                      selected ? { backgroundColor: `${color}22` } : null,
                    ]}
                  />

                  <View style={styles.tileTopRow}>
                    <View style={[styles.groupDot, { backgroundColor: color }]} />
                    {selected ? (
                      <View
                        style={[
                          styles.selectedBadge,
                          { borderColor: `${color}99` },
                        ]}
                      >
                        <Text style={styles.selectedBadgeText}>Selected</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.tileTitle}>{group.name}</Text>
                  <Text style={styles.tileSubtitle}>
                    {names || `${group.playerIds.length} players`}
                  </Text>
                </Pressable>
              );
            })}
      </View>

      <View style={styles.actionRow}>
        <Pressable style={[styles.actionButton, styles.clearButton]} onPress={onClear}>
          <Text style={styles.actionButtonText}>Clear</Text>
        </Pressable>

        <View style={styles.inlineSegmentShell}>
          <Pressable
            style={[
              styles.inlineSegment,
              density === 'dense' ? styles.inlineSegmentActive : null,
            ]}
            onPress={() => onSetDensity('dense')}
          >
            <Text
              style={[
                styles.inlineSegmentText,
                density === 'dense' ? styles.inlineSegmentTextActive : null,
              ]}
            >
              Dense
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.inlineSegment,
              density === 'comfortable' ? styles.inlineSegmentActive : null,
            ]}
            onPress={() => onSetDensity('comfortable')}
          >
            <Text
              style={[
                styles.inlineSegmentText,
                density === 'comfortable' ? styles.inlineSegmentTextActive : null,
              ]}
            >
              Comfortable
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={[
            styles.actionButton,
            styles.analyzeButton,
            !canAnalyze && styles.actionButtonDisabled,
          ]}
          disabled={!canAnalyze}
          onPress={onAnalyze}
        >
          <Text style={styles.actionButtonText}>Analyze</Text>
        </Pressable>
      </View>
    </View>
  );
}


