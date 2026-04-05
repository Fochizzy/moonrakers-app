const BASE = 4;

export const spacing = {
  xs: BASE * 1,
  sm: BASE * 2,
  md: BASE * 4,
  lg: BASE * 6,
  xl: BASE * 8,
  '2xl': BASE * 10,
} as const;

export type Spacing = typeof spacing;
export type SpacingKey = keyof typeof spacing;

export const space = (key: SpacingKey | number) =>
  typeof key === 'number' ? key : spacing[key];
