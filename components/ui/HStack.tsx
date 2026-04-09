import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';

type Justify =
  | 'start'
  | 'center'
  | 'end'
  | 'between'
  | 'around'
  | 'evenly';

type Align =
  | 'start'
  | 'center'
  | 'end'
  | 'stretch'
  | 'baseline';

type Props = {
  children?: React.ReactNode;
  gap?: number;
  justify?: Justify;
  align?: Align;
  style?: StyleProp<ViewStyle>;
  wrap?: boolean;
};

const justifyMap: Record<Justify, ViewStyle['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
};

const alignMap: Record<Align, ViewStyle['alignItems']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
};

export default function HStack({
  children,
  gap = 8,
  justify = 'start',
  align = 'center',
  style,
  wrap = false,
}: Props) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          justifyContent: justifyMap[justify],
          alignItems: alignMap[align],
          flexWrap: wrap ? 'wrap' : 'nowrap',
          gap,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}


