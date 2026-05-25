import React from "react";
import { Image, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import Text from "@/components/ui/Text";
import { APP_ICONS, type AppIconKey } from "@/utils/iconAccess";

type HubTileCardProps = {
  description?: string;
  emphasis?: "default" | "large";
  iconKey?: AppIconKey | null;
  layout?: "graphic" | "text" | "graphic-horizontal";
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
        resolvedLayout === "graphic-horizontal" ? styles.cardHorizontalGraphic : null,
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
            resolvedLayout === "graphic-horizontal"
              ? styles.iconFrameHorizontalGraphic
              : null,
            resolvedLayout === "graphic-horizontal" && isLarge
              ? styles.iconFrameHorizontalGraphicLarge
              : null,
            { backgroundColor: tint },
          ]}
        >
          <Image
            source={APP_ICONS[iconKey]}
            resizeMode="contain"
            style={[
              styles.icon,
              isLarge ? styles.iconLarge : null,
              resolvedLayout === "graphic-horizontal"
                ? styles.iconHorizontalGraphic
                : null,
              resolvedLayout === "graphic-horizontal" && isLarge
                ? styles.iconHorizontalGraphicLarge
                : null,
            ]}
          />
        </View>
      ) : null}

      <View
        style={[
          styles.content,
          resolvedLayout === "graphic-horizontal" ? styles.contentHorizontalGraphic : null,
          resolvedLayout === "graphic-horizontal" && isLarge
            ? styles.contentHorizontalGraphicLarge
            : null,
        ]}
      >
        <View
          style={[
            styles.copy,
            isLarge ? styles.copyLarge : null,
            resolvedLayout === "text" ? styles.copyText : null,
            resolvedLayout === "graphic-horizontal" ? styles.copyHorizontalGraphic : null,
            resolvedLayout === "graphic-horizontal" && isLarge
              ? styles.copyHorizontalGraphicLarge
              : null,
          ]}
        >
          <Text
            variant="sectionTitle"
            style={[
              styles.title,
              isLarge ? styles.titleLarge : null,
              resolvedLayout === "graphic-horizontal" ? styles.titleHorizontalGraphic : null,
              resolvedLayout === "graphic-horizontal" && isLarge
                ? styles.titleHorizontalGraphicLarge
                : null,
            ]}
          >
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
                resolvedLayout === "graphic-horizontal"
                  ? styles.descriptionHorizontalGraphic
                  : null,
                resolvedLayout === "graphic-horizontal" && isLarge
                  ? styles.descriptionHorizontalGraphicLarge
                  : null,
              ]}
            >
              {description}
            </Text>
          ) : null}
        </View>

        {badge ? (
          <View
            style={[
              styles.badge,
              resolvedLayout === "graphic-horizontal" ? styles.badgeHorizontalGraphic : null,
            ]}
          >
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
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
    gap: 18,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
  },
  cardText: {
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardHorizontalGraphic: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
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
  iconFrameHorizontalGraphic: {
    width: 74,
    height: 74,
    borderRadius: 22,
  },
  iconFrameHorizontalGraphicLarge: {
    width: 92,
    height: 92,
    borderRadius: 26,
  },
  icon: {
    width: 52,
    height: 52,
  },
  iconLarge: {
    width: 78,
    height: 78,
  },
  iconHorizontalGraphic: {
    width: 48,
    height: 48,
  },
  iconHorizontalGraphicLarge: {
    width: 68,
    height: 68,
  },
  content: {
    width: "100%",
    gap: 12,
    alignItems: "center",
  },
  contentHorizontalGraphic: {
    flex: 1,
    width: "auto",
    alignItems: "center",
    justifyContent: "center",
  },
  contentHorizontalGraphicLarge: {
    alignItems: "flex-start",
  },
  copy: {
    width: "100%",
    gap: 6,
    alignItems: "center",
  },
  copyLarge: {
    gap: 10,
  },
  copyText: {
    alignItems: "flex-start",
  },
  copyHorizontalGraphic: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  copyHorizontalGraphicLarge: {
    alignItems: "flex-start",
  },
  title: {
    textAlign: "center",
  },
  titleHorizontalGraphic: {
    textAlign: "center",
  },
  titleLarge: {
    fontSize: 20,
    lineHeight: 24,
  },
  titleHorizontalGraphicLarge: {
    textAlign: "left",
  },
  description: {
    textAlign: "center",
    lineHeight: 18,
  },
  descriptionHorizontalGraphic: {
    textAlign: "center",
  },
  descriptionLarge: {
    fontSize: 15,
    lineHeight: 21,
  },
  descriptionHorizontalGraphicLarge: {
    textAlign: "left",
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
  badgeHorizontalGraphic: {
    marginTop: 0,
    alignSelf: "flex-start",
  },
  badgeText: {
    color: "#D7E7FF",
    fontSize: 11,
    fontWeight: "800",
  },
});
