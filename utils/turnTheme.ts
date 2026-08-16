// turnTheme.ts

export type PlayerColorName =
  | 'green'
  | 'purple'
  | 'blue'
  | 'orange'
  | 'yellow'
  | 'default';

type RGB = readonly [number, number, number];

type BasePlayerColor = {
  key: PlayerColorName;
  accent: string;
  background: string;
  rgb: RGB;
};

export type PlayerColorSet = BasePlayerColor & {
  tint: string;
};

export type NebulaLayers = {
  core: string;
  mid: string;
  outer: string;
  haze: string;
};

export type StarfieldOverlay = {
  star: string;
  softStar: string;
  glow: string;
  dust: string;
};

export type PlayerTheme = PlayerColorSet & {
  border: string;
  glow: string;
  ring: string;
  text: string;
  mutedText: string;
  gradient: readonly [string, string];
  nebulaGradient: readonly [string, string, string];
  glowGradient: readonly [string, string];
};

const TINT_ALPHA = 0.18;
const GLOW_ALPHA = 0.24;
const RING_ALPHA = 0.34;
const MUTED_TEXT_ALPHA = 0.78;

const BASE_PLAYER_COLORS = {
  green: {
    key: 'green',
    accent: '#22c55e',
    background: '#052e16',
    rgb: [34, 197, 94],
  },
  purple: {
    key: 'purple',
    accent: '#a855f7',
    background: '#2e1065',
    rgb: [168, 85, 247],
  },
  blue: {
    key: 'blue',
    accent: '#3b82f6',
    background: '#0c1f3f',
    rgb: [59, 130, 246],
  },
  orange: {
    key: 'orange',
    accent: '#ff8c00',
    background: '#3b1d0a',
    rgb: [255, 140, 0],
  },
  yellow: {
    key: 'yellow',
    accent: '#facc15',
    background: '#3a2f00',
    rgb: [250, 204, 21],
  },
  default: {
    key: 'default',
    accent: '#94a3b8',
    background: '#081120',
    rgb: [148, 163, 184],
  },
} as const satisfies Record<PlayerColorName, BasePlayerColor>;

