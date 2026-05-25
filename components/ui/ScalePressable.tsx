import React, { useRef } from "react";
import { Animated, Pressable } from "react-native";

type ScalePressableProps = {
  onPress?: () => void;
  onLongPress?: () => void;
  style?: any;
  children: React.ReactNode;
  disabled?: boolean;
};

export default function ScalePressable({
  onPress,
  onLongPress,
  style,
  children,
  disabled,
}: ScalePressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 28,
      bounciness: value === 1 ? 7 : 0,
    }).start();
  };

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => animateTo(0.985)}
        onPressOut={() => animateTo(1)}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
