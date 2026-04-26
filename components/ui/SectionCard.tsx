import React from "react";
import {
  Image,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/theme";
import Text from "@/components/ui/Text";

type SectionCardProps = {
  actions?: React.ReactNode;
  children?: React.ReactNode;
  eyebrow?: string;
  icon?: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
  title?: string;
};

export default function SectionCard({
  actions,
  children,
  eyebrow,
  icon,
  style,
  subtitle,
  title,
}: SectionCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface.glass,
          borderColor: theme.colors.border.subtle,
        },
        style,
      ]}
    >
      {title || subtitle || actions || eyebrow || icon ? (
        <View style={styles.header}>
          <View style={styles.copyWrap}>
            <View style={styles.headerRow}>
              {icon ? (
                <View
                  style={[
                    styles.iconFrame,
                    {
                      backgroundColor: theme.colors.surface.tile,
                      borderColor: theme.colors.border.tile,
                    },
                  ]}
                >
                  <Image source={icon} resizeMode="contain" style={styles.icon} />
                </View>
              ) : null}

              <View style={styles.copy}>
                {eyebrow ? <Text variant="eyebrow">{eyebrow}</Text> : null}
                {title ? <Text variant="sectionTitle">{title}</Text> : null}
                {subtitle ? <Text variant="caption">{subtitle}</Text> : null}
              </View>
            </View>
          </View>
          {actions}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  copyWrap: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconFrame: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 24,
    height: 24,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
});
