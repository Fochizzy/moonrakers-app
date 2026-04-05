import React, { useMemo } from 'react';
import { View } from 'react-native';

import { useStore } from '@/store/useStore';
import Text from '@/components/ui/Text';
import { buildPlayerInsights } from '@/utils/playerInsights';

type Props = {
  playerId: string;
};

export default function PlayerProfileInsights({ playerId }: Props) {
  const games = useStore((s: any) => s.games);
  const players = useStore((s: any) => s.players);
  const relationships = useStore((s: any) => s.relationships);

  const insights = useMemo(() => {
    return buildPlayerInsights(
      Array.isArray(games) ? games : [],
      playerId,
      Array.isArray(players) ? players : [],
      relationships && typeof relationships === 'object' ? relationships : {}
    );
  }, [games, playerId, players, relationships]);

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 16,
        backgroundColor: '#15171c',
        gap: 10,
      }}
    >
      <Text style={{ fontSize: 22 }}>
        Play Profile Insights
      </Text>

      {insights.map((insight, index) => (
        <View
          key={`${playerId}-${index}`}
          style={{
            padding: 12,
            borderRadius: 12,
            backgroundColor: '#1c1f26',
          }}
        >
          <Text>{insight}</Text>
        </View>
      ))}
    </View>
  );
}
