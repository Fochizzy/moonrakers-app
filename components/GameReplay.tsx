import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import Text from '@/components/ui/Text';
import AnimatedCard from '@/components/ui/AnimatedCard';
import ChartShell from './ChartShell';

type ReplayPlayer = {
  id: string;
  name: string;
  color?: string;
};

type SnapshotEntry = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  score?: number;
};

type TimelineStep = {
  round: number;
  snapshot: Record<string, SnapshotEntry>;
};

type Props = {
  timeline?: TimelineStep[];
  players?: ReplayPlayer[];
};

type PlayerCardTheme = {
  accent: string;
  tint: string;
  border: string;
  glow: string;
};

const ui = {
  bg: '#020617',
  panel: '#081120',
  panelAlt: '#0b1728',
  panelRaised: '#0f1c31',
  border: 'rgba(148, 163, 184, 0.14)',
  borderStrong: 'rgba(148, 163, 184, 0.26)',
  text: '#f8fafc',
  muted: '#94a3b8',
  soft: '#cbd5e1',
  success: '#22c55e',
  star: 'rgba(255,255,255,0.9)',
  starSoft: 'rgba(255,255,255,0.35)',
  nebulaBlue: 'rgba(59, 130, 246, 0.14)',
  nebulaPurple: 'rgba(168, 85, 247, 0.14)',
  nebulaGreen: 'rgba(34, 197, 94, 0.1)',
};

function getTotalPrestige(s?: SnapshotEntry) {
  if (!s) return 0;
  if (typeof s.totalPrestige === 'number') return s.totalPrestige;
  if (typeof s.prestige === 'number') return s.prestige;
  return (s.directPrestige ?? 0) + (s.assistPrestigeReceived ?? 0);
}

function getPlayerTheme(color?: string): PlayerCardTheme {
  switch ((color ?? '').trim().toLowerCase()) {
    case 'green':
      return {
        accent: '#22c55e',
        tint: 'rgba(34, 197, 94, 0.12)',
        border: 'rgba(34, 197, 94, 0.28)',
        glow: 'rgba(34, 197, 94, 0.18)',
      };
    case 'purple':
    case 'violet':
      return {
        accent: '#a855f7',
        tint: 'rgba(168, 85, 247, 0.12)',
        border: 'rgba(168, 85, 247, 0.28)',
        glow: 'rgba(168, 85, 247, 0.18)',
      };
    case 'blue':
      return {
        accent: '#3b82f6',
        tint: 'rgba(59, 130, 246, 0.12)',
        border: 'rgba(59, 130, 246, 0.28)',
        glow: 'rgba(59, 130, 246, 0.18)',
      };
    case 'orange':
      return {
        accent: '#f97316',
        tint: 'rgba(249, 115, 22, 0.12)',
        border: 'rgba(249, 115, 22, 0.28)',
        glow: 'rgba(249, 115, 22, 0.18)',
      };
    case 'yellow':
    case 'gold':
      return {
        accent: '#eab308',
        tint: 'rgba(234, 179, 8, 0.12)',
        border: 'rgba(234, 179, 8, 0.28)',
        glow: 'rgba(234, 179, 8, 0.18)',
      };
    default:
      return {
        accent: '#94a3b8',
        tint: 'rgba(148, 163, 184, 0.12)',
        border: 'rgba(148, 163, 184, 0.22)',
        glow: 'rgba(148, 163, 184, 0.16)',
      };
  }
}

function formatDelta(value: number) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function MiniMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <View style={[styles.metricTile, { borderColor: `${accent}33` }]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
    </View>
  );
}

function NavButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.navButton,
        disabled && styles.navButtonDisabled,
        pressed && !disabled && styles.navButtonPressed,
      ]}
    >
      <Text style={[styles.navButtonText, disabled && styles.navButtonTextDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function GameReplay({
  timeline = [],
  players = [],
}: Props) {
  const [step, setStep] = useState(0);

  if (!timeline.length) {
    return (
      <ChartShell
        title="Game Replay"
        subtitle="Step through saved round snapshots across the match."
      >
        <AnimatedCard style={styles.emptyCard}>
          <View style={styles.nebulaA} />
          <View style={styles.nebulaB} />
          <Text style={styles.emptyEyebrow}>Replay Offline</Text>
          <Text style={styles.emptyTitle}>No replay data available</Text>
          <Text style={styles.emptyBody}>
            Save round snapshots during gameplay to unlock a round-by-round replay timeline.
          </Text>
        </AnimatedCard>
      </ChartShell>
    );
  }

  const safeStep = Math.min(step, timeline.length - 1);
  const current = timeline[safeStep];
  const previous = safeStep > 0 ? timeline[safeStep - 1] : undefined;

  const canGoPrev = safeStep > 0;
  const canGoNext = safeStep < timeline.length - 1;
  const progress = timeline.length > 1 ? safeStep / (timeline.length - 1) : 1;

  const rankedPlayers = useMemo(() => {
    return [...players]
      .map((player) => {
        const stats = current.snapshot?.[player.id] ?? {};
        const prevStats = previous?.snapshot?.[player.id] ?? {};

        const totalPrestige = getTotalPrestige(stats);
        const prevPrestige = getTotalPrestige(prevStats);

        const score = stats.score ?? 0;
        const prevScore = prevStats.score ?? 0;

        return {
          ...player,
          totalPrestige,
          score,
          prestigeDelta: totalPrestige - prevPrestige,
          scoreDelta: score - prevScore,
        };
      })
      .sort((a, b) => {
        if (b.totalPrestige !== a.totalPrestige) {
          return b.totalPrestige - a.totalPrestige;
        }
        return b.score - a.score;
      });
  }, [players, current, previous]);

  const leader = rankedPlayers[0];

  return (
    <ChartShell
      title="Game Replay"
      subtitle="Track leaderboard shifts, prestige gains, and score momentum over time."
    >
      <AnimatedCard style={styles.heroCard}>
        <View style={styles.nebulaA} />
        <View style={styles.nebulaB} />
        <View style={styles.nebulaC} />
        <View style={styles.star1} />
        <View style={styles.star2} />
        <View style={styles.star3} />

        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>Galactic Timeline</Text>
            <Text style={styles.heroTitle}>Round {current.round}</Text>
            <Text style={styles.heroSubtitle}>
              Snapshot {safeStep + 1} of {timeline.length}
            </Text>
          </View>

          <View style={styles.leaderChip}>
            <Text style={styles.leaderChipLabel}>Current Leader</Text>
            <Text style={styles.leaderChipValue}>{leader?.name ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(8, progress * 100)}%` },
              ]}
            />
          </View>

          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>Start</Text>
            <Text style={styles.progressLabel}>End</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryLabel}>Round</Text>
            <Text style={styles.summaryValue}>{current.round}</Text>
          </View>

          <View style={styles.summaryTile}>
            <Text style={styles.summaryLabel}>Players</Text>
            <Text style={styles.summaryValue}>{players.length}</Text>
          </View>

          <View style={styles.summaryTile}>
            <Text style={styles.summaryLabel}>Replay Step</Text>
            <Text style={styles.summaryValue}>
              {safeStep + 1}/{timeline.length}
            </Text>
          </View>
        </View>
      </AnimatedCard>

      <View style={styles.navRow}>
        <NavButton label="⏮ Start" onPress={() => setStep(0)} disabled={!canGoPrev} />
        <NavButton
          label="← Prev"
          onPress={() => setStep((s) => Math.max(0, s - 1))}
          disabled={!canGoPrev}
        />

        <View style={styles.navCenter}>
          <Text style={styles.navCenterLabel}>Timeline Control</Text>
          <Text style={styles.navCenterValue}>Viewing Round {current.round}</Text>
        </View>

        <NavButton
          label="Next →"
          onPress={() => setStep((s) => Math.min(timeline.length - 1, s + 1))}
          disabled={!canGoNext}
        />
        <NavButton
          label="End ⏭"
          onPress={() => setStep(timeline.length - 1)}
          disabled={!canGoNext}
        />
      </View>

      <View style={styles.playerList}>
        {rankedPlayers.map((player, index) => {
          const theme = getPlayerTheme(player.color);
          const isLeader = index === 0;

          return (
            <AnimatedCard
              key={player.id}
              style={[
                styles.playerCard,
                {
                  backgroundColor: ui.panelAlt,
                  borderColor: theme.border,
                  shadowColor: theme.glow,
                },
              ]}
            >
              <View style={[styles.playerGlow, { backgroundColor: theme.glow }]} />

              <View style={styles.playerHeader}>
                <View style={styles.playerIdentity}>
                  <View
                    style={[
                      styles.playerDot,
                      {
                        backgroundColor: theme.accent,
                        shadowColor: theme.accent,
                      },
                    ]}
                  />
                  <View style={styles.playerIdentityText}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <Text style={styles.playerSubtext}>Rank #{index + 1}</Text>
                  </View>
                </View>

                {isLeader ? (
                  <View
                    style={[
                      styles.leadBadge,
                      {
                        backgroundColor: theme.tint,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.leadBadgeText, { color: theme.accent }]}>
                      Leading
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.metricsRow}>
                <MiniMetric
                  label="Prestige"
                  value={player.totalPrestige}
                  accent={theme.accent}
                />
                <MiniMetric label="Score" value={player.score} accent={theme.accent} />
              </View>

              <View style={styles.deltaRow}>
                <View style={styles.deltaTile}>
                  <Text style={styles.deltaLabel}>Prestige Change</Text>
                  <Text
                    style={[
                      styles.deltaValue,
                      {
                        color:
                          player.prestigeDelta > 0 ? ui.success : ui.soft,
                      },
                    ]}
                  >
                    {formatDelta(player.prestigeDelta)}
                  </Text>
                </View>

                <View style={styles.deltaTile}>
                  <Text style={styles.deltaLabel}>Score Change</Text>
                  <Text
                    style={[
                      styles.deltaValue,
                      {
                        color: player.scoreDelta > 0 ? ui.success : ui.soft,
                      },
                    ]}
                  >
                    {formatDelta(player.scoreDelta)}
                  </Text>
                </View>
              </View>

              <View style={styles.signalSection}>
                <Text style={styles.signalLabel}>Replay Signal</Text>
                <View style={styles.signalTrack}>
                  <View
                    style={[
                      styles.signalFill,
                      {
                        width: `${Math.min(100, Math.max(8, player.totalPrestige * 6))}%`,
                        backgroundColor: theme.accent,
                      },
                    ]}
                  />
                </View>
              </View>
            </AnimatedCard>
          );
        })}
      </View>
    </ChartShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: ui.borderStrong,
    backgroundColor: ui.panel,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroCopy: {
    flex: 1,
  },
  heroEyebrow: {
    color: ui.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 6,
  },
  heroTitle: {
    color: ui.text,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
  },
  heroSubtitle: {
    color: ui.soft,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },

  leaderChip: {
    minWidth: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ui.border,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    alignItems: 'flex-end',
  },
  leaderChipLabel: {
    color: ui.muted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  leaderChipValue: {
    color: ui.text,
    fontSize: 13,
    fontWeight: '800',
  },

  progressWrap: {
    gap: 6,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#60a5fa',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: ui.muted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryTile: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ui.border,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  summaryLabel: {
    color: ui.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  summaryValue: {
    color: ui.text,
    fontSize: 18,
    fontWeight: '900',
  },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navCenter: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ui.border,
    backgroundColor: ui.panelAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCenterLabel: {
    color: ui.muted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  navCenterValue: {
    color: ui.text,
    fontSize: 13,
    fontWeight: '800',
  },

  navButton: {
    minWidth: 84,
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ui.borderStrong,
    backgroundColor: ui.panelRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  navButtonDisabled: {
    opacity: 0.42,
  },
  navButtonText: {
    color: ui.text,
    fontSize: 13,
    fontWeight: '800',
  },
  navButtonTextDisabled: {
    color: ui.muted,
  },

  playerList: {
    gap: 12,
  },
  playerCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderRadius: 20,
    elevation: 6,
  },
  playerGlow: {
    position: 'absolute',
    top: -18,
    right: -10,
    width: 88,
    height: 88,
    borderRadius: 999,
    opacity: 0.5,
  },

  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  playerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  playerIdentityText: {
    flex: 1,
  },
  playerDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  playerName: {
    color: ui.text,
    fontSize: 16,
    fontWeight: '900',
  },
  playerSubtext: {
    color: ui.muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  leadBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  leadBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },

  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricTile: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
  },
  metricLabel: {
    color: ui.muted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
  },

  deltaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  deltaTile: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ui.border,
    backgroundColor: 'rgba(2, 6, 23, 0.6)',
  },
  deltaLabel: {
    color: ui.muted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 5,
  },
  deltaValue: {
    fontSize: 16,
    fontWeight: '900',
  },

  signalSection: {
    gap: 8,
  },
  signalLabel: {
    color: ui.soft,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  signalTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
  },
  signalFill: {
    height: '100%',
    borderRadius: 999,
  },

  emptyCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: 20,
    borderWidth: 1,
    borderColor: ui.borderStrong,
    backgroundColor: ui.panel,
  },
  emptyEyebrow: {
    color: ui.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  emptyTitle: {
    color: ui.text,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  emptyBody: {
    color: ui.soft,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 340,
  },

  nebulaA: {
    position: 'absolute',
    top: -28,
    right: -4,
    width: 128,
    height: 128,
    borderRadius: 999,
    backgroundColor: ui.nebulaBlue,
  },
  nebulaB: {
    position: 'absolute',
    bottom: -28,
    left: -16,
    width: 112,
    height: 112,
    borderRadius: 999,
    backgroundColor: ui.nebulaPurple,
  },
  nebulaC: {
    position: 'absolute',
    top: 40,
    right: 86,
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: ui.nebulaGreen,
  },
  star1: {
    position: 'absolute',
    top: 18,
    right: 46,
    width: 3,
    height: 3,
    borderRadius: 999,
    backgroundColor: ui.starSoft,
  },
  star2: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: ui.star,
  },
  star3: {
    position: 'absolute',
    bottom: 24,
    left: 86,
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: ui.starSoft,
  },
});
