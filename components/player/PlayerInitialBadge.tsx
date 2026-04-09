import React, { memo, useMemo } from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';

type Props = {
  name?: string;
  initials?: string;
  color?: string;
  size?: number;
  fontSize?: number;
};

function getInitials(name?: string, initials?: string): string {
  if (initials && initials.trim()) {
    return initials.trim().toUpperCase().slice(0, 3);
  }

  if (!name || !name.trim()) return '?';

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function getBadgePalette(color?: string) {
  switch ((color ?? '').toLowerCase()) {
    case 'green':
      return { base: '#22c55e', dark: '#052e16', ring: 'rgba(34,197,94,0.45)', glow: 'rgba(34,197,94,0.30)' };
    case 'purple':
      return { base: '#a855f7', dark: '#2e1065', ring: 'rgba(168,85,247,0.46)', glow: 'rgba(168,85,247,0.30)' };
    case 'orange':
      return { base: '#f97316', dark: '#431407', ring: 'rgba(249,115,22,0.46)', glow: 'rgba(249,115,22,0.28)' };
    case 'yellow':
      return { base: '#eab308', dark: '#3a2f00', ring: 'rgba(234,179,8,0.42)', glow: 'rgba(234,179,8,0.24)' };
    case 'blue':
      return { base: '#3b82f6', dark: '#0c1f3f', ring: 'rgba(59,130,246,0.46)', glow: 'rgba(59,130,246,0.30)' };
    case 'red':
      return { base: '#ef4444', dark: '#450a0a', ring: 'rgba(239,68,68,0.44)', glow: 'rgba(239,68,68,0.28)' };
    case 'pink':
      return { base: '#ec4899', dark: '#4a044e', ring: 'rgba(236,72,153,0.44)', glow: 'rgba(236,72,153,0.28)' };
    default: {
      const fallback = color || '#94a3b8';
      return { base: fallback, dark: '#0f172a', ring: 'rgba(148,163,184,0.34)', glow: 'rgba(148,163,184,0.22)' };
    }
  }
}

function PlayerInitialBadge({
  name,
  initials,
  color,
  size = 40,
  fontSize,
}: Props) {
  const displayInitials = getInitials(name, initials);
  const palette = useMemo(() => getBadgePalette(color), [color]);
  const resolvedFontSize = fontSize ?? Math.max(10, size * 0.34);
  const ringInset = Math.max(2, size * 0.08);
  const orbitSize = Math.max(4, size * 0.16);

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <View pointerEvents="none" style={[styles.outerGlow, { borderRadius: size / 2, backgroundColor: palette.glow }]} />
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: palette.dark,
            borderColor: palette.ring,
          },
        ]}
      >
        <View pointerEvents="none" style={[styles.innerSurface, { borderRadius: size / 2, backgroundColor: palette.base }]} />
        <View
          pointerEvents="none"
          style={[
            styles.innerRing,
            {
              top: ringInset,
              right: ringInset,
              bottom: ringInset,
              left: ringInset,
              borderRadius: size / 2,
              borderColor: 'rgba(255,255,255,0.14)',
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.topHighlight,
            {
              left: size * 0.22,
              right: size * 0.22,
              top: Math.max(2, size * 0.08),
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.orbitDot,
            {
              width: orbitSize,
              height: orbitSize,
              borderRadius: orbitSize / 2,
              top: Math.max(1, size * 0.1),
              right: Math.max(1, size * 0.08),
              backgroundColor: 'rgba(255,255,255,0.72)',
            },
          ]}
        />
        <RNText
          style={[
            styles.text,
            {
              fontSize: resolvedFontSize,
              lineHeight: Math.round(resolvedFontSize * 1.02),
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {displayInitials}
        </RNText>
      </View>
    </View>
  );
}

export default memo(PlayerInitialBadge);

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerGlow: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ scale: 1.08 }],
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  innerSurface: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  innerRing: {
    position: 'absolute',
    borderWidth: 1,
  },
  topHighlight: {
    position: 'absolute',
    height: 1.5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  orbitDot: {
    position: 'absolute',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.6,
    includeFontPadding: false,
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});


