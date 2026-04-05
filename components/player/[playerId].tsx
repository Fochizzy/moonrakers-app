import React, { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useStore } from '@/store/useStore';
import { getPlayerColors } from '@/utils/colors';
import { buildPlayerIdentity } from '@/utils/playerIdentity';
import PlayerIdentityRadar from '@/components/player/PlayerIdentityRadar';

type StorePlayer = {
  id: string;
  name: string;
  color?: string;
  elo?: number;
  prestige?: number;
  totalPrestige?: number;
  score?: number;
  wins?: number;
  gamesPlayed?: number;
  title?: string;
  subtitle?: string;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  contractsSucceeded?: number;
  contractsFailed?: number;
  objectivesCompleted?: number;
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getInitials(name?: string) {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <View style={[styles.statCell, { borderColor: `${accent}22` }]}>
      <Text style={styles.statCellLabel}>{label}</Text>
      <Text style={[styles.statCellValue, { color: accent }]}>{value}</Text>
    </View>
  );
}

export default function PlayerHubScreen() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>();
  const router = useRouter();

  const players = useStore((state: any) => {
    if (Array.isArray(state?.players)) return state.players;
    if (Array.isArray(state?.importedPlayers)) return state.importedPlayers;
    return [];
  }) as StorePlayer[];

  const player = useMemo(
    () => players.find((p) => String(p.id) === String(playerId)),
    [players, playerId]
  );

  if (!player) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Player not found</Text>
        <Text style={styles.emptyText}>
          This player could not be loaded from the current store.
        </Text>
      </View>
    );
  }

  const colors = getPlayerColors(player.color);
  const accent = colors.base || '#63E6FF';
  const identity = buildPlayerIdentity(player);

  const totalPrestige = toNumber(player.totalPrestige ?? player.prestige);
  const wins = toNumber(player.wins);
  const gamesPlayed = toNumber(player.gamesPlayed);
  const elo = Math.round(toNumber(player.elo));
  const score = toNumber(player.score);
  const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroCard, { borderColor: `${accent}44` }]}>
        <View style={[styles.heroGlow, { backgroundColor: `${accent}16` }]} />
        <View style={styles.heroHeader}>
          <View style={[styles.avatarShell, { borderColor: `${accent}44` }]}>
            <Text style={styles.avatarText}>{getInitials(player.name)}</Text>
          </View>

          <View style={styles.heroText}>
            <Text style={styles.eyebrow}>PLAYER IDENTITY</Text>
            <Text style={styles.playerName}>{player.name}</Text>
            <Text style={[styles.primaryTrait, { color: accent }]}>
              {identity.archetype}
            </Text>
          </View>
        </View>

        <Text style={styles.summaryText}>{identity.summaryText}</Text>

        <View style={styles.pillRow}>
          {identity.axes.map((axis) => (
            <View key={axis.key} style={styles.pill}>
              <Text style={styles.pillLabel}>{axis.label}</Text>
              <Text style={[styles.pillValue, { color: accent }]}>{axis.adjective}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.sectionTitle}>Overview Stats</Text>
        <View style={styles.statsGrid}>
          <StatCell label="ELO" value={elo} accent={accent} />
          <StatCell label="Prestige" value={totalPrestige} accent={accent} />
          <StatCell label="Score" value={score} accent={accent} />
          <StatCell label="Wins" value={wins} accent={accent} />
          <StatCell label="Games" value={gamesPlayed} accent={accent} />
          <StatCell label="Win Rate" value={`${winRate}%`} accent={accent} />
        </View>
      </View>

      <PlayerIdentityRadar player={player} accent={accent} />

      <View style={styles.explainCard}>
        <Text style={styles.sectionTitle}>What the 6 Axes Mean</Text>

        {identity.axes.map((axis) => (
          <View key={axis.key} style={styles.axisExplainRow}>
            <Text style={styles.axisExplainTitle}>
              {axis.label}:{' '}
              <Text style={[styles.axisExplainAdj, { color: accent }]}>
                {axis.adjective}
              </Text>
            </Text>
            <Text style={styles.axisExplainBody}>{axis.description}</Text>
            <Text style={styles.axisExplainMeaning}>{axis.gameplayMeaning}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.primaryButton, { borderColor: `${accent}55` }]}
          onPress={() =>
            router.push({
              pathname: '/charts/compare',
              params: { playerId: player.id },
            })
          }
        >
          <Text style={[styles.primaryButtonText, { color: accent }]}>
            Compare
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#08101F',
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#08101F',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#F4F7FF',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  emptyText: {
    color: '#9EB0D5',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 24,
    backgroundColor: '#0B1224',
    padding: 16,
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 999,
  },
  heroHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarShell: {
    width: 68,
    height: 68,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#F4F7FF',
    fontSize: 24,
    fontWeight: '900',
  },
  heroText: {
    flex: 1,
  },
  eyebrow: {
    color: '#8FA1C7',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  playerName: {
    color: '#F4F7FF',
    fontSize: 24,
    fontWeight: '900',
  },
  primaryTrait: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  summaryText: {
    color: '#B8C8E8',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    marginBottom: 14,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    width: '31%',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pillLabel: {
    color: '#8FA1C7',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  pillValue: {
    fontSize: 12,
    fontWeight: '900',
  },
  statsCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0B1224',
    padding: 16,
  },
  sectionTitle: {
    color: '#F4F7FF',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCell: {
    width: '47%',
    minHeight: 62,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.035)',
    justifyContent: 'center',
  },
  statCellLabel: {
    color: '#8FA1C7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  statCellValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  explainCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0B1224',
    padding: 16,
    gap: 14,
  },
  axisExplainRow: {
    gap: 4,
  },
  axisExplainTitle: {
    color: '#EAF1FF',
    fontSize: 13,
    fontWeight: '800',
  },
  axisExplainAdj: {
    fontWeight: '900',
  },
  axisExplainBody: {
    color: '#9EB0D5',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  axisExplainMeaning: {
    color: '#B8C8E8',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});