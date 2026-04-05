import React, { memo } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';

type Props = {
  children?: React.ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
};

const Stack = memo(function Stack({
  children,
  gap = 8,
  style,
}: Props) {
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={style}>
      {items.map((child, i) => (
        <View
          key={
            React.isValidElement(child) && child.key != null
              ? String(child.key)
              : `stack-item-${i}`
          }
          style={i !== 0 ? { marginTop: gap } : undefined}
        >
          {child}
        </View>
      ))}
    </View>
  );
});

export default Stack;
export { Stack };
