import React from "react";
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import {
  SafeAreaView,
  type Edge,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import ScreenBackground, {
  type ScreenBackgroundPreset,
} from "@/components/ui/ScreenBackground";

type PageShellProps = {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  density?: "default" | "compact";
  edges?: Edge[];
  preset?: ScreenBackgroundPreset;
  scroll?: boolean;
  showsVerticalScrollIndicator?: boolean;
  style?: StyleProp<ViewStyle>;
  viewport?: "scroll" | "fit";
};

function readNumericPadding(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function resolvePaddingValue(
  style: ViewStyle | undefined,
  edge: "top" | "right" | "bottom" | "left",
  fallback: number,
) {
  const padding = readNumericPadding(style?.padding);
  const paddingHorizontal = readNumericPadding(style?.paddingHorizontal);
  const paddingVertical = readNumericPadding(style?.paddingVertical);
  const paddingTop = readNumericPadding(style?.paddingTop);
  const paddingRight = readNumericPadding(style?.paddingRight);
  const paddingBottom = readNumericPadding(style?.paddingBottom);
  const paddingLeft = readNumericPadding(style?.paddingLeft);

  switch (edge) {
    case "top":
      return paddingTop ?? paddingVertical ?? padding ?? fallback;
    case "right":
      return paddingRight ?? paddingHorizontal ?? padding ?? fallback;
    case "bottom":
      return paddingBottom ?? paddingVertical ?? padding ?? fallback;
    case "left":
      return paddingLeft ?? paddingHorizontal ?? padding ?? fallback;
    default:
      return fallback;
  }
}

export default function PageShell({
  children,
  contentContainerStyle,
  density = "default",
  edges = ["left", "right"],
  preset = "quiet",
  scroll = true,
  showsVerticalScrollIndicator = false,
  style,
  viewport,
}: PageShellProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const compact = density === "compact";
  const resolvedViewport = viewport ?? (scroll ? "scroll" : "fit");
  const shouldScroll = resolvedViewport === "scroll";
  const flattenedContentStyle =
    StyleSheet.flatten(contentContainerStyle) ?? undefined;
  const resolvedPaddingTop = resolvePaddingValue(
    flattenedContentStyle,
    "top",
    compact ? theme.spacing.lg : theme.spacing.xl,
  );
  const resolvedPaddingRight = resolvePaddingValue(
    flattenedContentStyle,
    "right",
    theme.spacing.lg,
  );
  const resolvedPaddingBottom = resolvePaddingValue(
    flattenedContentStyle,
    "bottom",
    compact ? theme.spacing.xl : theme.spacing["2xl"],
  );
  const resolvedPaddingLeft = resolvePaddingValue(
    flattenedContentStyle,
    "left",
    theme.spacing.lg,
  );

  const content = (
    <View
      style={[
        styles.shellContentInset,
        styles.content,
        compact ? styles.contentCompact : null,
        contentContainerStyle,
        {
          paddingTop: resolvedPaddingTop + insets.top,
          paddingRight: resolvedPaddingRight,
          paddingBottom: resolvedPaddingBottom + insets.bottom,
          paddingLeft: resolvedPaddingLeft,
        },
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: theme.colors.background.primary,
        },
        style,
      ]}
      edges={edges}
    >
      <ScreenBackground preset={preset} />
      <View pointerEvents="none" style={styles.shellBackdrop}>
        <View style={styles.shellTopGlow} />
        <View style={styles.shellMidGlow} />
      </View>

      {shouldScroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollGrow}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  shellBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  shellTopGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: "rgba(96,165,250,0.05)",
  },
  shellMidGlow: {
    position: "absolute",
    top: 120,
    left: 30,
    right: 30,
    height: 240,
    borderRadius: 999,
    backgroundColor: "rgba(168,85,247,0.04)",
  },
  scrollGrow: {
    flexGrow: 1,
  },
  shellContentInset: {
    minHeight: "100%",
  },
  content: {
    gap: 14,
  },
  contentCompact: {
    gap: 12,
  },
});
