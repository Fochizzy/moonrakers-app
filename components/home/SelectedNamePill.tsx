import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import Text from "@/components/ui/Text";
import { getPlayerAccentColor } from "@/utils/turnTheme";

export function SelectedNamePill({ name, color }: { name: string; color?: string }) {
  const accent = getPlayerAccentColor(color);
  return (
    <View
      style={[
        styles.selectedNamePill,
        { borderColor: `${accent}55`, backgroundColor: `${accent}12` },
      ]}
    >
      <Text style={styles.selectedNamePillText} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

export function AnimatedSelectedNamePill({ name, color }: { name: string; color?: string }) {
  const translateY = useRef(new Animated.Value(18)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 14,
        stiffness: 180,
        mass: 0.7,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 13,
        stiffness: 210,
        mass: 0.75,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      <SelectedNamePill name={name} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  selectedNamePill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  selectedNamePillText: {
    color: "#EAF2FF",
    fontSize: 11,
    fontWeight: "800",
  },
});
