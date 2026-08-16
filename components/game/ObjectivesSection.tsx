import React from 'react';
import { View } from 'react-native';

import Text from '@/components/ui/Text';
import { glowStyle, withAlpha } from '@/utils/gameScreenTheme';
import { resolveStoredPlayerColor } from '@/utils/playerColor';
import { getPlayerAccentColor } from '@/utils/turnTheme';

import ScaleButton from './ScaleButton';
import { UI, clampCount, type Player } from './gameScreenUi';
import { styles } from './gameScreenStyles';

function ObjectiveRow({
  title,
  value,
  accent,
  isCurrentPlayer,
  onChange,
}: {
  title: string;
  value: number;
  accent: string;
  isCurrentPlayer: boolean;
  onChange: (next: number) => void;
}) {
  const isEmphasized = isCurrentPlayer || value > 0;

  return (
    <View
      style={[
        styles.objectiveRowCard,
        !isEmphasized && styles.objectiveRowCardQuiet,
        isEmphasized && {
          backgroundColor: withAlpha(accent, 0.1),
          borderColor: withAlpha(accent, 0.45),
        },
        isEmphasized
          ? glowStyle(withAlpha(accent, 0.9), 0.2, 10, 7)
          : glowStyle(withAlpha(accent, 0.9), 0.06, 5, 2),
      ]}
    >
      <View
        style={[
          styles.objectiveNameWrap,
          !isEmphasized && styles.objectiveNameWrapQuiet,
          isEmphasized && {
            backgroundColor: withAlpha(accent, 0.1),
            borderColor: withAlpha(accent, 0.22),
          },
        ]}
      >
        <Text style={[styles.objectiveName, !isEmphasized && styles.objectiveNameQuiet]}>
          {title}
        </Text>
      </View>
      <View style={styles.objectiveControlsRight}>
        <ScaleButton
          onPress={() => onChange(Math.max(0, value - 1))}
          accessibilityLabel={`Decrease objectives for ${title}`}
          accessibilityHint={`Currently ${value}`}
          style={styles.objectiveMiniButton}
        >
          <Text style={styles.objectiveMiniButtonText}>-</Text>
        </ScaleButton>
        <View style={styles.objectiveValuePill}>
          <Text style={styles.objectiveValueText}>{value}</Text>
        </View>
        <ScaleButton
          onPress={() => onChange(value + 1)}
          accessibilityLabel={`Increase objectives for ${title}`}
          accessibilityHint={`Currently ${value}`}
          style={styles.objectiveMiniButton}
        >
          <Text style={styles.objectiveMiniButtonText}>+</Text>
        </ScaleButton>
      </View>
    </View>
  );
}

export default function ObjectivesSection({
  currentAccent,
  currentPlayerId,
  currentObjectiveCount,
  onSetCurrentObjectiveCount,
  playersInTurnOrder,
  objectiveAwardsByPlayer,
  onSetOtherPlayerObjective,
  collapsed,
  onToggleCollapsed,
  onSelectNone,
}: {
  currentAccent: string;
  currentPlayerId: string;
  currentObjectiveCount: number;
  onSetCurrentObjectiveCount: (next: number) => void;
  playersInTurnOrder: Player[];
  objectiveAwardsByPlayer: Record<string, number>;
  onSetOtherPlayerObjective: (playerId: string, next: number) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelectNone: () => void;
}) {
  return (
    <View style={[styles.sectionCard, { borderColor: withAlpha(currentAccent, 0.28), backgroundColor: UI.card }, glowStyle(withAlpha(currentAccent, 0.95), 0.22, 10, 8)]}>
      <View style={styles.sectionHeaderRow}>
        <ScaleButton
          onPress={onToggleCollapsed}
          accessibilityLabel="Objectives"
          accessibilityHint={collapsed ? "Expand objectives" : "Collapse objectives"}
          style={styles.headerTapZone}
        >
          <Text style={styles.sectionTitle}>Objectives</Text>
        </ScaleButton>
        <View style={styles.headerActions}>
          <Text style={styles.chevron}>{collapsed ? '▾' : '▴'}</Text>
          <ScaleButton onPress={onSelectNone} style={styles.noneChip}>
            <Text style={styles.noneChipText}>None</Text>
          </ScaleButton>
        </View>
      </View>

      {!collapsed ? (
        <View style={styles.rowsStack}>
          {playersInTurnOrder.map((player, index) => (
            <ObjectiveRow
              key={player.id}
              title={player.name}
              value={
                player.id === currentPlayerId
                  ? clampCount(currentObjectiveCount)
                  : clampCount(objectiveAwardsByPlayer[player.id])
              }
              accent={
                player.id === currentPlayerId
                  ? currentAccent
                  : getPlayerAccentColor(resolveStoredPlayerColor(player.color, index))
              }
              isCurrentPlayer={player.id === currentPlayerId}
              onChange={
                player.id === currentPlayerId
                  ? onSetCurrentObjectiveCount
                  : (next) => onSetOtherPlayerObjective(player.id, next)
              }
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
