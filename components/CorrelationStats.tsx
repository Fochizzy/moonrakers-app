import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import { useStore } from '@/store/useStore';
import Text from '@/components/ui/Text';
import { chartColors, withAlpha } from '@/utils/chartTheme';
import {
  buildCorrelationResults,
  getTopSynergyPairs,
} from '@/utils/advancedStats';

function formatCorrelation(value: number) {
  if (!Number.isFinite(value)) return '0.00';
  return value.toFixed(2);
}

function correlation(x: number[], y: number[]) {
  if (x.length !== y.length || x.length < 2) return 0;

  const n = x.length;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  if (!Number.isFinite(denom) || denom === 0) return 0;

  return numerator / denom;
}

function getWinnerId(game: any) {
  return game.winnerId || game.selectedWinnerId || game.manualWinnerId || null;
}

function getEarliestLeaderMap(game: any) {
  const result: Record<string, number> = {};
  const players = Array.isArray(game?.players) ? game.players : [];
  const rounds = Array.isArray(game?.rounds)
    ? game.rounds
    : Array.isArray(game?.timeline)
    ? game.timeline
    : [];

  if (players.length === 0 || rounds.length === 0) {
    return result;
  }

  const firstRound = rounds[0];
  const firstRoundTotals: Record<string, number> = {};

  for (const player of players) {
    const playerId = player?.id;
    if (!playerId) continue;

    let value = 0;

    if (firstRound?.totals?.[playerId]?.totalPrestige != null) {
      value = Number(firstRound.totals[playerId].totalPrestige ?? 0);
    } else if (firstRound?.totals?.[playerId]?.prestige != null) {
      value = Number(firstRound.totals[playerId].prestige ?? 0);
    } else if (Array.isArray(firstRound?.entries)) {
      const entry = firstRound.entries.find((e: any) => e?.playerId === playerId);
      value = Number(entry?.totalPrestige ?? entry?.prestige ?? 0);
    } else if (Array.isArray(firstRound?.players)) {
      const entry = firstRound.players.find((e: any) => e?.id === playerId);
      value = Number(entry?.totalPrestige ?? entry?.prestige ?? 0);
    }

    firstRoundTotals[playerId] = Number.isFinite(value) ? value : 0;
  }

  const values = Object.values(firstRoundTotals);
  if (values.length === 0) return result;

  const maxValue = Math.max(...values);

  for (const player of players) {
    const playerId = player?.id;
    if (!playerId) continue;
    result[playerId] = firstRoundTotals[playerId] === maxValue && maxValue > 0 ? 1 : 0;
  }

  return result;
}

function computeGlobalMetaCorrelations(games: any[]) {
  const contractsFailureRatio: number[] = [];
  const assistsGiven: number[] = [];
  const assistsReceived: number[] = [];
  const earlyLead: number[] = [];
  const wins: number[] = [];

  for (const game of games ?? []) {
    const winnerId = getWinnerId(game);
    const players = Array.isArray(game?.players) ? game.players : [];
    const earliestLeaderMap = getEarliestLeaderMap(game);

    for (const player of players) {
      const playerId = player?.id;
      if (!playerId) continue;

      const totals = game?.totals?.[playerId] ?? {};

      const contracts = Number(totals?.contracts ?? 0);
      const failures = Number(totals?.failures ?? 0);
      const assists = Number(totals?.assists ?? 0);
      const assistPrestigeReceived = Number(totals?.assistPrestigeReceived ?? 0);

      contractsFailureRatio.push(contracts / Math.max(1, failures));
      assistsGiven.push(assists);
      assistsReceived.push(assistPrestigeReceived);
      earlyLead.push(Number(earliestLeaderMap[playerId] ?? 0));
      wins.push(playerId === winnerId ? 1 : 0);
    }
  }

  return [
    {
      label: 'Contracts / Failures Ratio vs Win Rate',
      value: correlation(contractsFailureRatio, wins),
    },
    {
      label: 'Assists Given vs Win Rate',
      value: correlation(assistsGiven, wins),
    },
    {
      label: 'Assists Received vs Win Rate',
      value: correlation(assistsReceived, wins),
    },
    {
      label: 'Early Lead vs Final Win',
      value: correlation(earlyLead, wins),
    },
  ];
}

