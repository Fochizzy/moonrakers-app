import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from "react-native";
import { useRouter } from "expo-router";

import Text from "@/components/ui/Text";
import { buildDefinitionsRoute } from "@/utils/appRoutes";

type DefinitionsJumpLinkProps = {
  category?: string | null;
  label?: string;
  metric?: string | null;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export default function DefinitionsJumpLink({
  category = null,
  label = "What is this?",
  metric = null,
  style,
  textStyle,
}: DefinitionsJumpLinkProps) {
  const router = useRouter();
  const normalizedMetric = String(metric ?? "").trim();
  const normalizedCategory = String(category ?? "").trim();

  if (!normalizedMetric && !normalizedCategory) {
    return null;
  }

  return (
    <Pressable
      onPress={() =>
        router.push(
          buildDefinitionsRoute({
            metric: normalizedMetric || null,
            category: normalizedCategory || null,
          }),
        )
      }
      style={({ pressed }) => [
        styles.link,
        pressed && styles.linkPressed,
        style,
      ]}
    >
      <Text style={[styles.linkText, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  linkPressed: {
    opacity: 0.72,
  },
  linkText: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
