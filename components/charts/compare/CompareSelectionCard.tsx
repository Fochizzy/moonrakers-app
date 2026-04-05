import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Text from '@/components/ui/Text';
import { styles } from '@/utils/compareStyles';
import { CompareMode, DensityMode, Group, Player, StoredGame } from '@/utils/compareTypes';

type Props = {
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
};

const MAX_COMPARE_PLAYERS = 5;

export default function CompareSelectionCard({
  mode,
  players,
  groups,
  selectedPlayerIds,
  selectedGroupIds,
  onTogglePlayer,
  onToggleGroup,
  onClear,
  onAnalyze,
}: Props) {
  const selectedCount = mode === 'players' ? selectedPlayerIds.length : selectedGroupIds.length;
  const analyzeDisabled = selectedCount === 0;

  return (
    <View style={styles.compareSelectionShell}>
      <View style={styles.compareSelectionHeader}>
        <View style={styles.compareSelectionHeaderTextWrap}>
          <Text style={styles.compareSelectionTitle}>
            {mode === 'players' ? 'Comparison Selection' : 'Group Selection'}
          </Text>
        </View>

        <View style={styles.compareSelectionHeaderRight}>
          <Text style={styles.compareSelectionCount}>
            {selectedCount}
            {mode === 'players' ? ` / ${MAX_COMPARE_PLAYERS}` : ''} selected
          </Text>
        </View>
      </View>

      {mode === 'players' ? (
        <>
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: '#9fb3d1', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>
              Player List
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {players.map((player) => {
                const selected = selectedPlayerIds.includes(player.id);
                const limitReached = !selected && selectedPlayerIds.length >= MAX_COMPARE_PLAYERS;

                return (
                  <Pressable
                    key={player.id}
                    onPress={() => {
                      if (!limitReached) onTogglePlayer(player.id);
                    }}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: selected
                        ? 'rgba(37,99,235,0.35)'
                        : 'rgba(15,23,42,0.9)',
                      borderWidth: 1,
                      borderColor: selected
                        ? 'rgba(96,165,250,0.8)'
                        : 'rgba(71,85,105,0.4)',
                      opacity: limitReached ? 0.4 : 1,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                      {player.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ marginTop: 14 }}>
            <Text style={{ color: '#9fb3d1', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>
              Selected for Compare
            </Text>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[0, 1, 2, 3, 4].map((slotIndex) => {
                const playerId = selectedPlayerIds[slotIndex];
                const player = players.find((p) => p.id === playerId);

                return (
                  <Pressable
                    key={slotIndex}
                    onPress={() => {
                      if (playerId) onTogglePlayer(playerId);
                    }}
                    style={{
                      flex: 1,
                      minHeight: 48,
                      borderRadius: 10,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: player
                        ? 'rgba(37,99,235,0.25)'
                        : 'rgba(15,23,42,0.6)',
                      borderWidth: 1,
                      borderColor: 'rgba(71,85,105,0.4)',
                      paddingHorizontal: 6,
                    }}
                  >
                    <Text
                      style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}
                      numberOfLines={1}
                    >
                      {player ? player.name : '+'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: '#9fb3d1', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>
              Group List
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {groups.map((group) => {
                const selected = selectedGroupIds.includes(group.id);
                const limitReached = !selected && selectedGroupIds.length >= MAX_COMPARE_PLAYERS;

                return (
                  <Pressable
                    key={group.id}
                    onPress={() => {
                      if (!limitReached) onToggleGroup(group.id);
                    }}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: selected
                        ? 'rgba(37,99,235,0.35)'
                        : 'rgba(15,23,42,0.9)',
                      borderWidth: 1,
                      borderColor: selected
                        ? 'rgba(96,165,250,0.8)'
                        : 'rgba(71,85,105,0.4)',
                      opacity: limitReached ? 0.4 : 1,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                      {group.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ marginTop: 14 }}>
            <Text style={{ color: '#9fb3d1', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>
              Selected for Compare
            </Text>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[0, 1, 2, 3, 4].map((slotIndex) => {
                const groupId = selectedGroupIds[slotIndex];
                const group = groups.find((g) => g.id === groupId);

                return (
                  <Pressable
                    key={slotIndex}
                    onPress={() => {
                      if (groupId) onToggleGroup(groupId);
                    }}
                    style={{
                      flex: 1,
                      minHeight: 48,
                      borderRadius: 10,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: group
                        ? 'rgba(37,99,235,0.25)'
                        : 'rgba(15,23,42,0.6)',
                      borderWidth: 1,
                      borderColor: 'rgba(71,85,105,0.4)',
                      paddingHorizontal: 6,
                    }}
                  >
                    <Text
                      style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}
                      numberOfLines={1}
                    >
                      {group ? group.name : '+'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </>
      )}

      <View style={styles.compareSelectionActionRow}>
        <Pressable onPress={onClear} style={styles.compareSelectionSecondaryButton}>
          <Text style={styles.compareSelectionSecondaryButtonText}>Clear</Text>
        </Pressable>

        <Pressable
          onPress={onAnalyze}
          disabled={analyzeDisabled}
          style={[
            styles.compareSelectionPrimaryButton,
            analyzeDisabled ? styles.compareSelectionPrimaryButtonDisabled : null,
          ]}
        >
          <Text
            style={[
              styles.compareSelectionPrimaryButtonText,
              analyzeDisabled ? styles.compareSelectionPrimaryButtonTextDisabled : null,
            ]}
          >
            Analyze
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
