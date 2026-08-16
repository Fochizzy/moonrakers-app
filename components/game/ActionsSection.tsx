import React from 'react';
import { View } from 'react-native';

import Text from '@/components/ui/Text';

import ScaleButton from './ScaleButton';
import { styles } from './gameScreenStyles';

export default function ActionsSection({
  bottomInset,
  editingRoundId,
  canSubmitTurn,
  canEditPreviousTurn,
  showPreviousRounds,
  stayAtBaseSelected,
  finishDisabled,
  onStayAtBase,
  onEditPreviousTurn,
  onSaveOrAdvance,
  onFinishGame,
}: {
  bottomInset: number;
  editingRoundId: string | null;
  canSubmitTurn: boolean;
  canEditPreviousTurn: boolean;
  showPreviousRounds: boolean;
  stayAtBaseSelected: boolean;
  finishDisabled: boolean;
  onStayAtBase: () => void;
  onEditPreviousTurn: () => void;
  onSaveOrAdvance: () => void;
  onFinishGame: () => void;
}) {
  return (
    <View
      style={[
        styles.actionsWrap,
        { paddingBottom: Math.max(bottomInset, 16) + 16 },
      ]}
    >
      <View style={styles.actionRow}>
        <ScaleButton
          disabled={!canEditPreviousTurn}
          onPress={onEditPreviousTurn}
          accessibilityLabel={showPreviousRounds ? 'Hide previous turn' : 'Edit previous turn'}
          style={[styles.actionButton, styles.actionButtonCompact, styles.secondaryAction]}
        >
          <Text style={styles.actionText}>
            {showPreviousRounds ? 'Hide Previous Turn' : 'Edit Previous Turn'}
          </Text>
        </ScaleButton>

        <ScaleButton
          onPress={onStayAtBase}
          accessibilityLabel={stayAtBaseSelected ? 'Undo stay at base' : 'Stay at base'}
          accessibilityState={{ selected: stayAtBaseSelected }}
          style={[
            styles.actionButton,
            styles.actionButtonCompact,
            stayAtBaseSelected ? styles.baseActionActive : styles.baseAction,
          ]}
        >
          <Text style={[styles.actionText, stayAtBaseSelected && styles.baseActionText]}>
            {stayAtBaseSelected ? 'Undo Base' : 'Stay at Base'}
          </Text>
        </ScaleButton>
      </View>

      <View style={styles.actionRow}>
        <ScaleButton
          disabled={!canSubmitTurn}
          onPress={onSaveOrAdvance}
          accessibilityLabel={editingRoundId ? 'Save turn' : 'End turn'}
          style={[styles.actionButton, styles.actionButtonTall, styles.endTurnAction]}
        >
          <Text style={styles.actionText}>{editingRoundId ? 'Save Turn' : 'End Turn'}</Text>
        </ScaleButton>

        <ScaleButton
          disabled={finishDisabled}
          onPress={onFinishGame}
          accessibilityLabel="Finish game"
          accessibilityHint="Records the final results and closes this session"
          style={[styles.actionButton, styles.actionButtonTall, styles.finishAction]}
        >
          <Text style={styles.actionText}>Finish Game</Text>
        </ScaleButton>
      </View>
    </View>
  );
}
