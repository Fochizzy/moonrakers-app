import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import Text from "@/components/ui/Text";
import { useTheme } from "@/theme";

type SegmentedItem<T extends string> = {
  key: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  items: readonly SegmentedItem<T>[];
  onChange: (next: T) => void;
  style?: StyleProp<ViewStyle>;
  value: T;
};

export default function SegmentedControl<T extends string>({
  items,
  onChange,
  style,
  value,
}: SegmentedControlProps<T>) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.shell,
        {
          borderRadius: theme.shape.radius.segmentShell,
          backgroundColor: "rgba(8,12,24,0.72)",
          borderColor: theme.colors.border.subtle,
        },
        style,
      ]}
      accessibilityRole="tablist"
    >
      {items.map((item) => {
        const selected = item.key === value;

        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected }}
            style={[
              styles.segment,
              {
                borderRadius: theme.shape.radius.segment,
              },
              selected
                ? {
                    backgroundColor: theme.colors.interaction.selected,
                    borderColor: theme.colors.border.brand,
                  }
                : {
                    backgroundColor: "transparent",
                    borderColor: "transparent",
                  },
            ]}
          >
            <Text
              variant="utilityLabel"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={{
                color: selected
                  ? theme.colors.text.primary
                  : theme.colors.text.secondary,
                textAlign: "center",
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: "row",
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    minWidth: 0,
    minHeight: 38,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
});
