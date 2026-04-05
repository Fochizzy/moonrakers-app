import React from 'react';
import { StyleSheet, View } from 'react-native';

import Text from '@/components/ui/Text';
import { chartColors, withAlpha } from '@/utils/chartTheme';

type StatItem = {
  label: string;
  value: string;
};

type LegendItem = React.ReactNode;

type Props = {
  title: string;
  subtitle?: string;
  badge?: string;
  topStats?: StatItem[];
  explanation?: string;
  meaning?: string;
  legend?: LegendItem;
  children?: React.ReactNode;
  playerColor?: string;
  accentColor?: string;
  tintColor?: string;
};

function safeText(value: unknown): string {
  if (value == null) return '—';
  const asString = String(value);
  return asString.trim() ? asString : '—';
}

export default function ChartShell({
  title,
  subtitle,
  badge,
  topStats = [],
  explanation,
  meaning,
  legend,
  children,
  playerColor,
  accentColor,
  tintColor,
}: Props) {
  const accent = accentColor || playerColor || chartColors.purple;
  const tint = tintColor || withAlpha(accent, 0.12);
  const displayedTopStats = Array.isArray(topStats)
    ? topStats.filter((item) => item && item.label)
    : [];

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.heroCard,
          {
            borderColor: withAlpha(accent, 0.32),
            backgroundColor: tint,
          },
        ]}
      >
        <View style={styles.heroHeader}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{safeText(title)}</Text>
            {subtitle ? <Text style={styles.subtitle}>{safeText(subtitle)}</Text> : null}
          </View>

          {badge ? (
            <View
              style={[
                styles.badge,
                {
                  borderColor: withAlpha(accent, 0.38),
                  backgroundColor: withAlpha(accent, 0.16),
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: accent }]}>{safeText(badge)}</Text>
            </View>
          ) : null}
        </View>

        {displayedTopStats.length ? (
          <View style={styles.statsGrid}>
            {displayedTopStats.map((item, index) => (
              <View
                key={`${item.label}-${index}`}
                style={[
                  styles.statCard,
                  {
                    borderColor: withAlpha(accent, 0.18),
                  },
                ]}
              >
                <Text style={styles.statLabel}>{safeText(item.label)}</Text>
                <Text style={styles.statValue}>{safeText(item.value)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {explanation ? (
          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>What it shows</Text>
            <Text style={styles.infoText}>{safeText(explanation)}</Text>
          </View>
        ) : null}

        {meaning ? (
          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>How to read it</Text>
            <Text style={styles.infoText}>{safeText(meaning)}</Text>
          </View>
        ) : null}

        {legend ? <View style={styles.legendWrap}>{legend}</View> : null}
      </View>

      <View style={styles.contentCard}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  heroHeader: {
    gap: 10,
  },
  titleWrap: {
    gap: 4,
  },
  title: {
    color: chartColors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  subtitle: {
    color: chartColors.subtext,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    minWidth: 96,
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    backgroundColor: 'rgba(15,23,42,0.36)',
    gap: 3,
  },
  statLabel: {
    color: chartColors.subtext,
    fontSize: 11,
    fontWeight: '700',
  },
  statValue: {
    color: chartColors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  infoBlock: {
    gap: 4,
  },
  infoTitle: {
    color: chartColors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  infoText: {
    color: chartColors.subtext,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  legendWrap: {
    marginTop: 2,
  },
  contentCard: {
    gap: 12,
  },
});
