export type PlayerColorName =
  | 'green'
  | 'purple'
  | 'blue'
  | 'yellow'
  | 'orange';

export type PlayerColorSet = {
  base: string;
  light: string;
  border: string;
  text: string;
  subtext: string;
};

const PLAYER_COLOR_MAP: Record<PlayerColorName, PlayerColorSet> = {
  green: {
    base: '#22C55E',
    light: '#183126',
    border: '#24543A',
    text: '#DCFCE7',
    subtext: '#A7F3D0',
  },
  purple: {
    base: '#A855F7',
    light: '#2B1F3D',
    border: '#5B3B83',
    text: '#F3E8FF',
    subtext: '#D8B4FE',
  },
  blue: {
    base: '#3B82F6',
    light: '#1A2C45',
    border: '#31527F',
    text: '#DBEAFE',
    subtext: '#93C5FD',
  },
  yellow: {
    base: '#EAB308',
    light: '#3B3317',
    border: '#7C6720',
    text: '#FEF3C7',
    subtext: '#FDE68A',
  },
  orange: {
    base: '#F97316',
    light: '#3B2619',
    border: '#7C4421',
    text: '#FFEDD5',
    subtext: '#FDBA74',
  },
};

const NORMALIZED: Record<string, PlayerColorName> = {
  green: 'green',
  purple: 'purple',
  blue: 'blue',
  yellow: 'yellow',
  orange: 'orange',
};

export const DEFAULT_PLAYER_COLOR: PlayerColorName = 'blue';

export function normalizePlayerColor(
  value?: string | null
): PlayerColorName {
  if (!value || typeof value !== 'string') return DEFAULT_PLAYER_COLOR;

  const key = value.trim().toLowerCase();

  return NORMALIZED[key] ?? DEFAULT_PLAYER_COLOR;
}

export function getPlayerColors(
  color?: string | null
): PlayerColorSet {
  const normalized = normalizePlayerColor(color);

  // 🔒 HARD GUARANTEE: always return a valid object
  return PLAYER_COLOR_MAP[normalized] ?? PLAYER_COLOR_MAP[DEFAULT_PLAYER_COLOR];
}

export function getPlayerBaseColor(color?: string | null) {
  return getPlayerColors(color).base;
}

export function getPlayerLightColor(color?: string | null) {
  return getPlayerColors(color).light;
}

export function getPlayerBorderColor(color?: string | null) {
  return getPlayerColors(color).border;
}

export const CHART_COLOR_ORDER: PlayerColorName[] = [
  'green',
  'purple',
  'blue',
  'yellow',
  'orange',
];

export function getChartColor(index: number): string {
  const key = CHART_COLOR_ORDER[index % CHART_COLOR_ORDER.length];
  return PLAYER_COLOR_MAP[key]?.base ?? PLAYER_COLOR_MAP.blue.base;
}

export const APP_COLORS = {
  background: '#0B1020',
  card: '#162033',
  cardBorder: '#253247',
  overlay: 'rgba(0,0,0,0.16)',

  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
};
