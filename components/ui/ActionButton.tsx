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

type ActionTone = {
  backgroundColor: string;
  borderColor: string;
  pressedBackgroundColor: string;
  shadowColor: string;
  shadowOpacity: number;
  titleColor: string;
  subtitleColor: string;
};

function getTone(variant: ActionButtonVariant, theme: ReturnType<typeof useTheme>) {
  switch (variant) {
    case "secondary":
      return {
        backgroundColor: "rgba(96,165,250,0.24)",
        borderColor: "rgba(96,165,250,0.34)",
        pressedBackgroundColor: "rgba(96,165,250,0.3)",
        shadowColor: theme.colors.accent.info,
        shadowOpacity: 0.16,
        titleColor: "#E0F2FE",
        subtitleColor: "rgba(224,242,254,0.82)",
      } satisfies ActionTone;
    case "ghost":
      return {
        backgroundColor: "rgba(255,255,255,0.08)",
        borderColor: "rgba(148,163,184,0.22)",
        pressedBackgroundColor: "rgba(255,255,255,0.12)",
        shadowColor: "transparent",
        shadowOpacity: 0,
        titleColor: "#D7E7FF",
        subtitleColor: "rgba(215,231,255,0.72)",
      } satisfies ActionTone;
    case "danger":
      return {
        backgroundColor: "rgba(239,68,68,0.24)",
        borderColor: "rgba(248,113,113,0.36)",
        pressedBackgroundColor: "rgba(239,68,68,0.32)",
        shadowColor: theme.colors.accent.error,
        shadowOpacity: 0.18,
        titleColor: "#FECACA",
        subtitleColor: "rgba(254,202,202,0.82)",
      } satisfies ActionTone;
    case "primary":
    default:
      return {
        backgroundColor: "rgba(99,102,241,0.34)",
        borderColor: "rgba(129,140,248,0.42)",
        pressedBackgroundColor: "rgba(99,102,241,0.42)",
        shadowColor: theme.colors.accent.primary,
        shadowOpacity: 0.24,
        titleColor: "#F8FBFF",
        subtitleColor: "rgba(232,240,255,0.86)",
      } satisfies ActionTone;
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
            ? tone.pressedBackgroundColor
            : tone.backgroundColor,
          borderColor: tone.borderColor,
          shadowColor: tone.shadowColor,
          shadowOpacity: disabled ? 0 : tone.shadowOpacity,
          shadowRadius: tone.shadowOpacity > 0 ? 16 : 0,
          shadowOffset: { width: 0, height: 10 },
          elevation: disabled ? 0 : tone.shadowOpacity > 0 ? 4 : 0,
          opacity: disabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {icon}
        <View style={styles.copy}>
          <Text style={[styles.title, { color: tone.titleColor }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: tone.subtitleColor }]}>
              {subtitle}
            </Text>
          ) : null}
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
    overflow: "hidden",
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
    backgroundColor: "transparent",
  },
  subtitle: {
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    backgroundColor: "transparent",
  },
});
