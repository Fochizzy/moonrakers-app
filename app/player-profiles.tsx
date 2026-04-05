import React from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '@/store/useStore';
import StarryNight from '@/components/ui/StarryNight';

type Player = {
  id: string;
  name: string;
  color?: string;
};

const COLORS = {
  bg: '#040814',
  surface: 'rgba(12, 18, 36, 0.88)',
  surfaceAlt: 'rgba(15, 23, 42, 0.92)',
  border: 'rgba(99, 102, 241, 0.24)',
  borderSoft: 'rgba(148, 163, 184, 0.18)',
  textPrimary: '#F8FBFF',
  textSecondary: '#C7D6F3',
  textMuted: '#8EA6C8',
  brand: '#8B5CF6',
  brandTint: 'rgba(139, 92, 246, 0.16)',
  brandSoft: '#C4B5FD',
  cyan: '#67E8F9',
};

function getPlayerColor(color?: string) {
  switch ((color ?? '').toLowerCase()) {
    case 'green':
      return '#22c55e';
    case 'purple':
      return '#a855f7';
    case 'blue':
      return '#3b82f6';
    case 'orange':
      return '#f97316';
    case 'yellow':
      return '#eab308';
    case 'red':
      return '#ef4444';
    case 'pink':
      return '#ec4899';
    default:
      return '#94a3b8';
  }
}

function getInitials(name?: string) {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

export default function PlayerProfilesScreen() {
  const router = useRouter();

  const players = useStore((s: any) =>
    Array.isArray(s.players) ? s.players : []
  ) as Player[];

  return (
    <View style={styles.root}>
      <View style={styles.backgroundLayer}>
        <StarryNight />
        <View style={styles.nebulaPurple} />
        <View style={styles.nebulaBlue} />
        <View style={styles.backgroundDim} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Player Directory</Text>
          <Text style={styles.title}>Player Profiles</Text>
          <Text style={styles.subtitle}>
            Open a pilot profile to review prestige totals, assist distribution,
            relationship patterns, and deeper performance insights.
          </Text>
        </View>

        {players.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No players yet</Text>
            <Text style={styles.emptyText}>
              Add players first to unlock profiles and insights.
            </Text>
          </View>
        ) : (
          players.map((player, index) => {
            const playerColor = getPlayerColor(player.color);

            return (
              <Pressable
                key={player.id}
                style={({ pressed }) => [
                  styles.card,
                  {
                    borderColor: playerColor,
                    opacity: pressed ? 0.94 : 1,
                    transform: [{ scale: pressed ? 0.995 : 1 }],
                  },
                ]}
                onPress={() => router.push(`/player/${encodeURIComponent(player.id)}`)}
              >
                <View
                  style={[
                    styles.cardAccent,
                    { backgroundColor: playerColor },
                  ]}
                />
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: playerColor },
                  ]}
                >
                  <Text style={styles.avatarText}>{getInitials(player.name)}</Text>
                </View>

                <View style={styles.cardTextWrap}>
                  <Text style={styles.cardTitle}>{player.name}</Text>
                  <Text style={styles.cardSubtitle}>
                    View prestige, assist networks, profile insights
                  </Text>
                </View>

                <View style={styles.trailingWrap}>
                  <Text style={[styles.rankPill, { color: playerColor, borderColor: playerColor }]}>
                    #{index + 1}
                  </Text>
                  <Text style={[styles.chevron, { color: playerColor }]}>›</Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },

  nebulaPurple: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 999,
    top: 40,
    right: -70,
    backgroundColor: 'rgba(139, 92, 246, 0.16)',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.34,
    shadowRadius: 56,
    shadowOffset: { width: 0, height: 0 },
  },

  nebulaBlue: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    bottom: 80,
    left: -50,
    backgroundColor: 'rgba(96, 165, 250, 0.12)',
    shadowColor: '#60A5FA',
    shadowOpacity: 0.28,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 0 },
  },

  backgroundDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,6,18,0.34)',
  },

  container: {
    padding: 14,
    paddingBottom: 28,
    minHeight: '100%',
    gap: 10,
  },

  heroCard: {
    backgroundColor: 'rgba(11, 18, 35, 0.82)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.28)',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },

  eyebrow: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },

  title: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
  },

  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },

  emptyCard: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },

  emptyText: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },

  card: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    gap: 12,
  },

  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  cardTextWrap: {
    flex: 1,
  },

  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },

  cardSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },

  trailingWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },

  rankPill: {
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },

  chevron: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 24,
  },
});
