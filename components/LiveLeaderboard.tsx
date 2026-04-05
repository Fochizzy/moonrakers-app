import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import Text from '@/components/ui/Text';

type LiveLeaderboardPlayer = {
  id: string;
  name: string;
  color?: string;
  totalPrestige?: number;
  score?: number;
};

type Props = {
  gameId?: string;
  title?: string;
  players: LiveLeaderboardPlayer[];
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export default function LiveLeaderboard({ players }: Props) {
  const ranking = useMemo(() => {
    return [...(players ?? [])].sort((a, b) => {
      const prestigeDiff = toNumber(b.totalPrestige) - toNumber(a.totalPrestige);
      if (prestigeDiff !== 0) return prestigeDiff;

      const scoreDiff = toNumber(b.score) - toNumber(a.score);
      if (scoreDiff !== 0) return scoreDiff;

      return (a.name ?? '').localeCompare(b.name ?? '');
    });
  }, [players]);

  if (!ranking.length) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {ranking.map((player, index) => {
          const isLeader = index === 0;

          return (
            <View
              key={player.id}
              style={[
                styles.playerChip,
                isLeader ? styles.playerChipLeader : null,
              ]}
            >
              <View style={styles.leftRail}>
                <View
                  style={[
                    styles.rankDot,
                    player.color ? { backgroundColor: player.color } : null,
                    isLeader ? styles.rankDotLeader : null,
                  ]}
                />
              </View>

              <View style={styles.content}>
                <View style={styles.topRow}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.playerName,
                      isLeader ? styles.playerNameLeader : null,
                    ]}
                  >
                    {player.name}
                  </Text>

                  {isLeader ? (
                    <View style={styles.leaderBadge}>
                      <Text style={styles.leaderBadgeText}>1ST</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.bottomRow}>
                  <View style={[styles.statPill, styles.prestigePill]}>
                    <Text style={styles.statLabel}>P</Text>
                    <Text style={styles.statValue}>{toNumber(player.totalPrestige)}</Text>
                  </View>

                  <View style={[styles.statPill, styles.scorePill]}>
                    <Text style={styles.statLabel}>S</Text>
                    <Text style={styles.statValueMuted}>{toNumber(player.score)}</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
  },
  row: {
    gap: 8,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },

  playerChip: {
    minHeight: 56,
    maxHeight: 56,
    minWidth: 132,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.55)',
    backgroundColor: 'rgba(8, 15, 28, 0.96)',
  },
  playerChipLeader: {
    borderColor: 'rgba(250, 204, 21, 0.9)',
    backgroundColor: 'rgba(54, 41, 10, 0.96)',
  },

  leftRail: {
    width: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankDot: {
    width: 8,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#64748b',
  },
  rankDotLeader: {
    width: 10,
    height: 38,
  },

  content: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 4,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  playerName: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 0.2,
  },
  playerNameLeader: {
    color: '#fef3c7',
  },

  leaderBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.65)',
    backgroundColor: 'rgba(250, 204, 21, 0.14)',
  },
  leaderBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fde68a',
    letterSpacing: 0.4,
  },

  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  prestigePill: {
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  scorePill: {
    borderColor: 'rgba(148,163,184,0.22)',
    backgroundColor: 'rgba(148,163,184,0.08)',
  },

  statLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
  },
  statValueMuted: {
    fontSize: 11,
    fontWeight: '800',
    color: '#cbd5e1',
  },
});
