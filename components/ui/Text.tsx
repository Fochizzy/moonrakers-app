import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
  TextStyle,
  StyleProp,
} from 'react-native';

type Variant =
  | 'title'
  | 'subtitle'
  | 'body'
  | 'caption'
  | 'eyebrow'
  | 'sectionTitle'
  | 'metricLabel'
  | 'metricValue';

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
  return (
    <RNText style={[styles.base, styles[variant], style]} {...props}>
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    color: '#F1F5F9',
  },

  title: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },

  subtitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#E2E8F0',
  },

  caption: {
    fontSize: 12,
    color: '#94A3B8',
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#93C5FD',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FBFF',
  },

  metricLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8EA6C8',
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },

  metricValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#F8FBFF',
  },
});


