import React from "react";
import {
  ImageBackground,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/theme";
import DefinitionRichText from "@/components/ui/DefinitionRichText";

type HeroCardProps = {
  actions?: React.ReactNode;
  art?: ImageSourcePropType;
  children?: React.ReactNode;
  eyebrow?: string;
  headerAction?: React.ReactNode;
  size?: "default" | "compact";
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
  subtitleNumberOfLines?: number;
  subtitleStyle?: StyleProp<TextStyle>;
  title: string;
  variant?: "default" | "minimal" | "stat";
};

export default function HeroCard({
  actions,
  art,
  children,
  eyebrow,
  headerAction,
  size = "default",
  style,
  subtitle,
  subtitleNumberOfLines,
  subtitleStyle,
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
      {headerAction ? (
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            {eyebrow ? (
              <DefinitionRichText text={eyebrow} variant="eyebrow" />
            ) : null}
            <DefinitionRichText text={title} variant="pageTitle" />
          </View>
          <View style={styles.headerAction}>{headerAction}</View>
        </View>
      ) : (
        <>
          {eyebrow ? <DefinitionRichText text={eyebrow} variant="eyebrow" /> : null}
          <DefinitionRichText text={title} variant="pageTitle" />
        </>
      )}
      {subtitle ? (
        <DefinitionRichText
          text={subtitle}
          variant="heroSubtitle"
          numberOfLines={subtitleNumberOfLines}
          style={subtitleStyle}
        />
      ) : null}
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
    ...StyleSheet.absoluteFill,
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
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerAction: {
    flexShrink: 0,
    alignSelf: "flex-start",
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
