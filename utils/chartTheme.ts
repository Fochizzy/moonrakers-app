const NAMED_COLOR_MAP: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
  pink: '#ec4899',
  cyan: '#06b6d4',
  teal: '#14b8a6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  lime: '#84cc16',
  emerald: '#10b981',
  sky: '#0ea5e9',
  slate: '#64748b',
  gray: '#6b7280',
  grey: '#6b7280',
  white: '#ffffff',
  black: '#000000',
};

export const chartColors = {
  bg: '#08111f',
  panelBg: 'rgba(15, 23, 42, 0.9)',
  panelBgStrong: 'rgba(10, 16, 35, 0.94)',
  track: 'rgba(255,255,255,0.08)',
  grid: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.12)',
  borderStrong: 'rgba(255,255,255,0.18)',
  text: '#ffffff',
  subtext: '#cbd5e1',
  muted: '#94a3b8',
  primary: '#8b5cf6',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#f59e0b',
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace('#', '').trim();
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    return { r, g, b };
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

export function normalizeColor(input?: string | null): string {
  if (!input || typeof input !== 'string') return chartColors.purple;

  const raw = input.trim();
  if (!raw) return chartColors.purple;

  if (raw.startsWith('#')) {
    const rgb = hexToRgb(raw);
    return rgb ? raw : chartColors.purple;
  }

  if (/^rgba?\(/i.test(raw)) return raw;

  const lower = raw.toLowerCase();
  return NAMED_COLOR_MAP[lower] || chartColors.purple;
}

export function getPlayerColor(color?: string | null): string {
  return normalizeColor(color);
}

export function withAlpha(color: string | undefined | null, alpha: number): string {
  const safeAlpha = clamp(Number.isFinite(alpha) ? alpha : 1, 0, 1);
  const normalized = normalizeColor(color);

  if (/^rgba\(/i.test(normalized)) {
    const parts = normalized.replace(/^rgba\(/i, '').replace(/\)$/, '').split(',').map((part) => part.trim());
    if (parts.length >= 3) {
      const r = Number(parts[0]) || 0;
      const g = Number(parts[1]) || 0;
      const b = Number(parts[2]) || 0;
      return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
    }
  }

  if (/^rgb\(/i.test(normalized)) {
    const parts = normalized.replace(/^rgb\(/i, '').replace(/\)$/, '').split(',').map((part) => part.trim());
    if (parts.length >= 3) {
      const r = Number(parts[0]) || 0;
      const g = Number(parts[1]) || 0;
      const b = Number(parts[2]) || 0;
      return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
    }
  }

  const rgb = hexToRgb(normalized);
  if (!rgb) return `rgba(139, 92, 246, ${safeAlpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${safeAlpha})`;
}
