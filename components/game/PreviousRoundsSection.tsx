import React from 'react';
import { View } from 'react-native';

import Text from '@/components/ui/Text';
import { withAlpha } from '@/utils/gameScreenTheme';
import { toNumber } from '@/utils/numbers';
import { resolveStoredPlayerColor } from '@/utils/playerColor';
import { getPlayerAccentColor } from '@/utils/turnTheme';

import ScaleButton from './ScaleButton';
import { UI, clampCount, type Player, type StoredRound } from './gameScreenUi';
import { styles } from './gameScreenStyles';

export default function PreviousRoundsSection({
  displayRounds,
  allRounds,
  players,
  onEditPreviousRound,
  onUndoLastTurn,
  canUndoLastTurn,
}: {
  displayRounds: StoredRound[];
  allRounds: StoredRound[];
  players: Player[];
  onEditPreviousRound: (round: StoredRound) => void;
  onUndoLastTurn: () => void;
  canUndoLastTurn: boolean;
}) {
  if (!displayRounds.length) return null;

  const lastRoundPlayerName =
    players.find((player) => player.id === displayRounds[displayRounds.length - 1]?.playerId)
      ?.name ?? null;

  return (
    <View style={[styles.sectionCard, { backgroundColor: UI.card, borderColor: UI.lineStrong }]}>
      <Text style={styles.sectionTitle}>Previous Rounds</Text>
      <View style={styles.rowsStack}>
        {displayRounds.map((round, index) => {
          const player = players.find((p) => p.id === round.playerId);
          const accent = getPlayerAccentColor(resolveStoredPlayerColor(player?.color, index));
          const linked = allRounds.filter((candidate) => candidate.linkedTurnId === round.id);
          const objectivePrestige =
            clampCount(round.objectiveCount ?? round.objectivePrestige) +
            linked.reduce(
              (sum, candidate) =>
                sum + clampCount(candidate.objectiveCount ?? candidate.objectivePrestige),
              0
            );

          return (
            <ScaleButton
              key={round.id}
              onPress={() => onEditPreviousRound(round)}
              style={[
                styles.previousRoundRow,
                { borderColor: withAlpha(accent, 0.24), backgroundColor: UI.cardSoft },
              ]}
            >
              <Text style={styles.previousRoundText}>R{index + 1} {player?.name ?? 'Unknown'}</Text>
              <Text style={styles.previousRoundMetric}>{toNumber(round.prestige)} direct</Text>
              <Text style={styles.previousRoundMetric}>+{objectivePrestige} obj</Text>
            </ScaleButton>
          );
        })}
      </View>

      <ScaleButton
        disabled={!canUndoLastTurn}
        onPress={onUndoLastTurn}
        accessibilityRole="button"
        accessibilityLabel={
          lastRoundPlayerName
            ? `Undo last turn, played by ${lastRoundPlayerName}`
            : 'Undo last turn'
        }
        accessibilityHint="Removes the most recent saved turn and hands the turn back"
        style={[
          styles.undoLastTurnButton,
          { borderColor: withAlpha(UI.failure, 0.42), backgroundColor: withAlpha(UI.failure, 0.12) },
          !canUndoLastTurn && styles.undoLastTurnButtonDisabled,
        ]}
      >
        <Text style={[styles.undoLastTurnText, { color: UI.failure }]}>
          {lastRoundPlayerName ? `Undo ${lastRoundPlayerName}'s Last Turn` : 'Undo Last Turn'}
        </Text>
      </ScaleButton>
    </View>
  );
}
