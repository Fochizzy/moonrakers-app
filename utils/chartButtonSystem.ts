import { chartColors, withAlpha } from '@/utils/chartTheme';

export const chartButtonSystem = {
  base: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  compact: {
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  rowCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: chartColors.panelBg,
    borderColor: chartColors.borderStrong,
  },
};

export function buildChartButton(active: boolean, color?: string) {
  const accent = color || chartColors.purple;
  return {
    borderColor: active ? accent : chartColors.borderStrong,
    backgroundColor: active ? withAlpha(accent, 0.18) : chartColors.panelBg,
  };
}

export function buildChartGhostButton(active = false) {
  return {
    borderColor: active ? chartColors.purple : chartColors.borderStrong,
    backgroundColor: active ? withAlpha(chartColors.purple, 0.18) : 'rgba(255,255,255,0.04)',
  };
}
