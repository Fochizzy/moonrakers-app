import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Text from '@/components/ui/Text';
import StarryNight from '@/components/ui/StarryNight';
import { useThemeContext } from '@/theme';

const FAVORITES_STORAGE_KEY = 'moonrakers_chart_favorites';

type ChartIcon =
  | 'compare'
  | 'elo'
  | 'sparkline'
  | 'line'
  | 'multiLine'
  | 'prestige'
  | 'heatmap'
  | 'replay'
  | 'bar'
  | 'stackedBar'
  | 'radar'
  | 'scatter'
  | 'headToHead'
  | 'rivalry'
  | 'relationship'
  | 'assistNetwork';

type ChartLink = {
  key: string;
  title: string;
  subtitle: string;
  icon: ChartIcon;
  metric?: string;
};

type ChartSection = {
  title: string;
  subtitle: string;
  charts: ChartLink[];
};

const CHART_SECTIONS: ChartSection[] = [
  {
    title: 'Compare Players',
    subtitle: 'Find who has the edge across one or many metrics.',
    charts: [
      {
        key: 'compare-screen',
        title: 'Compare',
        subtitle: 'Side-by-side',
        icon: 'compare',
      },
      {
        key: 'head-to-head-chart',
        title: 'Head-to-Head',
        subtitle: 'Direct matchup',
        icon: 'headToHead',
      },
      {
        key: 'bar-chart',
        title: 'Bar Chart',
        subtitle: 'Single metric',
        icon: 'bar',
        metric: 'totalPrestige',
      },
      {
        key: 'radar-chart',
        title: 'Radar Chart',
        subtitle: 'Player profile',
        icon: 'radar',
      },
      {
        key: 'multi-line-chart',
        title: 'Multi-Line Chart',
        subtitle: 'Trend compare',
        icon: 'multiLine',
        metric: 'totalPrestige',
      },
    ],
  },
  {
    title: 'Track Trends',
    subtitle: 'See how ratings, prestige, and form change over time.',
    charts: [
      {
        key: 'elo-chart',
        title: 'ELO Chart',
        subtitle: 'Rating history',
        icon: 'elo',
      },
      {
        key: 'line-chart',
        title: 'Line Chart',
        subtitle: 'Metric trend',
        icon: 'line',
        metric: 'totalPrestige',
      },
      {
        key: 'sparkline',
        title: 'Sparkline',
        subtitle: 'Quick trend',
        icon: 'sparkline',
      },
      {
        key: 'prestige-over-time',
        title: 'Prestige Over Time',
        subtitle: 'Prestige pace',
        icon: 'prestige',
      },
    ],
  },
  {
    title: 'Understand Match Flow',
    subtitle: 'Follow how rounds and games develop from start to finish.',
    charts: [
      {
        key: 'replay-chart',
        title: 'Replay Chart',
        subtitle: 'Match timeline',
        icon: 'replay',
      },
      {
        key: 'heatmap',
        title: 'Heatmap',
        subtitle: 'Round intensity',
        icon: 'heatmap',
        metric: 'totalPrestige',
      },
    ],
  },
  {
    title: 'Teamwork & Relationships',
    subtitle: 'Explore support, shared games, and opponent patterns.',
    charts: [
      {
        key: 'assist-network-overview',
        title: 'Assist Network',
        subtitle: 'Assist flow',
        icon: 'assistNetwork',
      },
      {
        key: 'relationship-graph',
        title: 'Relationship Graph',
        subtitle: 'Player links',
        icon: 'relationship',
      },
      {
        key: 'rivalry-graph',
        title: 'Rivalry Graph',
        subtitle: 'Opponent record',
        icon: 'rivalry',
      },
    ],
  },
  {
    title: 'Contribution Breakdown',
    subtitle: 'Break down where player value comes from.',
    charts: [
      {
        key: 'stacked-bar-chart',
        title: 'Stacked Bar Chart',
        subtitle: 'Contribution mix',
        icon: 'stackedBar',
      },
      {
        key: 'efficiency-failure-scatter',
        title: 'Efficiency / Failure Scatter',
        subtitle: 'Risk vs payoff',
        icon: 'scatter',
      },
    ],
  },
];

function buildHref(chart: ChartLink) {
  const params = new URLSearchParams();
  if (chart.metric) params.set('metric', chart.metric);
  return `/charts/${chart.key}${params.toString() ? `?${params.toString()}` : ''}`;
}

