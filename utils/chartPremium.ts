
import { Easing } from 'react-native';

export type Playstyle = 'Aggressor' | 'Support Engine' | 'Opportunist' | 'Closer';

export type RadarTraits = {
  finisher: number;
  starter: number;
  supporter: number;
  receiver: number;
  stability: number;
  efficiency: number;
  risk: number;
  conversion: number;
};

export type PremiumTopStat = {
  label: string;
  value: string;
};

export type PremiumSummaryInput = {
  name: string;
  color?: string;
  winRate?: number;
  avgPrestigePerGame?: number;
  efficiency?: number;
  currentElo?: number;
  assistPrestigeReceived?: number;
  assistPrestigeSent?: number;
  totalPrestige?: number;
  closeGameRate?: number;
  avgPrestigeMargin?: number;
  finalWinRate?: number;
  synergyIndex?: number;
  radar: RadarTraits;
};

export type PremiumSummary = {
  playstyle: Playstyle;
  playstyleReason: string;
  playstyleDefinition: string;
  clutchFactor: number;
  dependencyScore: number;
  topStats: PremiumTopStat[];
};

export const PREMIUM_PRESS_IN_DURATION = 120;
export const PREMIUM_PRESS_OUT_DURATION = 220;
export const PREMIUM_TOOLTIP_DURATION = 220;
export const PREMIUM_EASING = Easing.out(Easing.cubic);

export function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function safeDiv(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return numerator / denominator;
}

export function formatPercent(value: number): string {
  return `${(clamp01(value) * 100).toFixed(1)}%`;
}

export function computeClutchFactor(input: {
  winRate: number;
  closeGameRate: number;
  avgPrestigeMargin: number;
  finisher: number;
  finalWinRate?: number;
}): number {
  const marginScore = clamp01((toNumber(input.avgPrestigeMargin) + 6) / 12);
  const finalRate = clamp01(toNumber(input.finalWinRate) || toNumber(input.winRate));

  return clamp01(
    clamp01(toNumber(input.winRate)) * 0.28 +
      finalRate * 0.22 +
      clamp01(toNumber(input.finisher)) * 0.24 +
      clamp01(toNumber(input.closeGameRate)) * 0.12 +
      marginScore * 0.14
  );
}

export function computeDependencyScore(input: {
  assistPrestigeReceived: number;
  totalPrestige: number;
  receiver: number;
  assistPrestigeSent?: number;
}): number {
  const assistShare = safeDiv(
    toNumber(input.assistPrestigeReceived),
    Math.max(1, toNumber(input.totalPrestige))
  );
  const netSupportBias = safeDiv(
    toNumber(input.assistPrestigeReceived),
    Math.max(1, toNumber(input.assistPrestigeReceived) + toNumber(input.assistPrestigeSent))
  );

  return clamp01(
    assistShare * 0.65 + clamp01(toNumber(input.receiver)) * 0.25 + netSupportBias * 0.1
  );
}

export function classifyPlaystyle(input: {
  radar: RadarTraits;
  clutchFactor: number;
  dependencyScore: number;
  synergyIndex?: number;
}): { playstyle: Playstyle; reason: string; definition: string } {
  const { radar, clutchFactor, dependencyScore } = input;
  const synergyIndex = clamp01(toNumber(input.synergyIndex));

  const aggressor =
    radar.starter * 0.3 +
    radar.conversion * 0.25 +
    radar.efficiency * 0.2 +
    radar.risk * 0.1 +
    (1 - dependencyScore) * 0.15;

  const supportEngine =
    radar.supporter * 0.45 +
    synergyIndex * 0.25 +
    (1 - radar.receiver) * 0.1 +
    radar.stability * 0.1 +
    radar.efficiency * 0.1;

  const opportunist =
    radar.stability * 0.28 +
    radar.efficiency * 0.24 +
    radar.receiver * 0.12 +
    radar.finisher * 0.14 +
    (1 - radar.risk) * 0.1 +
    clutchFactor * 0.12;

  const closer =
    radar.finisher * 0.42 +
    clutchFactor * 0.3 +
    radar.efficiency * 0.12 +
    radar.stability * 0.08 +
    (1 - radar.starter) * 0.08;

  const ranked = [
    {
      playstyle: 'Aggressor' as const,
      score: aggressor,
      reason: 'Fast starts, strong conversion, and pressure generated without leaning heavily on outside support.',
      definition: 'Starts fast, pushes contracts, and forces the pace through self-generated output.',
    },
    {
      playstyle: 'Support Engine' as const,
      score: supportEngine,
      reason: 'Creates value for others, drives team flow, and consistently boosts shared outcomes.',
      definition: 'Creates value for others, feeds assists, and amplifies synergy across the table.',
    },
    {
      playstyle: 'Opportunist' as const,
      score: opportunist,
      reason: 'Wins through timing, efficiency, and exploiting high-value windows instead of always forcing pace.',
      definition: 'Plays patiently and efficiently, capitalizing on windows instead of forcing every fight.',
    },
    {
      playstyle: 'Closer' as const,
      score: closer,
      reason: 'Performs best late and converts decisive moments at a high rate.',
      definition: 'Does the best work late, converts tight games, and finishes when the match is on the line.',
    },
  ].sort((a, b) => b.score - a.score);

  const top = ranked[0];
  return {
    playstyle: top.playstyle,
    reason: top.reason,
    definition: top.definition,
  };
}

export function buildPremiumSummary(input: PremiumSummaryInput): PremiumSummary {
  const clutchFactor = computeClutchFactor({
    winRate: toNumber(input.winRate),
    closeGameRate: toNumber(input.closeGameRate),
    avgPrestigeMargin: toNumber(input.avgPrestigeMargin),
    finisher: input.radar.finisher,
    finalWinRate: input.finalWinRate,
  });

  const dependencyScore = computeDependencyScore({
    assistPrestigeReceived: toNumber(input.assistPrestigeReceived),
    totalPrestige: toNumber(input.totalPrestige),
    receiver: input.radar.receiver,
    assistPrestigeSent: input.assistPrestigeSent,
  });

  const playstyle = classifyPlaystyle({
    radar: input.radar,
    clutchFactor,
    dependencyScore,
    synergyIndex: input.synergyIndex,
  });

  return {
    clutchFactor,
    dependencyScore,
    playstyle: playstyle.playstyle,
    playstyleReason: playstyle.reason,
    playstyleDefinition: playstyle.definition,
    topStats: [
      { label: 'Win Rate', value: formatPercent(toNumber(input.winRate)) },
      { label: 'Avg Prestige', value: toNumber(input.avgPrestigePerGame).toFixed(2) },
      { label: 'ELO', value: String(Math.round(toNumber(input.currentElo))) },
      { label: 'Efficiency', value: toNumber(input.efficiency).toFixed(2) },
      { label: 'Clutch', value: formatPercent(clutchFactor) },
      { label: 'Dependency', value: formatPercent(dependencyScore) },
      { label: 'Playstyle', value: playstyle.playstyle },
    ],
  };
}

export function getNebulaTint(color?: string): string {
  const fallback = '#8b5cf6';
  const value = typeof color === 'string' && color.trim() ? color : fallback;
  return `${value}22`;
}
