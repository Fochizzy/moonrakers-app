import React from "react";
import { Image, StyleSheet, View } from "react-native";
import Text from "@/components/ui/Text";

const HEADER_EMBLEM = require("../../assets/Header_2.png");

export default function AppHeader({
  actions,
  eyebrow,
  identity = "dot",
  size = "default",
  subtitle,
  title = "Moonrakers",
  variant,
}: {
  actions?: React.ReactNode;
  eyebrow?: string;
  identity?: "dot" | "emblem";
  size?: "default" | "compact";
  subtitle?: string;
  title?: string;
  variant?: "compact" | "hero";
}) {
  const resolvedVariant =
    variant ?? (size === "compact" ? "compact" : "hero");
  const compact = resolvedVariant === "compact";

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <View style={styles.headerRow}>
        <View style={styles.row}>
          {identity === "emblem" ? (
            <View style={[styles.emblemFrame, compact && styles.emblemFrameCompact]}>
              <Image
                source={HEADER_EMBLEM}
                resizeMode="contain"
                style={[styles.emblem, compact && styles.emblemCompact]}
              />
            </View>
          ) : (
            <View style={[styles.moon, compact && styles.moonCompact]} />
          )}
          <Text style={[styles.text, compact && styles.textCompact]}>{title}</Text>
        </View>

        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>

      {subtitle ? (
        <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 4,
    paddingBottom: 10,
  },
  wrapCompact: {
    paddingBottom: 6,
  },
  eyebrow: {
    marginBottom: 6,
    color: "#D58BFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
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
  moonCompact: {
    width: 10,
    height: 10,
  },
  emblemFrame: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  emblemFrameCompact: {
    width: 40,
    height: 40,
  },
  emblem: {
    width: 38,
    height: 38,
  },
  emblemCompact: {
    width: 34,
    height: 34,
  },
  text: {
    fontSize: 24,
    fontWeight: "900",
    color: "#A855F7",
    letterSpacing: 0.3,
  },
  textCompact: {
    fontSize: 20,
    lineHeight: 24,
  },
  subtitle: {
    marginTop: 6,
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 19,
  },
  subtitleCompact: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },
  actions: {
    alignSelf: "center",
  },
});


