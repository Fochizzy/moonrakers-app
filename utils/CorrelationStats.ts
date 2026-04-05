import React, { useMemo } from 'react';
import { View } from 'react-native';

import { useStore } from '@/store/useStore';
import { Text } from '@/components/ui/primitives/Text';
import {
  buildCorrelationResults,
  getTopSynergyPairs,
} from '@/utils/advancedStats';

function formatCorrelation(value: number) {
  return value.toFixed(2);
}

export default function CorrelationStats() {
  const games = useStore((s) => s.games);
  const players = useStore((s) => s.players);
  const relationships = useStore((s) => s.relationships);

  const correlations = useMemo(() => {
    return buildCorrelationResults(games, relationships);
  }, [games, relationships]);

  const synergyPairs = useMemo(() => {
    return getTopSynergyPairs(relationships, 5);
  }, [relationships]);

  const playerNameMap = useMemo(() => {
    return new Map(players.map((player) => [player.id, player.name]));
  }, [players]);

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 16,
        backgroundColor: '#15171c',
        gap: 16,
      }}
    >
      <Text style={{ fontSize: 22 }}>
        Correlations
      </Text>

      {correlations.map((item) => (
        <View
          key={item.label}
          style={{
            padding: 12,
            borderRadius: 12,
            backgroundColor: '#1c1f26',
          }}
        >
          <Text style={{ fontSize: 16, marginBottom: 4 }}>
            {item.label}
          </Text>
          <Text style={{ opacity: 0.8 }}>
            r = {formatCorrelation(item.value)} · {item.strength}
          </Text>
        </View>
      ))}

      <View
        style={{
          height: 1,
          backgroundColor: 'rgba(255,255,255,0.08)',
        }}
      />

      <Text style={{ fontSize: 22 }}>
        Top Synergy Pairs
      </Text>

      {synergyPairs.length === 0 ? (
        <Text style={{ opacity: 0.7 }}>
          No synergy data yet.
        </Text>
      ) : (
        synergyPairs.map((pair) => (
          <View
            key={`${pair.a}-${pair.b}`}
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: '#1c1f26',
            }}
          >
            <Text>
              {(playerNameMap.get(pair.a) ?? pair.a)} +{' '}
              {(playerNameMap.get(pair.b) ?? pair.b)}
            </Text>
            <Text style={{ opacity: 0.8 }}>
              Synergy Score: {pair.score}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}
