import React from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';

import { useStore } from '../store/useStore';
import StarryNight from '../components/ui/StarryNight';
import Text from '../components/ui/Text';

type Player = {
  id: string;
  name: string;
  color?: string;
};

const EMPTY_PLAYERS: Player[] = [];

function getInitials(name: string): string {
  if (!name?.trim()) return '';

  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function PlayersScreen() {
  const router = useRouter();

  const rawPlayers = useStore((s: any) => s.players);
  const deletePlayer = useStore((s: any) => s.deletePlayer);

  const players = Array.isArray(rawPlayers)
    ? (rawPlayers as Player[])
    : EMPTY_PLAYERS;

  const handleDelete = (player: Player) => {
    if (typeof deletePlayer !== 'function') {
      Alert.alert('Error', 'deletePlayer is not available.');
      return;
    }

    Alert.alert('Delete player', `Remove ${player.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deletePlayer(player.id),
      },
    ]);
  };

  const renderPlayer = ({ item }: { item: Player }) => {
    const badgeColor = item.color || '#3B82F6';

    return (
      <BlurView
        intensity={30}
        tint="dark"
        {...(Platform.OS === 'android'
          ? { experimentalBlurMethod: 'dimezisBlurView' as const }
          : {})}
        style={styles.playerCardWrapper}
      >
        <View style={styles.cardOverlay} />

        <View style={styles.playerCard}>
          <View style={styles.playerInfo}>
            <View
              style={[
                styles.badge,
                { backgroundColor: badgeColor },
              ]}
            >
              <Text style={styles.badgeText}>
                {getInitials(item.name)}
              </Text>
            </View>

            <Text style={styles.playerName} numberOfLines={1}>
              {item.name}
            </Text>
          </View>

          <Pressable
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </Pressable>
        </View>
      </BlurView>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.backgroundLayer}>
        <StarryNight />
        <BlurView
          intensity={40}
          tint="dark"
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.backgroundOverlay} />
      </View>

      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.title}>Players</Text>
          <Text style={styles.subtitle}>
            Manage your Moonrakers roster.
          </Text>

          <Pressable
            style={styles.addButton}
            onPress={() => router.push('/add-player')}
          >
            <Text style={styles.addButtonText}>➕ Add Player</Text>
          </Pressable>

          {players.length === 0 ? (
            <BlurView
              intensity={25}
              tint="dark"
              {...(Platform.OS === 'android'
                ? { experimentalBlurMethod: 'dimezisBlurView' as const }
                : {})}
              style={styles.emptyCardWrapper}
            >
              <View style={styles.cardOverlay} />
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No players yet</Text>
                <Text style={styles.emptyText}>
                  Add your first player to get started.
                </Text>
              </View>
            </BlurView>
          ) : (
            <FlatList
              data={players}
              keyExtractor={(item) => item.id}
              renderItem={renderPlayer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B1020',
  },

  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },

  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },

  safe: {
    flex: 1,
    zIndex: 1,
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 15,
    color: '#AAB4C3',
    marginBottom: 20,
  },

  addButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 18,
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  listContent: {
    paddingBottom: 32,
  },

  playerCardWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: 'rgba(10, 15, 30, 0.22)',
  },

  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 10, 20, 0.18)',
  },

  playerCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  playerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },

  badge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  playerName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  deleteButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.28)',
  },

  deleteButtonText: {
    color: '#FCA5A5',
    fontSize: 14,
    fontWeight: '700',
  },

  emptyCardWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(10, 15, 30, 0.22)',
  },

  emptyCard: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },

  emptyText: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 20,
  },
});
