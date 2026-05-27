import React, { useMemo, useState } from "react";
import {
  StyleProp,
  StyleSheet,
  TextStyle,
} from "react-native";
import { usePathname, useRouter } from "expo-router";

import DefinitionPreviewModal from "@/components/ui/DefinitionPreviewModal";
import DefinitionTermText from "@/components/ui/DefinitionTermText";
import Text from "@/components/ui/Text";
import {
  findDefinitionTextSegments,
} from "@/utils/definitionCatalog";
import {
  buildDefinitionsRoute,
  resolveDefinitionSourceLabel,
} from "@/utils/appRoutes";

type DefinitionRichTextProps = Omit<React.ComponentProps<typeof Text>, "children"> & {
  text: string;
  style?: StyleProp<TextStyle>;
};

export default function DefinitionRichText({
  style,
  text,
  variant = "body",
  ...textProps
}: DefinitionRichTextProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [previewTarget, setPreviewTarget] = useState<{
    metric?: string | null;
    category?: string | null;
  } | null>(null);
  const sourceLabel = resolveDefinitionSourceLabel(pathname);
  const segments = useMemo(() => findDefinitionTextSegments(text), [text]);

  if (segments.length === 1) {
    const [segment] = segments;

    if (segment.type === "term") {
      return (
        <DefinitionTermText
          {...textProps}
          category={segment.category ?? null}
          containerStyle={styles.fullTermContainer}
          label={segment.text}
          metric={segment.metric ?? null}
          style={[style, styles.linkText]}
          variant={variant}
        />
      );
    }

    return (
      <Text {...textProps} variant={variant} style={style}>
        {segment.text}
      </Text>
    );
  }

  return (
    <>
      <Text {...textProps} variant={variant} style={style}>
        {segments.map((segment, index) => {
          if (segment.type === "text") {
            return <React.Fragment key={`text-${index}`}>{segment.text}</React.Fragment>;
          }

          return (
            <Text
              key={`term-${segment.metric ?? segment.category ?? index}-${index}`}
              variant={variant}
              onLongPress={() =>
                setPreviewTarget({
                  metric: segment.metric ?? null,
                  category: segment.category ?? null,
                })
              }
              onPress={() =>
                router.push(
                  buildDefinitionsRoute({
                    metric: segment.metric ?? null,
                    category: segment.category ?? null,
                    sourceLabel,
                  }),
                )
              }
              style={[style, styles.linkText]}
            >
              {segment.text}
            </Text>
          );
        })}
      </Text>

      <DefinitionPreviewModal
        visible={Boolean(previewTarget)}
        metric={previewTarget?.metric ?? null}
        category={previewTarget?.category ?? null}
        sourceLabel={sourceLabel}
        onRequestClose={() => setPreviewTarget(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fullTermContainer: {
    alignSelf: "stretch",
    maxWidth: "100%",
    minWidth: 0,
  },
  linkText: {
    color: "#7DD3FC",
    textDecorationLine: "underline",
    textDecorationColor: "rgba(125, 211, 252, 0.72)",
  },
});
