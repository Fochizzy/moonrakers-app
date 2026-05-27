import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';

type Props = {
  rating: number;
  size?: 'sm' | 'md';
  label?: string;
  uppercase?: boolean;
};

type Tier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

function getTier(rating: number): Tier {
  if (rating >= 1400) return 'diamond';
  if (rating >= 1300) return 'platinum';
  if (rating >= 1200) return 'gold';
  if (rating >= 1100) return 'silver';
  return 'bronze';
}

const TIERS: Record<Tier, { bg: string; border: string; text: string; glow: string }> = {
  bronze: {
    bg: 'rgba(15,118,110,0.16)',
    border: 'rgba(20,184,166,0.5)',
    text: '#99F6E4',
    glow: 'rgba(45,212,191,0.24)',
  },
  silver: {
    bg: 'rgba(201,212,232,0.15)',
    border: 'rgba(201,212,232,0.5)',
    text: '#E7EEF9',
    glow: 'rgba(201,212,232,0.2)',
  },
  gold: {
    bg: 'rgba(45,212,191,0.16)',
    border: 'rgba(94,234,212,0.6)',
    text: '#CCFBF1',
    glow: 'rgba(94,234,212,0.25)',
  },
  platinum: {
    bg: 'rgba(125,196,255,0.14)',
    border: 'rgba(125,196,255,0.55)',
    text: '#DDF2FF',
    glow: 'rgba(125,196,255,0.22)',
  },
  diamond: {
    bg: 'rgba(181,124,255,0.16)',
    border: 'rgba(181,124,255,0.65)',
    text: '#F1E3FF',
    glow: 'rgba(181,124,255,0.28)',
  },
};

export default function RankBadge({
  rating,
  size = 'md',
  label,
  uppercase = true,
}: Props) {
  const tier = getTier(rating);
  const palette = TIERS[tier];
  const display = (label ?? tier).replace(/^@/, '');
  const text = uppercase ? display.toUpperCase() : display;

  return (
    <View
      style={[
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          shadowColor: palette.glow,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: palette.text }]} />
      <Text
        style={[
          styles.text,
          size === 'sm' ? styles.textSm : styles.textMd,
          { color: palette.text },
        ]}
        numberOfLines={1}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  sm: {
    minHeight: 22,
    paddingHorizontal: 8,
  },
  md: {
    minHeight: 26,
    paddingHorizontal: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    marginRight: 6,
  },
  text: {
    fontWeight: '900',
    letterSpacing: 0.8,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  textSm: {
    fontSize: 9,
    lineHeight: 11,
  },
  textMd: {
    fontSize: 10,
    lineHeight: 12,
  },
});

