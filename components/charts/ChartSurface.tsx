import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import Text from "@/components/ui/Text";
import { chartSurfaceTokens } from "@/utils/chartSurfaceTokens";

type Props = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  style?: ViewStyle;
  children: React.ReactNode;
};

export default function ChartSurface({
  eyebrow,
  title,
  subtitle,
  style,
  children,
}: Props) {
  return (
    <View style={[styles.card, style]}>
      {eyebrow || title || subtitle ? (
        <View style={styles.header}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: chartSurfaceTokens.shellRadius,
    padding: chartSurfaceTokens.shellPadding,
    backgroundColor: chartSurfaceTokens.shellBackground,
    borderWidth: 1,
    borderColor: chartSurfaceTokens.shellBorder,
    gap: 12,
  },
  header: {
    gap: 3,
  },
  eyebrow: {
    color: chartSurfaceTokens.eyebrow,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    color: chartSurfaceTokens.title,
    fontSize: 15,
    fontWeight: "800",
  },
  subtitle: {
    color: chartSurfaceTokens.subtitle,
    fontSize: 12,
    lineHeight: 18,
  },
});
