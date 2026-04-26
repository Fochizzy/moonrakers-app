import React from "react";
import { Image, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import Text from "@/components/ui/Text";
import { APP_ICONS, type AppIconKey } from "@/utils/iconAccess";

type HubTileCardProps = {
  description?: string;
  iconKey?: AppIconKey | null;
  layout?: "graphic" | "text";
  title: string;
  onPress: () => void;
  badge?: string;
  style?: StyleProp<ViewStyle>;
  tint?: string;
};

export default function HubTileCard({
  description,
  iconKey,
  layout,
  title,
  onPress,
  badge,
  style,
  tint = "rgba(96,165,250,0.14)",
}: HubTileCardProps) {
  const hasIcon = Boolean(iconKey);
  const resolvedLayout = layout ?? (hasIcon ? "graphic" : "text");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        resolvedLayout === "text" ? styles.cardText : null,
        style,
        pressed && styles.cardPressed,
      ]}
    >
      {iconKey ? (
        <View style={[styles.iconFrame, { backgroundColor: tint }]}>
          <Image source={APP_ICONS[iconKey]} resizeMode="contain" style={styles.icon} />
        </View>
      ) : null}

      <View style={[styles.copy, resolvedLayout === "text" ? styles.copyText : null]}>
        <Text variant="sectionTitle" style={styles.title}>
          {title}
        </Text>
        {description ? (
          <Text
            variant="caption"
            numberOfLines={2}
            style={[styles.description, resolvedLayout === "text" ? styles.descriptionText : null]}
          >
            {description}
          </Text>
        ) : null}
      </View>

      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: "48%",
    minHeight: 196,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(10,18,34,0.9)",
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
  },
  cardText: {
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  iconFrame: {
    width: 82,
    height: 82,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  icon: {
    width: 52,
    height: 52,
  },
  copy: {
    width: "100%",
    gap: 6,
    alignItems: "center",
  },
  copyText: {
    alignItems: "flex-start",
  },
  title: {
    textAlign: "center",
  },
  description: {
    textAlign: "center",
    lineHeight: 18,
  },
  descriptionText: {
    textAlign: "left",
  },
  badge: {
    marginTop: "auto",
    alignSelf: "center",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  badgeText: {
    color: "#D7E7FF",
    fontSize: 11,
    fontWeight: "800",
  },
});
