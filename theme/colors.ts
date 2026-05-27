const palette = {
  gray: {
    950: '#0B0B0F',
    900: '#111827',
    800: '#1E293B',
    400: '#94A3B8',
    50: '#FFFFFF',
  },

  indigo: {
    500: '#6366F1',
  },

  green: {
    500: '#22C55E',
  },

  yellow: {
    400: '#2DD4BF',
  },

  red: {
    500: '#EF4444',
  },

  rank: {
    bronze: '#0F766E',
    silver: '#C0C0C0',
    gold: '#5EEAD4',
    platinum: '#E5E4E2',
    diamond: '#0DCAF0',
  },
} as const;

export const colors = {
  background: {
    primary: palette.gray[950],
    secondary: palette.gray[900],
    tertiary: palette.gray[800],
  },

  text: {
    primary: palette.gray[50],
    secondary: palette.gray[400],
    muted: palette.gray[400],
    brand: palette.indigo[500],
  },

  border: {
    subtle: 'rgba(255,255,255,0.06)',
    strong: 'rgba(255,255,255,0.12)',
    tile: 'rgba(255,255,255,0.08)',
    brand: 'rgba(99,102,241,0.28)',
    emphasis: 'rgba(255,255,255,0.18)',
  },

  surface: {
    card: palette.gray[800],
    elevated: '#243047',
    hero: '#162033',
    glass: 'rgba(30,41,59,0.86)',
    tile: 'rgba(255,255,255,0.05)',
    overlay: 'rgba(11,16,32,0.28)',
    alloy: 'rgba(255,255,255,0.04)',
  },

  accent: {
    primary: palette.indigo[500],
    success: palette.green[500],
    warning: palette.yellow[400],
    error: palette.red[500],
    info: '#60A5FA',
  },

  interaction: {
    pressed: 'rgba(255,255,255,0.05)',
    hover: 'rgba(255,255,255,0.08)',
    selected: 'rgba(99,102,241,0.18)',
  },

  rank: palette.rank,
} as const;

export type Colors = typeof colors;
