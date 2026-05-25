import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useStore } from '@/store/useStore';
import StarryNight from '@/components/ui/StarryNight';
import Text from '@/components/ui/Text';
import PlayerCardIcon from '@/components/player/PlayerCardIcon';
import { uiPolish } from '@/utils/uiPolish';

type Player = {
  id: string;
  name?: string;
  initials?: string;
  color?: string;
  assignedCardArtIndex?: number | null;
  artIndex?: number | null;
};

const COLORS = {
  bg: '#060D1A',
  card: 'rgba(10,18,34,0.92)',
  cardAlt: 'rgba(14,24,44,0.95)',
  text: '#EAF2FF',
  sub: '#9FB3D1',
  muted: '#6B7C99',
  blue: '#60A5FA',
  blueSoft: 'rgba(96,165,250,0.16)',
  whiteSoft: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.08)',
};

function getPlayerAccent(color?: string) {
  switch ((color ?? '').toLowerCase()) {
    case 'green':
      return '#84CC16';
    case 'purple':
      return '#C084FC';
    case 'blue':
      return '#60A5FA';
    case 'orange':
      return '#FB923C';
    case 'yellow':
      return '#FACC15';
    case 'red':
      return '#F87171';
    case 'pink':
      return '#F472B6';
    default:
      return COLORS.blue;
  }
}

export default function PlayerIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const rawPlayers = useStore((s: any) => s.players);
  const [playerSearch, setPlayerSearch] = useState("");

  const players = useMemo<Player[]>(
    () =>
      (Array.isArray(rawPlayers) ? rawPlayers : [])
        .filter((p: any) => p?.id)
        .sort((a: any, b: any) =>
          String(a?.name ?? '').localeCompare(String(b?.name ?? ''))
        ),
    [rawPlayers]
  );

  const filteredPlayers = useMemo(() => {
    const normalizedSearch = playerSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return players;
    }

    return players.filter((player) => {
      const name = String(player.name ?? "").toLowerCase();
      const initials = String(player.initials ?? "").toLowerCase();
      return name.includes(normalizedSearch) || initials.includes(normalizedSearch);
    });
  }, [playerSearch, players]);

  return (
    <View style={styles.root}>
      <View style={styles.backgroundLayer}>
        <StarryNight />
        <View style={styles.backgroundDim} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: uiPolish.spacing.xl + insets.top,
            paddingBottom: 28 + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Player Directory</Text>
          <Text style={styles.title}>Select a Player</Text>
          <Text style={styles.subtitle}>
            Tap a player card to open their full profile page.
          </Text>
        </View>

        <TextInput
          value={playerSearch}
          onChangeText={setPlayerSearch}
          placeholder="Search players"
          placeholderTextColor={COLORS.muted}
          style={styles.searchInput}
        />

        <View style={styles.grid}>
          {filteredPlayers.map((player) => {
            const accent = getPlayerAccent(player.color);

            return (
              <Pressable
                key={player.id}
                onPress={() =>
                  router.push({
                    pathname: '/player-profile/[playerId]',
                    params: { playerId: player.id },
                  })
                }
                style={({ pressed }) => [
                  styles.card,
                  {
                    borderColor: `${accent}55`,
                    shadowColor: accent,
                  },
                  pressed && styles.cardPressed,
                ]}
              >
                <View
                  style={[
                    styles.cardGlow,
                    { backgroundColor: `${accent}20` },
                  ]}
                />
                <View
                  style={[
                    styles.cardTopAccent,
                    { backgroundColor: `${accent}D9` },
                  ]}
                />

                <View style={styles.iconWrap}>
                  <PlayerCardIcon
                    player={player}
                    size={88}
                    borderRadius={16}
                    showInitial={false}
                  />
                </View>

                <View style={styles.nameBlock}>
                  <Text style={styles.cardName} numberOfLines={2}>
                    {player.name ?? 'Unknown Player'}
                  </Text>

                  <View
                    style={[
                      styles.cardPill,
                      {
                        borderColor: `${accent}55`,
                        backgroundColor: `${accent}16`,
                      },
                    ]}
                  >
                    <Text style={[styles.cardMeta, { color: accent }]}>
                      Open Profile
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {players.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No players found</Text>
            <Text style={styles.emptyText}>
              Add players or import a backup to populate this page.
            </Text>
          </View>
        ) : filteredPlayers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No matching players</Text>
            <Text style={styles.emptyText}>
              Try a different player name or initials.
            </Text>
          </View>
        ) : null}
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

  backgroundDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,10,22,0.46)',
  },

  content: {
    padding: uiPolish.spacing.xl,
    paddingBottom: 28,
    gap: 14,
  },

  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 5,
  },

  eyebrow: {
    color: COLORS.blue,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  title: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
  },

  subtitle: {
    color: COLORS.sub,
    fontSize: 13,
    lineHeight: 19,
  },

  searchInput: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },

  card: {
    width: '48.2%',
    minHeight: 188,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: COLORS.cardAlt,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    gap: 12,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },

  cardPressed: {
    transform: [{ scale: 0.97 }],
  },

  cardGlow: {
    position: 'absolute',
    top: -24,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 999,
  },

  cardTopAccent: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    height: 3,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
  },

  iconWrap: {
    marginTop: 2,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: COLORS.whiteSoft,
  },

  nameBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },

  cardName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 4,
  },

  cardPill: {
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardMeta: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  emptyCard: {
    marginTop: 8,
    borderRadius: 16,
    padding: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
  },

  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});