function getStrengthMeta(value: number) {
  const abs = Math.abs(value);

  if (abs >= 0.72) {
    return {
      label: 'Critical',
      color: '#22c55e',
      glow: 'rgba(34,197,94,0.26)',
      track: 'rgba(34,197,94,0.90)',
    };
  }

  if (abs >= 0.5) {
    return {
      label: 'Strong',
      color: '#38bdf8',
      glow: 'rgba(56,189,248,0.24)',
      track: 'rgba(56,189,248,0.88)',
    };
  }

  if (abs >= 0.28) {
    return {
      label: 'Moderate',
      color: '#a855f7',
      glow: 'rgba(168,85,247,0.22)',
      track: 'rgba(168,85,247,0.86)',
    };
  }

  return {
    label: 'Weak',
    color: '#94a3b8',
    glow: 'rgba(148,163,184,0.16)',
    track: 'rgba(148,163,184,0.72)',
  };
}

function getDirectionMeta(value: number) {
  if (value > 0.08) {
    return { label: 'Positive', color: '#67e8f9' };
  }

  if (value < -0.08) {
    return { label: 'Negative', color: '#fb7185' };
  }

  return { label: 'Neutral', color: '#cbd5e1' };
}

function getBarFillStyle(value: number, color: string) {
  const width = `${Math.max(8, Math.abs(value) * 100)}%`;

  if (value > 0.08) {
    return {
      alignSelf: 'flex-end' as const,
      width,
      backgroundColor: color,
    };
  }

  if (value < -0.08) {
    return {
      alignSelf: 'flex-start' as const,
      width,
      backgroundColor: color,
    };
  }

  return {
    alignSelf: 'center' as const,
    width: '12%',
    backgroundColor: withAlpha('#cbd5e1', 0.55),
  };
}

