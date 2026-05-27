import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import Text from "@/components/ui/Text";
import { buildDefinitionsRoute } from "@/utils/appRoutes";
import { buttonSystem } from "@/utils/buttonSystem";
import {
  getDefinitionGroup,
  getDefinitionGroupKeyForItem,
  getDefinitionItem,
  getRelatedDefinitionKeys,
} from "@/utils/definitionCatalog";

type DefinitionPreviewModalProps = {
  category?: string | null;
  metric?: string | null;
  onRequestClose: () => void;
  sourceLabel?: string | null;
  visible: boolean;
};

export default function DefinitionPreviewModal({
  category = null,
  metric = null,
  onRequestClose,
  sourceLabel = null,
  visible,
}: DefinitionPreviewModalProps) {
  const router = useRouter();
  const definitionItem = getDefinitionItem(metric);
  const definitionGroup = getDefinitionGroup(
    definitionItem ? getDefinitionGroupKeyForItem(definitionItem.key) : category,
  );
  const relatedTermKeys = definitionItem
    ? getRelatedDefinitionKeys(definitionItem.key)
    : (definitionGroup?.items ?? []).slice(0, 4).map((item) => item.key);

  const title = definitionItem?.title ?? definitionGroup?.title ?? "Definition";
  const body =
    definitionItem?.body ??
    definitionGroup?.subtitle ??
    "Open the full glossary entry to see more context.";

  function openDefinitionRoute(nextMetric?: string | null, nextCategory?: string | null) {
    onRequestClose();
    router.push(
      buildDefinitionsRoute({
        metric: nextMetric ?? metric,
        category: nextCategory ?? category ?? definitionGroup?.key ?? null,
        sourceLabel,
      }),
    );
  }

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onRequestClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} />
        <View style={styles.sheet}>
          {definitionGroup ? (
            <Text style={styles.eyebrow}>{definitionGroup.title}</Text>
          ) : null}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>

          {relatedTermKeys.length > 0 ? (
            <View style={styles.relatedSection}>
              <Text style={styles.relatedLabel}>Related</Text>
              <View style={styles.relatedRail}>
                {relatedTermKeys.map((relatedKey) => {
                  const relatedItem = getDefinitionItem(relatedKey);
                  if (!relatedItem) {
                    return null;
                  }

                  const isCurrentTerm = relatedItem.key === metric;

                  return (
                    <Pressable
                      key={relatedItem.key}
                      disabled={isCurrentTerm}
                      accessibilityState={{
                        disabled: isCurrentTerm,
                        selected: isCurrentTerm,
                      }}
                      style={({ pressed }) => [
                        styles.relatedChip,
                        isCurrentTerm && styles.relatedChipCurrent,
                        pressed && styles.relatedChipPressed,
                      ]}
                      onPress={() => {
                        if (isCurrentTerm) {
                          return;
                        }

                        openDefinitionRoute(
                          relatedItem.key,
                          getDefinitionGroupKeyForItem(relatedItem.key),
                        );
                      }}
                    >
                      <Text
                        style={[
                          styles.relatedChipText,
                          isCurrentTerm && styles.relatedChipTextCurrent,
                        ]}
                      >
                        {relatedItem.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.secondaryAction,
                pressed && styles.actionPressed,
              ]}
              onPress={onRequestClose}
            >
              <Text style={styles.secondaryActionText}>Close</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.primaryAction,
                pressed && styles.actionPressed,
              ]}
              onPress={() => openDefinitionRoute(metric, category)}
            >
              <Text style={styles.primaryActionText}>Open Full Definition</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.72)",
    justifyContent: "flex-end",
    padding: 16,
  },
  sheet: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.18)",
    backgroundColor: "rgba(8, 14, 28, 0.98)",
    padding: 18,
    gap: 12,
  },
  eyebrow: {
    color: "#67E8F9",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    color: "#F8FBFF",
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900",
  },
  body: {
    color: "#C7D6F3",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
  },
  relatedSection: {
    gap: 6,
    marginTop: -2,
  },
  relatedLabel: {
    color: "#9FB6D8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  relatedRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.18)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 8,
  },
  relatedChip: {
    ...buttonSystem.rectBase,
    minHeight: 38,
    flexBasis: "48%",
    flexGrow: 1,
    minWidth: 118,
    borderRadius: 10,
    borderColor: "rgba(96,165,250,0.32)",
    backgroundColor: "rgba(37,99,235,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  relatedChipCurrent: {
    borderColor: "rgba(147,197,253,0.48)",
    backgroundColor: "rgba(37,99,235,0.24)",
  },
  relatedChipPressed: {
    opacity: 0.78,
  },
  relatedChipText: {
    color: "#E8F1FF",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  relatedChipTextCurrent: {
    color: "#F8FBFF",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  primaryAction: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(37,99,235,0.22)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.34)",
    paddingHorizontal: 14,
  },
  primaryActionText: {
    color: "#F8FBFF",
    fontSize: 12,
    fontWeight: "900",
  },
  secondaryAction: {
    minWidth: 88,
    minHeight: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.22)",
    paddingHorizontal: 14,
  },
  secondaryActionText: {
    color: "#D7E7FF",
    fontSize: 12,
    fontWeight: "800",
  },
  actionPressed: {
    opacity: 0.82,
  },
});
