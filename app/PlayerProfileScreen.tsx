import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';

export default function PlayerProfileScreen() {
  const [tab, setTab] = useState<'overview' | 'advanced' | 'matchups' | 'history'>('overview');

  return (
    <View style={styles.screen}>
      <Text style={{ color: 'red', fontSize: 20, fontWeight: '900' }}>
        CORRECT FILE LOADED
      </Text>

      {/* HEADER */}
      <Text style={styles.title}>Player Profile</Text>

      {/* TABS */}
      <View style={styles.tabRow}>
        {['overview', 'advanced', 'matchups', 'history'].map((t) => (
          <Pressable key={t} onPress={() => setTab(t as any)} style={styles.tab}>
            <Text style={{ color: tab === t ? '#fff' : '#888' }}>{t.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {tab === 'overview' && (
          <View style={styles.grid}>
            <Stat label="ELO" value="0" />
            <Stat label="Wins" value="0" />
            <Stat label="Games" value="8" />
            <Stat label="Prestige" value="11" />
            <Stat label="Win Rate" value="0%" />
            <Stat label="Avg Prestige" value="1.4" />
          </View>
        )}

        {tab === 'advanced' && (
          <View style={styles.grid}>
            <Stat label="Avg Placement" value="—" />
            <Stat label="Top 2 Rate" value="0%" />
            <Stat label="Consistency" value="0.00" />
            <Stat label="Clutch Factor" value="0%" />
            <Stat label="Recent Form" value="0.0" />
            <Stat label="Trend" value="Slipping" />
          </View>
        )}

        {tab === 'matchups' && (
          <View style={styles.grid}>
            <Stat label="Greg" value="+0.00" />
            <Stat label="Izzy" value="+0.00" />
          </View>
        )}

        {tab === 'history' && (
          <View style={styles.grid}>
            {[...Array(10)].map((_, i) => (
              <Stat key={i} label={`Game ${i + 1}`} value="—" />
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: any) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#020617',
    padding: 12,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
  },
  tab: {
    flex: 1,
    padding: 10,
    backgroundColor: '#111827',
    borderRadius: 8,
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    width: '48%',
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 10,
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
  },
  value: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});


