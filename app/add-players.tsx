import React, { useMemo, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useStore } from '@/store/useStore';
import StarryNight from '@/components/ui/StarryNight';
import Text from '@/components/ui/Text';
import {
  getPlayerAccentColor,
  getPlayerTintColor,
} from '@/utils/turnTheme';

const COLORS = ['Green', 'Purple', 'Blue', 'Orange', 'Yellow'];

export default function AddPlayersScreen() {
  const router = useRouter();

  const players = useStore((s: any) =>
    Array.isArray(s.players) ? s.players : []
  );
  const addPlayer = useStore((s: any) => s.addPlayer);

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>('Green');

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a: any, b: any) =>
      String(a?.name ?? '').localeCompare(String(b?.name ?? ''))
    );
  }, [players]);

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    addPlayer({
      id: Date.now().toString(),
      name: trimmed,
      color,
    });

    setName('');
  };

  const accent = getPlayerAccentColor(color);
  const tint = getPlayerTintColor(color);

  return (
    <View style={styles.screen}>
      <StarryNight />
      <View style={styles.overlay} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>

          <View style={styles.titleBlock}>
            <Text style={styles.title}>Add Players</Text>
            <Text style={styles.subtitle}>{sortedPlayers.length} total</Text>
          </View>

          <Pressable style={styles.doneButtonTop} onPress={() => router.back()}>
            <Text style={styles.doneButtonTopText}>Done</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionTopRow}>
            <Text style={styles.sectionTitle}>New Player</Text>
            <View
              style={[
                styles.liveChip,
                { borderColor: `${accent}66`, backgroundColor: tint },
              ]}
            >
              <View style={[styles.liveDot, { backgroundColor: accent }]} />
              <Text style={[styles.liveChipText, { color: accent }]}>
                {color}
              </Text>
            </View>
          </View>

          <TextInput
            placeholder="Player name"
            placeholderTextColor="#7C8AA0"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <Text style={styles.label}>Color</Text>

          <View style={styles.colorGrid}>
            {COLORS.map((c) => {
              const isSelected = color === c;
              const cAccent = getPlayerAccentColor(c);
              const cTint = getPlayerTintColor(c);

              return (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[
                    styles.colorItem,
                    {
                      backgroundColor: cTint,
                      borderColor: isSelected
                        ? cAccent
                        : 'rgba(148,163,184,0.16)',
                    },
                  ]}
                >
                  <View
                    style={[styles.colorSwatch, { backgroundColor: cAccent }]}
                  />
                  <Text
                    style={[
                      styles.colorItemText,
                      { color: isSelected ? '#F8FAFC' : '#CBD5E1' },
                    ]}
                  >
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={[
                styles.addButton,
                {
                  backgroundColor: tint,
                  borderColor: `${accent}88`,
                  opacity: name.trim() ? 1 : 0.6,
                },
              ]}
              onPress={handleAdd}
            >
              <Text style={[styles.addButtonText, { color: accent }]}>
                Add Player
              </Text>
            </Pressable>

            <Pressable style={styles.doneButtonInline} onPress={() => router.back()}>
              <Text style={styles.doneButtonInlineText}>Close</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionTopRow}>
            <Text style={styles.sectionTitle}>Players</Text>
            <Text style={styles.sectionMeta}>{sortedPlayers.length}</Text>
          </View>

          <View style={styles.playerGrid}>
            {sortedPlayers.map((p: any) => {
              const c = getPlayerAccentColor(p.color);
              const t = getPlayerTintColor(p.color);

              return (
                <View
                  key={p.id}
                  style={[
                    styles.playerChip,
                    {
                      borderColor: `${c}66`,
                      backgroundColor: t,
                    },
                  ]}
                >
                  <View style={[styles.playerDot, { backgroundColor: c }]} />
                  <Text style={styles.playerChipName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={[styles.playerChipMeta, { color: c }]}>
                    {p.color}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050914',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },

  container: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 18,
    gap: 10,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  backButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(37,99,235,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.30)',
  },

  backButtonText: {
    color: '#BFDBFE',
    fontSize: 12,
    fontWeight: '800',
  },

  titleBlock: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
  },

  subtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },

  doneButtonTop: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
  },

  doneButtonTopText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '800',
  },

  card: {
    backgroundColor: 'rgba(18,28,48,0.82)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(120,140,180,0.14)',
    gap: 8,
  },

  sectionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '900',
  },

  sectionMeta: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
  },

  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },

  liveChipText: {
    fontSize: 11,
    fontWeight: '800',
  },

  input: {
    backgroundColor: 'rgba(15,23,42,0.94)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFF',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    fontSize: 13,
  },

  label: {
    color: '#CBD5E1',
    fontWeight: '800',
    fontSize: 12,
  },

  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  colorItem: {
    width: '31%',
    minWidth: 92,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  colorSwatch: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },

  colorItemText: {
    fontSize: 12,
    fontWeight: '800',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },

  addButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },

  addButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },

  doneButtonInline: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
  },

  doneButtonInlineText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '800',
  },

  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  playerChip: {
    width: '48%',
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  playerDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },

  playerChipName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  playerChipMeta: {
    fontSize: 10,
    fontWeight: '800',
  },
});
