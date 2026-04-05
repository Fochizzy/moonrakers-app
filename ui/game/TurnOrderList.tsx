import React, { memo, useCallback } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
} from 'react-native';

import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';

import Text from '@/components/ui/Text';
import HStack from '@/components/ui/HStack';
import { useTheme } from '@/theme/useTheme';

type Player = {
  id: string;
  name: string;
  color: string;
};

type Props = {
  data: Player[];
  setData: (data: Player[]) => void;
};

const TurnOrderItem = memo(
  ({
    item,
    drag,
    isActive,
  }: RenderItemParams<Player>) => {
    const t = useTheme();

    return (
      <ScaleDecorator>
        <Pressable
          onLongPress={drag}
          delayLongPress={150}
          style={({ pressed }) => [
            styles.pressable,
            pressed && !isActive && { opacity: 0.96 },
          ]}
          android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
        >
          <HStack
            style={[
              styles.item,
              {
                backgroundColor: isActive
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(255,255,255,0.045)',
                borderColor: isActive
                  ? 'rgba(255,255,255,0.16)'
                  : 'rgba(255,255,255,0.10)',
                paddingVertical: t.spacing.md,
                paddingHorizontal: t.spacing.md,
              },
            ]}
            justify="space-between"
            align="center"
          >
            <HStack gap={10} align="center" style={styles.leftBlock}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: item.color },
                ]}
              />

              <Text
                numberOfLines={1}
                style={{
                  color: '#FFFFFF',
                  fontSize: t.fonts.size.md,
                  fontWeight: '700',
                  flexShrink: 1,
                }}
              >
                {item.name}
              </Text>
            </HStack>

            <Text
              style={{
                color: 'rgba(255,255,255,0.55)',
                fontSize: 18,
                fontWeight: '700',
              }}
            >
              ≡
            </Text>
          </HStack>
        </Pressable>
      </ScaleDecorator>
    );
  }
);

TurnOrderItem.displayName = 'TurnOrderItem';

function TurnOrderList({ data, setData }: Props) {
  const keyExtractor = useCallback(
    (item: Player) => item.id,
    []
  );

  const handleDragEnd = useCallback(
    ({ data }: { data: Player[] }) => {
      setData(data);
    },
    [setData]
  );

  const renderItem = useCallback(
    (params: RenderItemParams<Player>) => (
      <TurnOrderItem {...params} />
    ),
    []
  );

  return (
    <DraggableFlatList
      data={data ?? []}
      keyExtractor={keyExtractor}
      onDragEnd={handleDragEnd}
      renderItem={renderItem}
      activationDistance={10}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
    />
  );
}

export default memo(TurnOrderList);

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 8,
  },
  pressable: {
    marginBottom: 10,
  },
  item: {
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 60,
  },
  leftBlock: {
    flex: 1,
    minWidth: 0,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
});
