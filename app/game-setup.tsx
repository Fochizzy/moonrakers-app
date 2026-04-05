import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';

import { useStore } from '@/store/useStore';
import StarryNight from '@/components/ui/StarryNight';
import PlayerInitialBadge from '@/components/player/PlayerInitialBadge';
import { getPlayerAccentColor } from '@/utils/turnTheme';

type Player = {
  id: string;
  name: string;
  initials?: string;
  color?: string;
};

type OrderedPlayer = Player & {
  startOrder: number;
};

function parseJsonArray<T>(value?: string | string[]): T[] {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export default function GameSetupScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    playerIds?: string | string[];
    groupId?: string | string[];
    groupName?: string | string[];
  }>();

  const players = useStore((s: any) => s.players ?? []);
  const groups = useStore((s: any) => s.groups ?? []);
  const startActiveGame = useStore((s: any) => s.startActiveGame);
  const selectGroup = useStore((s: any) => s.selectGroup);

  const groupId =
    Array.isArray(params.groupId) ? params.groupId[0] : params.groupId;

  const passedGroupName = Array.isArray(params.groupName)
    ? params.groupName[0]
    : params.groupName;

  const selectedPlayerIds = useMemo(
    () => parseJsonArray<string>(params.playerIds).filter(Boolean),
    [params.playerIds]
  );

  const selectedGroup = useMemo(() => {
    if (!groupId) return null;
    return groups.find((group: any) => group.id === groupId) ?? null;
  }, [groupId, groups]);

  const resolvedGroupName =
    passedGroupName ?? selectedGroup?.name ?? undefined;

  const baseOrderedPlayers = useMemo<OrderedPlayer[]>(() => {
    const playerMap = new Map(players.map((p: Player) => [p.id, p]));

    const sourceIds =
      selectedPlayerIds.length > 0
        ? selectedPlayerIds
        : selectedGroup?.playerIds ?? [];

    return sourceIds
      .map((id, index) => {
        const player = playerMap.get(id);
        if (!player) return null;

        return { ...player, startOrder: index };
      })
      .filter((p): p is OrderedPlayer => Boolean(p));
  }, [players, selectedPlayerIds, selectedGroup?.playerIds]);

  const [orderedPlayers, setOrderedPlayers] =
    useState<OrderedPlayer[]>(baseOrderedPlayers);

  useEffect(() => {
    setOrderedPlayers(baseOrderedPlayers);
  }, [baseOrderedPlayers]);

  const lockedOrder = useMemo(
    () =>
      orderedPlayers.map((p, i) => ({
        ...p,
        startOrder: i,
      })),
    [orderedPlayers]
  );

  const orderPreview = useMemo(
    () => lockedOrder.map((p) => p.name).join(' → '),
    [lockedOrder]
  );

  const firstPlayerName = lockedOrder[0]?.name || '—';

  const handleStartGame = () => {
    if (lockedOrder.length < 2) {
      Alert.alert(
        'Not enough players',
        'Go back and select at least 2 players or a group first.'
      );
      return;
    }

    if (groupId && typeof selectGroup === 'function') {
      selectGroup(groupId);
    }

    if (typeof startActiveGame === 'function') {
      startActiveGame({
        players: lockedOrder,
        groupId,
        groupName: resolvedGroupName,
      });
    }

    router.replace('/game');
  };

  const renderItem = ({
    item,
    drag,
    getIndex,
  }: RenderItemParams<OrderedPlayer>) => {
    const index = getIndex?.() ?? 0;
    const accent = getPlayerAccentColor(item.color) || '#60a5fa';

    return (
      <ScaleDecorator>
        <Pressable
          onLongPress={drag}
          delayLongPress={100}
          style={styles.playerRow}
        >
          <View style={styles.playerRail} />

          <View style={styles.playerInner}>
            <View style={styles.playerLeft}>
              <View style={styles.orderBadge}>
                <Text style={styles.orderBadgeText}>{index + 1}</Text>
              </View>

              <PlayerInitialBadge
                initials={item.initials}
                color={item.color}
                size={26}
                fontSize={10}
              />

              <View style={styles.playerTextWrap}>
                <Text numberOfLines={1} style={styles.playerName}>
                  {item.name}
                </Text>
                <Text numberOfLines={1} style={styles.playerMeta}>
                  {item.color ? `${item.color.toUpperCase()} • ` : ''}Hold to drag
                </Text>
              </View>
            </View>

            <Text style={[styles.playerDot, { color: accent }]}>≡</Text>
          </View>
        </Pressable>
      </ScaleDecorator>
    );
  };

  const canStart = lockedOrder.length >= 2;

  return (
    <View style={styles.screen}>
      <StarryNight />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </Pressable>

            <View style={styles.countChip}>
              <Text style={styles.countChipText}>
                {lockedOrder.length} {lockedOrder.length === 1 ? 'Player' : 'Players'}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>Mission Setup</Text>

          <View style={styles.inlineMetaRow}>
            <Text numberOfLines={1} style={styles.inlineMetaText}>
              <Text style={styles.inlineMetaLabel}>Group:</Text>{' '}
              {resolvedGroupName || 'Custom'}
            </Text>
            <Text numberOfLines={1} style={styles.inlineMetaText}>
              <Text style={styles.inlineMetaLabel}>First:</Text> {firstPlayerName}
            </Text>
          </View>

          {!!orderPreview && (
            <Text numberOfLines={2} style={styles.previewText}>
              <Text style={styles.inlineMetaLabel}>Order:</Text> {orderPreview}
            </Text>
          )}
        </View>

        <View style={styles.listCard}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.sectionTitle}>Turn Order</Text>
            <Text style={styles.sectionHint}>Long press + drag</Text>
          </View>

          <DraggableFlatList
            data={lockedOrder}
            keyExtractor={(item) => item.id}
            onDragEnd={({ data }) => setOrderedPlayers(data)}
            renderItem={renderItem}
            scrollEnabled={false}
            containerStyle={styles.listContent}
          />
        </View>

        <View style={styles.footerRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.footerButton, styles.footerButtonSecondary]}
          >
            <Text style={styles.footerSecondaryText}>Back</Text>
          </Pressable>

          <Pressable
            onPress={handleStartGame}
            disabled={!canStart}
            style={[
              styles.footerButton,
              styles.footerButtonPrimary,
              !canStart && styles.footerButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.footerPrimaryText,
                !canStart && styles.footerPrimaryTextDisabled,
              ]}
            >
              Start Game
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#040814',
  },

  container: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 8,
  },

  headerCard: {
    backgroundColor: '#0b1220',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 6,
  },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backButtonText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '800',
  },

  countChip: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },

  countChipText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '800',
  },

  title: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },

  inlineMetaRow: {
    flexDirection: 'row',
    gap: 10,
  },

  inlineMetaText: {
    flex: 1,
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },

  inlineMetaLabel: {
    color: '#94a3b8',
    fontWeight: '800',
  },

  previewText: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },

  listCard: {
    backgroundColor: '#0b1220',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 8,
  },

  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
  },

  sectionHint: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },

  listContent: {
    gap: 6,
  },

  playerRow: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#0f172a',
    overflow: 'hidden',
  },

  playerRail: {
    width: 2,
    backgroundColor: '#1e293b',
  },

  playerInner: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },

  playerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  orderBadge: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },

  orderBadgeText: {
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: '900',
  },

  playerTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 0,
  },

  playerName: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
  },

  playerMeta: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
  },

  playerDot: {
    width: 18,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '900',
  },

  footerRow: {
    flexDirection: 'row',
    gap: 8,
  },

  footerButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footerButtonSecondary: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },

  footerButtonPrimary: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },

  footerButtonDisabled: {
    backgroundColor: '#334155',
    borderColor: '#334155',
  },

  footerSecondaryText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '800',
  },

  footerPrimaryText: {
    color: '#6d28d9',
    fontSize: 13,
    fontWeight: '900',
  },

  footerPrimaryTextDisabled: {
    color: '#cbd5e1',
  },
});