const PLAYER_COLOR_ALIASES: Record<string, Exclude<PlayerColorName, 'default'>> = {
  gold: 'yellow',
  amber: 'yellow',
  violet: 'purple',
  indigo: 'purple',
  sky: 'blue',
  cyan: 'blue',
  lime: 'green',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rgba([r, g, b]: RGB, alpha: number): string {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexToRgb(hex: string): RGB {
  const normalized = hex.replace('#', '').trim();

  if (normalized.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  return [r, g, b];
}

function mixRgb(a: RGB, b: RGB, weight: number): RGB {
  const w = clamp(weight, 0, 1);

  return [
    Math.round(a[0] + (b[0] - a[0]) * w),
    Math.round(a[1] + (b[1] - a[1]) * w),
    Math.round(a[2] + (b[2] - a[2]) * w),
  ];
}

function rgbToHex([r, g, b]: RGB): string {
  const toHex = (value: number) => clamp(value, 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lighten(hex: string, amount: number): string {
  return rgbToHex(mixRgb(hexToRgb(hex), [255, 255, 255], amount));
}

function darken(hex: string, amount: number): string {
  return rgbToHex(mixRgb(hexToRgb(hex), [0, 0, 0], amount));
}

function withAlpha(hex: string, alpha: number): string {
  return rgba(hexToRgb(hex), alpha);
}

function buildPlayerColorSet(base: BasePlayerColor): PlayerColorSet {
  return {
    ...base,
    tint: rgba(base.rgb, TINT_ALPHA),
  };
}

export const PLAYER_COLORS: Record<PlayerColorName, PlayerColorSet> = Object.freeze({
  green: buildPlayerColorSet(BASE_PLAYER_COLORS.green),
  purple: buildPlayerColorSet(BASE_PLAYER_COLORS.purple),
  blue: buildPlayerColorSet(BASE_PLAYER_COLORS.blue),
  orange: buildPlayerColorSet(BASE_PLAYER_COLORS.orange),
  yellow: buildPlayerColorSet(BASE_PLAYER_COLORS.yellow),
  default: buildPlayerColorSet(BASE_PLAYER_COLORS.default),
});

function isPlayerColorName(value: string): value is PlayerColorName {
  return value in PLAYER_COLORS;
}

export function parsePlayerColor(color?: string | null): PlayerColorName {
  const normalized = color?.trim().toLowerCase();
  if (!normalized) return 'default';

  const resolved = PLAYER_COLOR_ALIASES[normalized] ?? normalized;
  return isPlayerColorName(resolved) ? resolved : 'default';
}

export function isKnownPlayerColor(color?: string | null): boolean {
  if (!color) return false;

  const normalized = color.trim().toLowerCase();
  return isPlayerColorName(normalized) || normalized in PLAYER_COLOR_ALIASES;
}

export function getPlayerColorSet(color?: string | null): PlayerColorSet {
  return PLAYER_COLORS[parsePlayerColor(color)];
}

export function getPlayerAccentColor(color?: string | null): string {
  return getPlayerColorSet(color).accent;
}

export function getPlayerBackgroundColor(color?: string | null): string {
  return getPlayerColorSet(color).background;
}

export function getPlayerTintColor(color?: string | null): string {
  return getPlayerColorSet(color).tint;
}

export function getPlayerBorderColor(color?: string | null): string {
  return getPlayerColorSet(color).accent;
}

export function getPlayerGlowColor(color?: string | null): string {
  const palette = getPlayerColorSet(color);
  return rgba(palette.rgb, GLOW_ALPHA);
}

export function getPlayerRingColor(color?: string | null): string {
  const palette = getPlayerColorSet(color);
  return rgba(palette.rgb, RING_ALPHA);
}

export function getPlayerTextColor(): string {
  return '#f8fafc';
}

export function getPlayerMutedTextColor(color?: string | null): string {
  const palette = getPlayerColorSet(color);
  return withAlpha(lighten(palette.accent, 0.32), MUTED_TEXT_ALPHA);
}

export function getPlayerGradient(color?: string | null): readonly [string, string] {
  const palette = getPlayerColorSet(color);

  return [
    lighten(palette.background, 0.08),
    palette.background,
  ] as const;
}

export function getPlayerGlowGradient(color?: string | null): readonly [string, string] {
  const palette = getPlayerColorSet(color);

  return [
    withAlpha(lighten(palette.accent, 0.18), 0.28),
    withAlpha(palette.background, 0.02),
  ] as const;
}

export function getPlayerNebulaGradient(
  color?: string | null,
): readonly [string, string, string] {
  const palette = getPlayerColorSet(color);

  return [
    withAlpha(lighten(palette.accent, 0.22), 0.3),
    withAlpha(lighten(palette.background, 0.08), 0.16),
    withAlpha(darken(palette.background, 0.08), 0.04),
  ] as const;
}

export function getPlayerNebulaLayers(color?: string | null): NebulaLayers {
  const palette = getPlayerColorSet(color);

  return {
    core: withAlpha(lighten(palette.accent, 0.2), 0.32),
    mid: withAlpha(palette.accent, 0.14),
    outer: withAlpha(lighten(palette.background, 0.1), 0.08),
    haze: withAlpha(lighten(palette.accent, 0.35), 0.06),
  } as const;
}

export function getStarfieldOverlay(color?: string | null): StarfieldOverlay {
  const palette = getPlayerColorSet(color);

  return {
    star: 'rgba(255, 255, 255, 0.9)',
    softStar: 'rgba(255, 255, 255, 0.45)',
    glow: withAlpha(lighten(palette.accent, 0.3), 0.18),
    dust: withAlpha(lighten(palette.background, 0.45), 0.08),
  } as const;
}

export function getPlayerTheme(color?: string | null): PlayerTheme {
  const palette = getPlayerColorSet(color);

  return {
    ...palette,
    border: palette.accent,
    glow: rgba(palette.rgb, GLOW_ALPHA),
    ring: rgba(palette.rgb, RING_ALPHA),
    text: '#f8fafc',
    mutedText: withAlpha(lighten(palette.accent, 0.32), MUTED_TEXT_ALPHA),
    gradient: [
      lighten(palette.background, 0.08),
      palette.background,
    ] as const,
    glowGradient: [
      withAlpha(lighten(palette.accent, 0.18), 0.28),
      withAlpha(palette.background, 0.02),
    ] as const,
    nebulaGradient: [
      withAlpha(lighten(palette.accent, 0.22), 0.3),
      withAlpha(lighten(palette.background, 0.08), 0.16),
      withAlpha(darken(palette.background, 0.08), 0.04),
    ] as const,
  };
}

export function getPlayerShadowStyle(color?: string | null) {
  const theme = getPlayerTheme(color);

  return {
    shadowColor: theme.accent,
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 8,
  } as const;
}

export function getPlayerCardStyle(color?: string | null) {
  const theme = getPlayerTheme(color);

  return {
    backgroundColor: theme.background,
    borderColor: withAlpha(theme.accent, 0.34),
  } as const;
}

export function getPlayerBadgeStyle(color?: string | null) {
  const theme = getPlayerTheme(color);

  return {
    backgroundColor: theme.tint,
    borderColor: withAlpha(theme.accent, 0.28),
    color: theme.text,
  } as const;
}

export function getPlayerSurfaceStyle(color?: string | null) {
  const theme = getPlayerTheme(color);

  return {
    backgroundColor: withAlpha(theme.accent, 0.08),
    borderColor: withAlpha(theme.accent, 0.22),
  } as const;
}

export function getPlayerButtonStyle(color?: string | null) {
  const theme = getPlayerTheme(color);

  return {
    backgroundColor: withAlpha(theme.accent, 0.14),
    borderColor: withAlpha(theme.accent, 0.3),
    color: theme.text,
  } as const;
}
