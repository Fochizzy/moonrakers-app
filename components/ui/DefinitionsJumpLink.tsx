import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from "react-native";
import { usePathname, useRouter } from "expo-router";

import Text from "@/components/ui/Text";
import {
  buildDefinitionsRoute,
  resolveDefinitionSourceLabel,
} from "@/utils/appRoutes";
import { resolveDefinitionTarget } from "@/utils/definitionTargets";

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
  const pathname = usePathname();
  const definitionTarget = resolveDefinitionTarget({
    category,
    metric,
  });
  const sourceLabel = resolveDefinitionSourceLabel(pathname);

  if (!definitionTarget) {
    return null;
  }

  return (
    <Pressable
      onPress={() =>
        router.push(
          buildDefinitionsRoute({
            ...definitionTarget,
            sourceLabel: sourceLabel,
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