function getChartIconSymbol(icon: ChartIcon) {
  switch (icon) {
    case 'compare':
      return '👥';
    case 'elo':
      return '📈';
    case 'sparkline':
      return '〰️';
    case 'line':
      return '📉';
    case 'multiLine':
      return '📊';
    case 'prestige':
      return '🏆';
    case 'heatmap':
      return '🔥';
    case 'replay':
      return '⏱️';
    case 'bar':
      return '📊';
    case 'stackedBar':
      return '🧱';
    case 'radar':
      return '🎯';
    case 'scatter':
      return '✳️';
    case 'headToHead':
      return '⚔️';
    case 'rivalry':
      return '🥊';
    case 'relationship':
      return '🕸️';
    case 'assistNetwork':
      return '🤝';
    default:
      return '📌';
  }
}

export default function ChartsDirectoryScreen() {
  const { theme } = useThemeContext();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [favoriteKeys, setFavoriteKeys] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadFavorites() {
      try {
        const raw = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
        if (!isMounted || !raw) return;

        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setFavoriteKeys(parsed.filter((value) => typeof value === 'string'));
        }
      } catch (error) {
        console.warn('Failed to load chart favorites', error);
      }
    }

    loadFavorites();

    return () => {
      isMounted = false;
    };
  }, []);

  const allCharts = useMemo(
    () => CHART_SECTIONS.flatMap((section) => section.charts),
    []
  );

  const favoriteCharts = useMemo(() => {
    const map = new Map(allCharts.map((chart) => [chart.key, chart]));
    return favoriteKeys
      .map((key) => map.get(key))
      .filter((chart): chart is ChartLink => Boolean(chart));
  }, [allCharts, favoriteKeys]);

  async function persistFavorites(nextKeys: string[]) {
    setFavoriteKeys(nextKeys);
    try {
      await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextKeys));
    } catch (error) {
      console.warn('Failed to save chart favorites', error);
    }
  }

  async function toggleFavorite(chartKey: string) {
    const isFavorite = favoriteKeys.includes(chartKey);

    if (isFavorite) {
      await persistFavorites(favoriteKeys.filter((key) => key !== chartKey));
      return;
    }

    await persistFavorites([chartKey, ...favoriteKeys]);
  }

  return (
    <View style={styles.screen}>
      <StarryNight />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Moonrakers</Text>
          <Text style={styles.title}>Chart Directory</Text>
          <Text style={styles.subtitle}>
            Browse charts by what you want to learn, then star the ones you use most.
          </Text>

          <View style={styles.heroActions}>
            <Pressable style={styles.primaryButton} onPress={() => router.push('/')}>
              <Text style={styles.primaryButtonText}>Back Home</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push('/charts/compare-screen')}
            >
              <Text style={styles.secondaryButtonText}>Open Compare</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.favoritesCard}>
          <View style={styles.favoritesHeader}>
            <Text style={styles.favoritesTitle}>Favorites</Text>
            <Text style={styles.favoritesSubtitle}>
              Star a chart to pin it here for quick access.
            </Text>
          </View>

          <View style={styles.favoriteChips}>
            {favoriteCharts.length > 0 ? (
              favoriteCharts.map((chart) => (
                <Pressable
                  key={chart.key}
                  style={({ pressed }) => [
                    styles.favoriteChip,
                    pressed && styles.favoriteChipPressed,
                  ]}
                  onPress={() => router.push(buildHref(chart) as any)}
                >
                  <View style={styles.favoriteChipIcon}>
                    <Text style={styles.iconText}>{getChartIconSymbol(chart.icon)}</Text>
                  </View>
                  <Text style={styles.favoriteChipText}>{chart.title}</Text>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyFavorites}>
                <Text style={styles.emptyFavoritesStar}>☆</Text>
                <Text style={styles.emptyFavoritesText}>No favorites yet.</Text>
              </View>
            )}
          </View>
        </View>

        {CHART_SECTIONS.map((section) => (
          <View key={section.title} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
            </View>

            <View style={styles.grid}>
              {section.charts.map((chart) => {
                const isFavorite = favoriteKeys.includes(chart.key);

                return (
                  <Pressable
                    key={chart.key}
                    style={({ pressed }) => [
                      styles.chartCard,
                      pressed && styles.chartCardPressed,
                    ]}
                    onPress={() => router.push(buildHref(chart) as any)}
                  >
                    <View style={styles.chartTopRow}>
                      <View style={styles.chartHeader}>
                        <View style={styles.iconBadge}>
                          <Text style={styles.iconText}>{getChartIconSymbol(chart.icon)}</Text>
                        </View>
                        <Text style={styles.chartTitle}>{chart.title}</Text>
                      </View>

                      <Pressable
                        hitSlop={10}
                        style={({ pressed }) => [
                          styles.starButton,
                          pressed && styles.starButtonPressed,
                        ]}
                        onPress={(event) => {
                          event.stopPropagation?.();
                          toggleFavorite(chart.key);
                        }}
                      >
                        <Text
                          style={[
                            styles.starText,
                            isFavorite && styles.starTextActive,
                          ]}
                        >
                          {isFavorite ? '★' : '☆'}
                        </Text>
                      </Pressable>
                    </View>

                    <Text style={styles.chartSubtitle}>{chart.subtitle}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useThemeContext>['theme']) {
  const c = theme.colors;
  const s = theme.spacing;
  const t = theme.text;

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background.primary,
    },
    content: {
      padding: s.md,
      paddingBottom: s.xl * 2,
      gap: s.md,
    },
    heroCard: {
      borderRadius: 24,
      padding: s.lg,
      backgroundColor: c.surface.card,
      borderWidth: 1,
      borderColor: c.border.subtle,
      gap: s.sm,
    },
    eyebrow: {
      ...(t.caption ?? {}),
      color: c.accent.primary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    title: {
      ...(t.title ?? {}),
      color: c.text.primary,
    },
    subtitle: {
      ...(t.body ?? {}),
      color: c.text.secondary,
    },
    heroActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: s.sm,
      marginTop: s.sm,
    },
    primaryButton: {
      borderRadius: 999,
      paddingHorizontal: s.lg,
      paddingVertical: s.sm,
      backgroundColor: c.accent.primary,
      borderWidth: 1,
      borderColor: c.accent.primary,
    },
    primaryButtonText: {
      ...(t.caption ?? {}),
      color: c.text.primary,
      fontWeight: '700',
    },
    secondaryButton: {
      borderRadius: 999,
      paddingHorizontal: s.lg,
      paddingVertical: s.sm,
      backgroundColor: c.background.secondary,
      borderWidth: 1,
      borderColor: c.border.subtle,
    },
    secondaryButtonText: {
      ...(t.caption ?? {}),
      color: c.text.secondary,
      fontWeight: '700',
    },
    favoritesCard: {
      borderRadius: 24,
      padding: s.md,
      backgroundColor: c.surface.card,
      borderWidth: 1,
      borderColor: c.border.subtle,
      gap: s.sm,
    },
    favoritesHeader: {
      gap: 4,
    },
    favoritesTitle: {
      ...(t.subtitle ?? {}),
      color: c.text.primary,
      fontWeight: '800',
    },
    favoritesSubtitle: {
      ...(t.caption ?? {}),
      color: c.text.secondary,
    },
    favoriteChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: s.sm,
    },
    favoriteChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: c.background.secondary,
      borderWidth: 1,
      borderColor: c.border.subtle,
    },
    favoriteChipPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
    favoriteChipIcon: {
      width: 24,
      height: 24,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface.card,
      borderWidth: 1,
      borderColor: c.border.subtle,
    },
    favoriteChipText: {
      ...(t.caption ?? {}),
      color: c.text.primary,
      fontWeight: '700',
    },
    emptyFavorites: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 16,
      paddingVertical: 6,
    },
    emptyFavoritesStar: {
      fontSize: 16,
      color: c.text.secondary,
    },
    emptyFavoritesText: {
      ...(t.caption ?? {}),
      color: c.text.secondary,
    },
    sectionCard: {
      borderRadius: 24,
      padding: s.md,
      backgroundColor: c.surface.card,
      borderWidth: 1,
      borderColor: c.border.subtle,
      gap: s.md,
    },
    sectionHeader: {
      gap: 4,
    },
    sectionTitle: {
      ...(t.subtitle ?? {}),
      color: c.text.primary,
      fontWeight: '800',
    },
    sectionSubtitle: {
      ...(t.caption ?? {}),
      color: c.text.secondary,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: s.sm,
    },
    chartCard: {
      width: '48%',
      borderRadius: 18,
      padding: s.md,
      backgroundColor: c.background.secondary,
      borderWidth: 1,
      borderColor: c.border.subtle,
      gap: s.xs,
      minHeight: 110,
    },
    chartCardPressed: {
      transform: [{ scale: 0.985 }],
      opacity: 0.94,
    },
    chartTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: s.sm,
    },
    chartHeader: {
      flex: 1,
      gap: 6,
    },
    iconBadge: {
      width: 34,
      height: 34,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface.card,
      borderWidth: 1,
      borderColor: c.border.subtle,
      marginBottom: 2,
    },
    iconText: {
      fontSize: 16,
    },
    starButton: {
      width: 32,
      height: 32,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface.card,
      borderWidth: 1,
      borderColor: c.border.subtle,
    },
    starButtonPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.96 }],
    },
    starText: {
      fontSize: 18,
      color: c.text.secondary,
    },
    starTextActive: {
      color: c.accent.primary,
    },
    chartTitle: {
      ...(t.body ?? {}),
      color: c.text.primary,
      fontWeight: '800',
    },
    chartSubtitle: {
      ...(t.caption ?? {}),
      color: c.text.secondary,
      fontWeight: '700',
    },
  });
}
