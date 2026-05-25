import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

export function SelectionShimmer({
  visible,
  borderRadius = 16,
}: {
  visible: boolean;
  borderRadius?: number;
}) {
  const translate = useRef(new Animated.Value(-220)).current;

  useEffect(() => {
    if (!visible) {
      translate.setValue(-220);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(translate, {
        toValue: 220,
        duration: 1400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );

    loop.start();
    return () => loop.stop();
  }, [translate, visible]);

  if (!visible) return null;

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, styles.shimmerWrap, { borderRadius }]}
    >
      <View style={[styles.shimmerGlow, { borderRadius }]} />
      <Animated.View
        style={[
          styles.shimmerSweep,
          { transform: [{ translateX: translate }, { rotate: "18deg" }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shimmerWrap: {
    overflow: "hidden",
  },
  shimmerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  shimmerSweep: {
    position: "absolute",
    top: -30,
    bottom: -30,
    width: 72,
    backgroundColor: "rgba(255,255,255,0.1)",
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
});
