import React from "react";
import { Image, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import Text from "@/components/ui/Text";
import { APP_ICONS, type AppIconKey } from "@/utils/iconAccess";

type HubTileCardProps = {
  description?: string;
  emphasis?: "default" | "large";
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
  emphasis = "default",
  iconKey,
  layout,
  title,
  onPress,
  badge,
  style,
  tint = "rgba(96,165,250,0.14)",
}: HubTileCardProps) {
  const hasIcon = Boolean(iconKey);
  const isLarge = emphasis === "large";
  const resolvedLayout = layout ?? (hasIcon ? "graphic" : "text");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isLarge ? styles.cardLarge : null,
        resolvedLayout === "text" ? styles.cardText : null,
        style,
        pressed && styles.cardPressed,
      ]}
    >
      {iconKey ? (
        <View
          style={[
            styles.iconFrame,
            isLarge ? styles.iconFrameLarge : null,
            { backgroundColor: tint },
          ]}
        >
          <Image
            source={APP_ICONS[iconKey]}
            resizeMode="contain"
            style={[styles.icon, isLarge ? styles.iconLarge : null]}
          />
        </View>
      ) : null}

      <View
        style={[
          styles.copy,
          isLarge ? styles.copyLarge : null,
          resolvedLayout === "text" ? styles.copyText : null,
        ]}
      >
        <Text variant="sectionTitle" style={[styles.title, isLarge ? styles.titleLarge : null]}>
          {title}
        </Text>
        {description ? (
          <Text
            variant="caption"
            numberOfLines={2}
            style={[
              styles.description,
              isLarge ? styles.descriptionLarge : null,
              resolvedLayout === "text" ? styles.descriptionText : null,
            ]}
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
  cardLarge: {
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingVertical: 20,
    gap: 20,
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
  iconFrameLarge: {
    width: 110,
    height: 110,
    borderRadius: 30,
  },
  icon: {
    width: 52,
    height: 52,
  },
  iconLarge: {
    width: 74,
    height: 74,
  },
  copy: {
    width: "100%",
    gap: 6,
    alignItems: "center",
  },
  copyLarge: {
    gap: 8,
  },
  copyText: {
    alignItems: "flex-start",
  },
  title: {
    textAlign: "center",
  },
  titleLarge: {
    fontSize: 18,
    lineHeight: 22,
  },
  description: {
    textAlign: "center",
    lineHeight: 18,
  },
  descriptionLarge: {
    fontSize: 14,
    lineHeight: 20,
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
