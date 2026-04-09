import React from "react";
import { View, StyleSheet } from "react-native";
import Text from "@/components/ui/Text";

export default function AppHeader({
  subtitle,
}: {
  subtitle?: string;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.moon} />
        <Text style={styles.text}>Moonrakers</Text>
      </View>

      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 4,
    paddingBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  moon: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#60A5FA",
    shadowColor: "#60A5FA",
    shadowOpacity: 0.95,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  text: {
    fontSize: 24,
    fontWeight: "900",
    color: "#A855F7",
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 6,
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 19,
  },
});


