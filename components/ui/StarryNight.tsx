import React, { memo } from "react";
import { StyleSheet, View } from "react-native";

type StarryNightProps = {
  children?: React.ReactNode;
};

function StarryNightBase({ children }: StarryNightProps) {
  return (
    <View pointerEvents="none" style={styles.container}>
      <View style={styles.background} />
      {children}
    </View>
  );
}

const StarryNight = memo(StarryNightBase);

export default StarryNight;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0B1020",
  },
});
