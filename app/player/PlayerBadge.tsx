import React from 'react';
import { View, Text } from 'react-native';

import { getPlayerBaseColor } from '@/utils/colors';

type Props = {
  name: string;
  color?: string;
  size?: number;
  totalPrestige?: number;
};

function getInitials(name: string) {
  if (!name) return '?';

  return name
    .trim()
    .split(/\s+/)
    .map((n) => n?.[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function PlayerBadge({
  name,
  color,
  size = 40,
  totalPrestige,
}: Props) {
  const baseColor = getPlayerBaseColor(color);

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: baseColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontWeight: 'bold',
            fontSize: size * 0.4,
          }}
        >
          {getInitials(name)}
        </Text>
      </View>

      {typeof totalPrestige === 'number' && (
        <Text
          style={{
            marginTop: 4,
            color: '#CBD5E1',
            fontWeight: '700',
            fontSize: 10,
          }}
        >
          {totalPrestige} TP
        </Text>
      )}
    </View>
  );
}
