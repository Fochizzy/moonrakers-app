import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
  TextStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '@/theme';

type Variant =
  | 'title'
  | 'subtitle'
  | 'body'
  | 'caption'
  | 'eyebrow'
  | 'sectionTitle'
  | 'metricLabel'
  | 'metricValue'
  | 'pageTitle'
  | 'heroSubtitle'
  | 'utilityLabel'
  | 'button';

type Props = RNTextProps & {
  variant?: Variant;
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
};

export default function Text({
  variant = 'body',
  style,
  children,
  ...props
}: Props) {
  const theme = useTheme();

  return (
    <RNText
      style={[
        styles.base,
        { color: theme.colors.text.primary, fontFamily: theme.fonts.family.sans },
        themedStyles(theme)[variant],
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}

function themedStyles(theme: ReturnType<typeof useTheme>) {
  return {
    title: {
      ...theme.text.title,
      color: theme.colors.text.primary,
    },
    subtitle: {
      ...theme.text.subtitle,
      color: theme.colors.text.primary,
    },
    body: {
      ...theme.text.body,
      color: '#E2E8F0',
    },
    caption: {
      ...theme.text.caption,
      color: '#94A3B8',
    },
    eyebrow: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '800' as const,
      color: '#93C5FD',
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
    },
    sectionTitle: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '800' as const,
      color: '#F8FBFF',
    },
    metricLabel: {
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '800' as const,
      color: '#8EA6C8',
      textTransform: 'uppercase' as const,
      letterSpacing: 0.35,
    },
    metricValue: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '900' as const,
      color: '#F8FBFF',
    },
    pageTitle: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '900' as const,
      color: '#F8FBFF',
    },
    heroSubtitle: {
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '600' as const,
      color: '#C7D6F3',
    },
    utilityLabel: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '800' as const,
      color: '#E2E8F0',
      letterSpacing: 0.2,
      textTransform: 'uppercase' as const,
    },
    button: {
      fontSize: 13,
      lineHeight: 16,
      fontWeight: '800' as const,
      color: '#F8FBFF',
      letterSpacing: 0.2,
      textTransform: 'uppercase' as const,
    },
  } satisfies Record<Variant, TextStyle>;
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});


