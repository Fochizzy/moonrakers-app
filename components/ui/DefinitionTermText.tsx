import React, { useState } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from "react-native";
import { usePathname, useRouter } from "expo-router";

import DefinitionPreviewModal from "@/components/ui/DefinitionPreviewModal";
import Text from "@/components/ui/Text";
import {
  buildDefinitionsRoute,
  resolveDefinitionSourceLabel,
} from "@/utils/appRoutes";
import { resolveDefinitionTarget } from "@/utils/definitionTargets";

type DefinitionTermTextProps = Omit<
  React.ComponentProps<typeof Text>,
  "children"
> & {
  category?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
  label: string;
  metric?: string | null;
  style?: StyleProp<TextStyle>;
};

export default function DefinitionTermText({
  category = null,
  containerStyle,
  label,
  metric = null,
  style,
  ...textProps
}: DefinitionTermTextProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [previewOpen, setPreviewOpen] = useState(false);
  const definitionTarget = resolveDefinitionTarget({
    category,
    metric,
    label,
  });
  const sourceLabel = resolveDefinitionSourceLabel(pathname);

  if (!definitionTarget) {
    return (
      <Text {...textProps} style={style}>
        {label}
      </Text>
    );
  }

  return (
    <>
      <Pressable
        hitSlop={4}
        onLongPress={() => setPreviewOpen(true)}
        onPress={() =>
          router.push(
            buildDefinitionsRoute({
              ...definitionTarget,
              sourceLabel: sourceLabel,
            }),
          )
        }
        style={({ pressed }) => [
          styles.link,
          pressed && styles.linkPressed,
          containerStyle,
        ]}
      >
        <Text {...textProps} style={[style, styles.linkText]}>
          {label}
        </Text>
      </Pressable>
      <DefinitionPreviewModal
        visible={previewOpen}
        metric={definitionTarget.metric ?? null}
        category={definitionTarget.category ?? null}
        sourceLabel={sourceLabel}
        onRequestClose={() => setPreviewOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  link: {
    alignSelf: "flex-start",
    flexShrink: 1,
    maxWidth: "100%",
    minWidth: 0,
  },
  linkPressed: {
    opacity: 0.72,
  },
  linkText: {
    textDecorationLine: "underline",
    textDecorationColor: "rgba(103, 232, 249, 0.72)",
  },
});
