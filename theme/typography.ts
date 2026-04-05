import { Platform, TextStyle } from 'react-native';

const platformFonts = Platform.select({
  ios: { sans: 'System', mono: 'Menlo' },
  android: { sans: 'Roboto', mono: 'monospace' },
  default: { sans: 'System', mono: 'monospace' },
});

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
} as const;

export const lineHeights = {
  xs: 16,
  sm: 20,
  md: 22,
  lg: 26,
  xl: 30,
  '2xl': 38,
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  bold: '700',
} as const;

export const fonts = {
  family: {
    sans: platformFonts?.sans ?? 'System',
    mono: platformFonts?.mono ?? 'monospace',
  },
  size: fontSizes,
  lineHeight: lineHeights,
  weight: fontWeights,
} as const;

const create = (
  size: keyof typeof fontSizes,
  weight: keyof typeof fontWeights = 'regular'
): TextStyle => ({
  fontFamily: fonts.family.sans,
  fontSize: fonts.size[size],
  lineHeight: fonts.lineHeight[size],
  fontWeight: fonts.weight[weight],
});

export const textStyles = {
  title: create('xl', 'bold'),
  subtitle: create('lg', 'medium'),
  body: create('md'),
  caption: {
    ...create('sm'),
    opacity: 0.8,
  } as TextStyle,
  mono: {
    ...create('md'),
    fontFamily: fonts.family.mono,
  } as TextStyle,
} as const;

export type Fonts = typeof fonts;
export type TextStyles = typeof textStyles;
