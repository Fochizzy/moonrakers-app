export const PLAYER_LIMITS = Object.freeze({
  MAX: 8,
  MIN: 2,
});

export type PlayerLimits = typeof PLAYER_LIMITS;

export const COLORS = Object.freeze({
  PRIMARY: '#7B61FF',
  SECONDARY: '#5AC8FA',
  BACKGROUND: '#0B0B0F',
  CARD: '#121218',
});

export type ColorKey = keyof typeof COLORS;
export type ColorValue = (typeof COLORS)[ColorKey];

export const DEFAULTS = Object.freeze({
  ROUND: 1,
});

export type Defaults = typeof DEFAULTS;
