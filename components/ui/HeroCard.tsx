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
}: HeroCardProps) {
  const theme = useTheme();
  const compact = size === "compact";

  const cardContent = (
    <View style={[styles.inner, compact ? styles.innerCompact : null]}>
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
