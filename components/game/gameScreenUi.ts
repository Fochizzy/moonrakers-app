import type { CurrentTurnStats } from '@/engine/gameEngine';
import { COLORS } from '@/utils/colors';
import { toNumber } from '@/utils/numbers';
import { isPlayableTurnMetaType } from '@/utils/headToHeadMission';

export type Player = {
  id: string;
  name: string;
  displayName?: string;
  initials?: string;
  color?: string;
  assignedCardArtIndex?: number | null;
  startOrder?: number;
};

export type BinaryChoice = 0 | 1 | null;

export type HeadToHeadMissionSummary = {
  firstPlaceName: string;
  secondPlaceName: string;
};

export type StoredRound = {
  id: string;
  playerId: string;
  prestige: number;
  contracts: number;
  failures: number;
  assistRecipients: Record<string, number>;
  assistPrestigeRecipients: Record<string, number>;
  objectiveCount: number;
  objectivePrestige: number;
  createdAt: number;
  metaType?: 'main' | 'bonusObjective' | 'headToHeadFirstPlace' | 'headToHeadSecondPlace';
  linkedTurnId?: string;
  headToHeadScoreBonus?: number;
};

export const initialCurrentState: CurrentTurnStats = {
  prestige: 0,
  contracts: 0,
  failures: 0,
  assistRecipients: {},
  assistPrestigeRecipients: {},
  objectiveCount: 0,
  headToHeadFirstPlaceId: null,
  headToHeadSecondPlaceId: null,
};

export const UI = {
  black: '#05070b',
  panelBlack: '#090c12',
  panelElevated: '#0c1018',
  card: '#101722',
  cardSoft: '#0c121b',
  cardMuted: '#0b1018',
  line: COLORS.border,
  lineStrong: 'rgba(255,255,255,0.14)',
  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.68)',
  textFaint: 'rgba(255,255,255,0.44)',
  success: COLORS.success,
  failure: COLORS.danger,
  gold: '#2dd4bf',
  silver: '#c0c0c0',
  pressedScale: 0.97,
} as const;


export function clampCount(value: unknown): number {
  return Math.max(0, Math.floor(toNumber(value)));
}

export function getDisplayRounds(rounds: StoredRound[]) {
  return rounds.filter((round) => isPlayableTurnMetaType(round.metaType));
}