function SectionPanel({
  eyebrow,
  title,
  meta,
  children,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionPanel}>
      <View pointerEvents="none" style={styles.sectionGlow} />
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function SummaryStat({
  value,
  label,
  accent,
}: {
  value: number | string;
  label: string;
  accent: string;
}) {
  return (
    <View style={[styles.summaryCard, { borderColor: withAlpha(accent, 0.22) }]}>
      <View
        pointerEvents="none"
        style={[styles.summaryGlow, { backgroundColor: withAlpha(accent, 0.14) }]}
      />
      <Text style={[styles.summaryValue, { color: '#ffffff' }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
      <View style={[styles.summaryAccent, { backgroundColor: accent }]} />
    </View>
  );
}

function CorrelationCard({
  label,
  value,
  strength,
}: {
  label: string;
  value: number;
  strength?: string;
}) {
  const strengthMeta = getStrengthMeta(value);
  const directionMeta = getDirectionMeta(value);

  return (
    <View
      style={[
        styles.metricCard,
        {
          borderColor: withAlpha(strengthMeta.color, 0.3),
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[styles.metricGlow, { backgroundColor: strengthMeta.glow }]}
      />

      <View style={styles.metricHeader}>
        <Text style={styles.metricLabel}>{label}</Text>

        <View
          style={[
            styles.metricBadge,
            {
              backgroundColor: withAlpha(strengthMeta.color, 0.14),
              borderColor: withAlpha(strengthMeta.color, 0.38),
            },
          ]}
        >
          <Text style={[styles.metricBadgeText, { color: strengthMeta.color }]}>
            {strength ?? strengthMeta.label}
          </Text>
        </View>
      </View>

      <View style={styles.metricNumbers}>
        <View style={styles.metricPrimaryBlock}>
          <Text style={styles.metricPrimaryLabel}>Coefficient</Text>
          <Text style={styles.metricValue}>r = {formatCorrelation(value)}</Text>
        </View>

        <View style={styles.metricPrimaryBlockRight}>
          <Text style={styles.metricPrimaryLabel}>Signal</Text>
          <Text style={[styles.metricDirection, { color: directionMeta.color }]}>
            {directionMeta.label}
          </Text>
        </View>
      </View>

      <View style={styles.barTrack}>
        <View style={styles.barCenterLine} />
        <View
          style={[styles.barFill, getBarFillStyle(value, strengthMeta.track)]}
        />
      </View>

      <View style={styles.metricFooter}>
        <Text style={styles.metricFooterText}>
          Magnitude: {Math.abs(value).toFixed(2)}
        </Text>
      </View>
    </View>
  );
}

function SynergyCard({
  rank,
  names,
  score,
}: {
  rank: number;
  names: string;
  score: number;
}) {
  const accent =
    rank === 0
      ? '#facc15'
      : rank === 1
      ? '#67e8f9'
      : rank === 2
      ? '#c084fc'
      : '#94a3b8';

  return (
    <View style={[styles.synergyCard, { borderColor: withAlpha(accent, 0.24) }]}>
      <View
        pointerEvents="none"
        style={[styles.synergyGlow, { backgroundColor: withAlpha(accent, 0.12) }]}
      />

      <View
        style={[
          styles.synergyRankOrb,
          {
            backgroundColor: withAlpha(accent, 0.14),
            borderColor: withAlpha(accent, 0.36),
          },
        ]}
      >
        <Text style={[styles.synergyRankText, { color: accent }]}>#{rank + 1}</Text>
      </View>

      <View style={styles.synergyContent}>
        <Text style={styles.synergyNames}>{names}</Text>

        <View style={styles.synergyMetaRow}>
          <Text style={styles.synergyMetaLabel}>Alliance Signal</Text>
          <Text style={[styles.synergyScore, { color: accent }]}>{score}</Text>
        </View>

        <View style={styles.synergyScoreTrack}>
          <View
            style={[
              styles.synergyScoreFill,
              {
                width: `${Math.min(100, Math.max(10, score))}%`,
                backgroundColor: withAlpha(accent, 0.82),
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

export default function CorrelationStats() {
  const games = useStore((s: any) => s.games ?? []);
  const players = useStore((s: any) => s.players ?? []);
  const relationships = useStore((s: any) => s.relationships ?? {});

  const correlations = useMemo(() => {
    return buildCorrelationResults(games, relationships);
  }, [games, relationships]);

  const globalMetaCorrelations = useMemo(() => {
    return computeGlobalMetaCorrelations(games);
  }, [games]);

  const synergyPairs = useMemo(() => {
    return getTopSynergyPairs(relationships, 5);
  }, [relationships]);

  const playerNameMap = useMemo(() => {
    return new Map((players ?? []).map((player: any) => [player.id, player.name]));
  }, [players]);

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.nebulaPurple} />
      <View pointerEvents="none" style={styles.nebulaBlue} />
      <View pointerEvents="none" style={styles.nebulaCyan} />
      <View pointerEvents="none" style={styles.nebulaPink} />
      <View pointerEvents="none" style={styles.star1} />
      <View pointerEvents="none" style={styles.star2} />
      <View pointerEvents="none" style={styles.star3} />
      <View pointerEvents="none" style={styles.star4} />
      <View pointerEvents="none" style={styles.star5} />

      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>TACTICAL INTELLIGENCE</Text>
        <Text style={styles.heroTitle}>Correlation Matrix</Text>
        <Text style={styles.heroSubtitle}>
          Real-time prestige outcome signals, macro gameplay correlations, and
          top alliance chemistry in a hardened sci-fi analytics panel.
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <SummaryStat
          value={correlations.length}
          label="Relationship Signals"
          accent={chartColors?.purple ?? '#a855f7'}
        />
        <SummaryStat
          value={globalMetaCorrelations.length}
          label="Meta Factors"
          accent={chartColors?.blue ?? '#3b82f6'}
        />
        <SummaryStat
          value={synergyPairs.length}
          label="Synergy Pairs"
          accent="#67e8f9"
        />
      </View>

      <SectionPanel
        eyebrow="RELATIONSHIP DATA"
        title="Pairing Correlations"
        meta={`${correlations.length} metrics`}
      >
        <Text style={styles.sectionDescription}>
          Winner logic is based on total prestige. Secondary score data is not used
          to determine final outcome here.
        </Text>

        <View style={styles.metricList}>
          {correlations.map((item: any) => (
            <CorrelationCard
              key={item.label}
              label={item.label}
              value={item.value}
              strength={item.strength}
            />
          ))}
        </View>
      </SectionPanel>

      <SectionPanel
        eyebrow="GLOBAL META"
        title="Macro Correlations"
        meta={`${globalMetaCorrelations.length} factors`}
      >
        <View style={styles.metricList}>
          {globalMetaCorrelations.map((item) => (
            <CorrelationCard
              key={item.label}
              label={item.label}
              value={item.value}
            />
          ))}
        </View>
      </SectionPanel>

      <SectionPanel
        eyebrow="ALLIANCE MATRIX"
        title="Top Synergy Pairs"
        meta={synergyPairs.length === 0 ? 'No data' : `${synergyPairs.length} pairs`}
      >
        {synergyPairs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No alliance telemetry yet</Text>
            <Text style={styles.emptySubtitle}>
              Play more games to surface repeat-winning pair chemistry and support
              patterns.
            </Text>
          </View>
        ) : (
          <View style={styles.synergyList}>
            {synergyPairs.map((pair: any, index: number) => (
              <SynergyCard
                key={`${pair.a}-${pair.b}`}
                rank={index}
                names={`${playerNameMap.get(pair.a) ?? pair.a} + ${
                  playerNameMap.get(pair.b) ?? pair.b
                }`}
                score={pair.score}
              />
            ))}
          </View>
        )}
      </SectionPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    padding: 18,
    borderRadius: 28,
    gap: 18,
    backgroundColor: '#040812',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.18)',
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.28,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },

  nebulaPurple: {
    position: 'absolute',
    top: -54,
    right: -18,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(168,85,247,0.13)',
  },
  nebulaBlue: {
    position: 'absolute',
    bottom: -72,
    left: -28,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.11)',
  },
  nebulaCyan: {
    position: 'absolute',
    top: 140,
    left: 30,
    width: 130,
    height: 130,
    borderRadius: 999,
    backgroundColor: 'rgba(34,211,238,0.08)',
  },
  nebulaPink: {
    position: 'absolute',
    top: 280,
    right: -20,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: 'rgba(244,114,182,0.06)',
  },

  star1: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 2,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  star2: {
    position: 'absolute',
    top: 70,
    right: 54,
    width: 3,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.56)',
  },
  star3: {
    position: 'absolute',
    bottom: 40,
    right: 24,
    width: 2,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.66)',
  },
  star4: {
    position: 'absolute',
    top: 220,
    right: 18,
    width: 1.5,
    height: 1.5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  star5: {
    position: 'absolute',
    bottom: 210,
    left: 40,
    width: 1.5,
    height: 1.5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.62)',
  },

  hero: {
    gap: 6,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#67e8f9',
  },
  heroTitle: {
    fontSize: 31,
    fontWeight: '900',
    color: '#f8fbff',
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(226,232,240,0.78)',
    maxWidth: 580,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(9,14,28,0.94)',
    borderWidth: 1,
    gap: 4,
  },
  summaryGlow: {
    position: 'absolute',
    top: -18,
    right: -12,
    width: 90,
    height: 90,
    borderRadius: 999,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(148,163,184,0.92)',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  summaryAccent: {
    marginTop: 8,
    height: 3,
    borderRadius: 999,
    width: '100%',
  },

  sectionPanel: {
    position: 'relative',
    overflow: 'hidden',
    gap: 12,
    padding: 15,
    borderRadius: 22,
    backgroundColor: 'rgba(7,11,23,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
  },
  sectionGlow: {
    position: 'absolute',
    top: -30,
    right: -10,
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionTitleWrap: {
    flex: 1,
    gap: 4,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: 'rgba(103,232,249,0.94)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#f8fafc',
  },
  sectionMeta: {
    fontSize: 11,
    fontWeight: '900',
    color: 'rgba(148,163,184,0.88)',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(148,163,184,0.88)',
  },

  metricList: {
    gap: 10,
  },
  metricCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: 'rgba(10,16,30,0.96)',
    gap: 12,
  },
  metricGlow: {
    position: 'absolute',
    top: -16,
    right: -14,
    width: 120,
    height: 120,
    borderRadius: 999,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  metricLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: '#f8fafc',
  },
  metricBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  metricBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.85,
  },
  metricNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricPrimaryBlock: {
    flex: 1,
    gap: 3,
  },
  metricPrimaryBlockRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  metricPrimaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(148,163,184,0.82)',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 21,
    fontWeight: '900',
    color: '#ffffff',
  },
  metricDirection: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  barTrack: {
    position: 'relative',
    height: 13,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(15,23,42,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.10)',
    justifyContent: 'center',
  },
  barCenterLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    marginLeft: -0.5,
    backgroundColor: 'rgba(226,232,240,0.20)',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  metricFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  metricFooterText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(148,163,184,0.82)',
  },

  synergyList: {
    gap: 10,
  },
  synergyCard: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(10,16,30,0.96)',
    borderWidth: 1,
  },
  synergyGlow: {
    position: 'absolute',
    top: -20,
    right: -10,
    width: 110,
    height: 110,
    borderRadius: 999,
  },
  synergyRankOrb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  synergyRankText: {
    fontSize: 13,
    fontWeight: '900',
  },
  synergyContent: {
    flex: 1,
    gap: 7,
  },
  synergyNames: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  synergyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  synergyMetaLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: 'rgba(148,163,184,0.84)',
  },
  synergyScore: {
    fontSize: 17,
    fontWeight: '900',
  },
  synergyScoreTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.10)',
  },
  synergyScoreFill: {
    height: '100%',
    borderRadius: 999,
  },

  emptyState: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(10,16,30,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(148,163,184,0.84)',
  },
});
