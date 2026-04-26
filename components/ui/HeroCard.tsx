import React from "react";
import {
  ImageBackground,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/theme";
import Text from "@/components/ui/Text";

type HeroCardProps = {
  actions?: React.ReactNode;
  art?: ImageSourcePropType;
  children?: React.ReactNode;
  eyebrow?: string;
  size?: "default" | "compact";
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
  title: string;
  variant?: "default" | "minimal" | "stat";
};

export default function HeroCard({
  actions,
  art,
  children,
  eyebrow,
  size = "default",
  style,
  subtitle,
  title,
  variant = "default",
}: HeroCardProps) {
  const theme = useTheme();
  const compact = size === "compact" || variant === "minimal" || variant === "stat";
  const minimal = variant === "minimal";
  const stat = variant === "stat";

  const cardContent = (
    <View
      style={[
        styles.inner,
        compact ? styles.innerCompact : null,
        minimal ? styles.innerMinimal : null,
        stat ? styles.innerStat : null,
      ]}
    >
      {eyebrow ? <Text variant="eyebrow">{eyebrow}</Text> : null}
      <Text variant="pageTitle">{title}</Text>
      {subtitle ? <Text variant="heroSubtitle">{subtitle}</Text> : null}
      {children}
      {actions ? <View style={[styles.actions, compact ? styles.actionsCompact : null]}>{actions}</View> : null}
    </View>
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface.hero,
          borderColor: theme.colors.border.strong,
        },
        style,
      ]}
    >
      {art ? (
        <ImageBackground source={art} resizeMode="cover" style={styles.fill}>
          <View
            style={[
              styles.artOverlay,
              {
                backgroundColor: theme.colors.surface.overlay,
              },
            ]}
          />
          {cardContent}
        </ImageBackground>
      ) : (
        cardContent
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
  },
  fill: {
    minHeight: 180,
  },
  artOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  inner: {
    gap: 10,
    padding: 18,
  },
  innerCompact: {
    gap: 8,
    padding: 14,
  },
  innerMinimal: {
    gap: 6,
    paddingVertical: 12,
  },
  innerStat: {
    gap: 8,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 2,
  },
  actionsCompact: {
    gap: 8,
    marginTop: 0,
  },
});
