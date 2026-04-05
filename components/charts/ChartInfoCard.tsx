import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import Text from '@/components/ui/Text';
import { chartColors } from '@/utils/chartTheme';

export type ChartInfoTone = 'default' | 'info' | 'success' | 'warning';

export type MetricTooltipRegistryEntry = {
  label?: string;
  explanation?: string;
  meaning?: string;
  bullets?: string[];
  takeaway?: string;
};

export type MetricTooltipRegistry = Record<string, MetricTooltipRegistryEntry>;

type Props = {
  title?: string;
  explanation?: string;
  meaning?: string;
  bullets?: string[];
  takeaway?: string;
  tone?: ChartInfoTone;
  compact?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  metricKey?: string;
  metricLabel?: string;
  tooltips?: MetricTooltipRegistry;
  hideWhenEmpty?: boolean;
};

const DEFAULT_TITLE = 'What this chart shows';

export default function ChartInfoCard({
  title,
  explanation,
  meaning,
  bullets,
  takeaway,
  tone = 'default',
  compact = false,
  collapsible = false,
  defaultExpanded = true,
  metricKey,
  metricLabel,
  tooltips,
  hideWhenEmpty = false,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const registryEntry = useMemo<MetricTooltipRegistryEntry | undefined>(() => {
    if (!metricKey || !tooltips) return undefined;
    return tooltips[metricKey];
  }, [metricKey, tooltips]);

  const resolvedTitle =
    title ??
    metricLabel ??
    registryEntry?.label ??
    (metricKey ? toTitleCase(metricKey) : DEFAULT_TITLE);

  const resolvedExplanation = explanation ?? registryEntry?.explanation ?? '';
  const resolvedMeaning = meaning ?? registryEntry?.meaning;
  const resolvedBullets = bullets ?? registryEntry?.bullets ?? [];
  const resolvedTakeaway = takeaway ?? registryEntry?.takeaway;

  const hasBody = Boolean(
    resolvedExplanation ||
      resolvedMeaning ||
      resolvedTakeaway ||
      resolvedBullets.length,
  );

  if (hideWhenEmpty && !hasBody) {
    return null;
  }

  const palette = getTonePalette(tone);

  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text
            style={[
              styles.title,
              compact && styles.titleCompact,
              { color: palette.title },
            ]}
          >
            {resolvedTitle || DEFAULT_TITLE}
          </Text>
          {metricKey && !title ? (
            <Text style={[styles.kicker, { color: palette.kicker }]}>Metric guide</Text>
          ) : null}
        </View>

        {collapsible ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Collapse chart explanation' : 'Expand chart explanation'}
            onPress={() => setExpanded((value) => !value)}
            style={styles.toggleButton}
          >
            <Text style={[styles.toggleText, { color: palette.kicker }]}>
              {expanded ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {(!collapsible || expanded) && hasBody ? (
        <View style={styles.body}>
          {resolvedExplanation ? (
            <Text
              style={[
                styles.text,
                compact && styles.textCompact,
                { color: palette.text },
              ]}
            >
              {resolvedExplanation}
            </Text>
          ) : null}

          {resolvedMeaning ? (
            <View style={styles.sectionBlock}>
              {!compact ? (
                <Text style={[styles.subtitle, { color: palette.subtitle }]}>How to read it</Text>
              ) : null}
              <Text
                style={[
                  styles.text,
                  compact && styles.textCompact,
                  { color: palette.text },
                ]}
              >
                {resolvedMeaning}
              </Text>
            </View>
          ) : null}

          {resolvedBullets.length ? (
            <View style={styles.sectionBlock}>
              {!compact ? (
                <Text style={[styles.subtitle, { color: palette.subtitle }]}>Look for</Text>
              ) : null}
              <View style={styles.bulletList}>
                {resolvedBullets.map((item, index) => (
                  <View key={`${item}-${index}`} style={styles.bulletRow}>
                    <Text style={[styles.bulletDot, { color: palette.kicker }]}>•</Text>
                    <Text
                      style={[
                        styles.text,
                        styles.bulletText,
                        compact && styles.textCompact,
                        { color: palette.text },
                      ]}
                    >
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {resolvedTakeaway ? (
            <View
              style={[
                styles.takeawayBox,
                compact && styles.takeawayBoxCompact,
                {
                  backgroundColor: palette.takeawayBackground,
                  borderColor: palette.takeawayBorder,
                },
              ]}
            >
              <Text style={[styles.takeawayLabel, { color: palette.subtitle }]}>Key takeaway</Text>
              <Text
                style={[
                  styles.text,
                  compact && styles.textCompact,
                  { color: palette.title },
                ]}
              >
                {resolvedTakeaway}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function toTitleCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getTonePalette(tone: ChartInfoTone) {
  switch (tone) {
    case 'info':
      return {
        background: 'rgba(15,23,42,0.82)',
        border: 'rgba(96,165,250,0.30)',
        title: '#dbeafe',
        subtitle: '#93c5fd',
        kicker: '#60a5fa',
        text: '#bfdbfe',
        takeawayBackground: 'rgba(30,41,59,0.85)',
        takeawayBorder: 'rgba(96,165,250,0.28)',
      };
    case 'success':
      return {
        background: 'rgba(6,24,18,0.86)',
        border: 'rgba(52,211,153,0.28)',
        title: '#d1fae5',
        subtitle: '#86efac',
        kicker: '#34d399',
        text: '#bbf7d0',
        takeawayBackground: 'rgba(6,30,23,0.92)',
        takeawayBorder: 'rgba(52,211,153,0.24)',
      };
    case 'warning':
      return {
        background: 'rgba(33,19,7,0.88)',
        border: 'rgba(251,191,36,0.30)',
        title: '#fef3c7',
        subtitle: '#fcd34d',
        kicker: '#f59e0b',
        text: '#fde68a',
        takeawayBackground: 'rgba(55,33,8,0.92)',
        takeawayBorder: 'rgba(251,191,36,0.22)',
      };
    case 'default':
    default:
      return {
        background: 'rgba(15,23,42,0.74)',
        border: 'rgba(168,85,247,0.20)',
        title: chartColors.text,
        subtitle: '#c4b5fd',
        kicker: '#a78bfa',
        text: chartColors.subtext,
        takeawayBackground: 'rgba(30,41,59,0.72)',
        takeawayBorder: 'rgba(168,85,247,0.18)',
      };
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    gap: 8,
  },
  cardCompact: {
    borderRadius: 14,
    padding: 10,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 13,
    fontWeight: '900',
  },
  titleCompact: {
    fontSize: 12,
  },
  toggleButton: {
    minHeight: 32,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '800',
  },
  body: {
    gap: 8,
  },
  sectionBlock: {
    gap: 4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  text: {
    fontSize: 12,
    lineHeight: 18,
  },
  textCompact: {
    fontSize: 11,
    lineHeight: 16,
  },
  bulletList: {
    gap: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bulletDot: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '900',
  },
  bulletText: {
    flex: 1,
  },
  takeawayBox: {
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    gap: 4,
  },
  takeawayBoxCompact: {
    borderRadius: 10,
    padding: 8,
  },
  takeawayLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
});
