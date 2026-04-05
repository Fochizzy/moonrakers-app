import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
  TextStyle,
  StyleProp,
} from 'react-native';

type Variant = 'title' | 'subtitle' | 'body' | 'caption';

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
    fontWeight: '800',
  },

  subtitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  body: {
    fontSize: 14,
    color: '#E2E8F0',
  },

  caption: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
