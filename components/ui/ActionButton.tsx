import React from "react";
import {
  GestureResponderEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import Text from "@/components/ui/Text";
import { useTheme } from "@/theme";

type ActionButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ActionButtonProps = {
  disabled?: boolean;
  icon?: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
  title: string;
  variant?: ActionButtonVariant;
};

function getTone(variant: ActionButtonVariant, theme: ReturnType<typeof useTheme>) {
  switch (variant) {
    case "secondary":
      return {
        backgroundColor: "rgba(103,232,249,0.12)",
        borderColor: theme.colors.border.emphasis,
      };
    case "ghost":
      return {
        backgroundColor: "rgba(255,255,255,0.03)",
        borderColor: theme.colors.border.subtle,
      };
    case "danger":
      return {
        backgroundColor: "rgba(248,113,113,0.12)",
        borderColor: "rgba(248,113,113,0.28)",
      };
    case "primary":
    default:
      return {
        backgroundColor: "rgba(168,85,247,0.16)",
        borderColor: theme.colors.border.brand,
      };
  }
}

export default function ActionButton({
  disabled = false,
  icon,
  onPress,
  style,
  subtitle,
  title,
  variant = "primary",
}: ActionButtonProps) {
  const theme = useTheme();
  const tone = getTone(variant, theme);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          borderRadius: theme.shape.radius.button,
          backgroundColor: pressed && !disabled
            ? theme.colors.interaction.selected
            : tone.backgroundColor,
          borderColor: tone.borderColor,
          opacity: disabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {icon}
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 46,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  copy: {
    flexShrink: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    color: "rgba(232, 240, 255, 0.82)",
  },
});
