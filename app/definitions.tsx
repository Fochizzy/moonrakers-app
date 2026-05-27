import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import PageShell from "@/components/ui/PageShell";
import DefinitionRichText from "@/components/ui/DefinitionRichText";
import SectionCard from "@/components/ui/SectionCard";
import Text from "@/components/ui/Text";
import { buttonSystem } from "@/utils/buttonSystem";
import { APP_ROUTES, buildDefinitionsRoute } from "@/utils/appRoutes";
import {
  DEFINITION_GROUPS,
  getDefinitionItem,
  getRelatedDefinitionKeys,
} from "@/utils/definitionCatalog";

export default function DefinitionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    metric?: string;
    category?: string;
    sourceLabel?: string;
  }>();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [layoutVersion, setLayoutVersion] = useState(0);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const groupOffsets = useRef<Record<string, number>>({});
  const listOffsets = useRef<Record<string, number>>({});
  const itemOffsets = useRef<Record<string, number>>({});
  const lastAutoScrollTarget = useRef<string>("");
  const targetMetric = String(params?.metric ?? "").trim();
  const targetCategory = String(params?.category ?? "").trim();
  const sourceLabel = String(params?.sourceLabel ?? "").trim();
  const targetMetricGroupKey = useMemo(() => {
    if (!targetMetric) {
      return null;
    }

    return (
      DEFINITION_GROUPS.find((group) =>
        group.items.some((item) => item.key === targetMetric)
      )?.key ?? null
    );
  }, [targetMetric]);
  const targetGroupKey = targetMetricGroupKey ?? (
    DEFINITION_GROUPS.some((group) => group.key === targetCategory)
      ? targetCategory
      : null
  );
  const targetScrollKey = targetMetric
    ? `metric:${targetMetric}`
    : targetGroupKey
      ? `category:${targetGroupKey}`
      : "";

  function updateTrackedOffset(
    registry: React.MutableRefObject<Record<string, number>>,
    key: string,
    y: number,
  ) {
    if (registry.current[key] === y) {
      return;
    }

    registry.current[key] = y;
    setLayoutVersion((version) => version + 1);
  }

  useEffect(() => {
    if (targetMetric) {
      const matchingGroup = DEFINITION_GROUPS.find((group) =>
        group.items.some((item) => item.key === targetMetric)
      );

      if (matchingGroup) {
        setActiveCategory(matchingGroup.key);
      }

      return;
    }

    if (!targetMetric && targetCategory) {
      const hasMatchingCategory = DEFINITION_GROUPS.some(
        (group) => group.key === targetCategory
      );

      if (hasMatchingCategory) {
        setActiveCategory(targetCategory);
      }
    }
  }, [targetCategory, targetMetric]);

  useEffect(() => {
    if (targetMetric || targetGroupKey) {
      setQuery("");
    }
  }, [targetGroupKey, targetMetric]);

  useEffect(() => {
    if (!targetScrollKey) {
      lastAutoScrollTarget.current = "";
      return;
    }

    if (lastAutoScrollTarget.current === targetScrollKey) {
      return;
    }

    let targetY: number | undefined;

    if (targetMetric && targetMetricGroupKey) {
      const groupY = groupOffsets.current[targetMetricGroupKey];
      const listY = listOffsets.current[targetMetricGroupKey];
      const itemY = itemOffsets.current[targetMetric];

      if (
        typeof groupY === "number" &&
        typeof listY === "number" &&
        typeof itemY === "number"
      ) {
        targetY = groupY + listY + itemY;
      }
    } else if (targetGroupKey) {
      const groupY = groupOffsets.current[targetGroupKey];

      if (typeof groupY === "number") {
        targetY = groupY;
      }
    }

    if (typeof targetY !== "number") {
      return;
    }

    lastAutoScrollTarget.current = targetScrollKey;
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, targetY - 84),
        animated: true,
      });
    });
  }, [layoutVersion, targetGroupKey, targetMetric, targetMetricGroupKey, targetScrollKey]);

  const visibleGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return DEFINITION_GROUPS.filter((group) => {
      if (activeCategory !== "all" && group.key !== activeCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return group.items.some(
        (item) =>
          item.title.toLowerCase().includes(normalizedQuery) ||
          item.body.toLowerCase().includes(normalizedQuery) ||
          item.key.toLowerCase().includes(normalizedQuery)
      );
    }).map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!normalizedQuery) return true;
        return (
          item.title.toLowerCase().includes(normalizedQuery) ||
          item.body.toLowerCase().includes(normalizedQuery) ||
          item.key.toLowerCase().includes(normalizedQuery)
        );
      }),
    }));
  }, [activeCategory, query]);

  return (
    <PageShell preset="analytics" scroll={false}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollFill}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionCard
          title="Definitions"
          subtitle="Search metrics or jump to a category so this page works like a reference, not a long flat glossary."
          actions={
            sourceLabel ? (
              <Pressable
                style={styles.commandButton}
                onPress={() => router.back()}
              >
                <Text style={styles.commandButtonText}>{`Back to ${sourceLabel}`}</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.commandButton}
                onPress={() => router.push(APP_ROUTES.home)}
              >
                <Text style={styles.commandButtonText}>Command</Text>
              </Pressable>
            )
          }
        >
          {sourceLabel ? (
            <View style={styles.sourceContextRow}>
              <Text style={styles.sourceContextLabel}>Opened from</Text>
              <View style={styles.sourceContextChip}>
                <Text style={styles.sourceContextChipText}>{sourceLabel}</Text>
              </View>
            </View>
          ) : null}

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search metrics or jump to a category"
            placeholderTextColor="#7D96B9"
            style={styles.searchInput}
          />

          <ScrollView
            horizontal
            contentContainerStyle={styles.categoryTabRail}
            showsHorizontalScrollIndicator={false}
          >
            <CategoryTab
              label="All"
              active={activeCategory === "all"}
              onPress={() => setActiveCategory("all")}
            />
            {DEFINITION_GROUPS.map((group) => (
              <CategoryTab
                key={group.key}
                label={group.title}
                active={activeCategory === group.key}
                onPress={() => setActiveCategory(group.key)}
              />
            ))}
          </ScrollView>
        </SectionCard>

        {visibleGroups.map((group) => (
          <View
            key={group.key}
            onLayout={(event) =>
              updateTrackedOffset(
                groupOffsets,
                group.key,
                event.nativeEvent.layout.y,
              )
            }
          >
            <SectionCard title={group.title} subtitle={group.subtitle}>
              <View
                style={styles.definitionList}
                onLayout={(event) =>
                  updateTrackedOffset(
                    listOffsets,
                    group.key,
                    event.nativeEvent.layout.y,
                  )
                }
              >
                {group.items.map((item) => {
                  const highlight = item.key === targetMetric;
                  const relatedTermKeys = getRelatedDefinitionKeys(item.key);

                  return (
                    <View
                      key={item.key}
                      onLayout={(event) => {
                        const itemY = event.nativeEvent.layout.y;

                        if (itemOffsets.current[item.key] === itemY) {
                          return;
                        }

                        itemOffsets.current[item.key] = event.nativeEvent.layout.y;
                        setLayoutVersion((version) => version + 1);
                      }}
                      style={[
                        styles.definitionCard,
                        highlight && styles.definitionCardHighlight,
                      ]}
                    >
                      <Text style={styles.definitionTitle}>{item.title}</Text>
                      <DefinitionRichText
                        text={item.body}
                        style={styles.definitionBody}
                      />
                      {relatedTermKeys.length > 0 ? (
                        <View style={styles.relatedTermsWrap}>
                          <Text style={styles.relatedTermsLabel}>Related</Text>
                          <View style={styles.relatedTermsRail}>
                            {relatedTermKeys.map((relatedKey) => {
                              const relatedItem = getDefinitionItem(relatedKey);
                              if (!relatedItem) {
                                return null;
                              }

                              const isCurrentTerm = relatedItem.key === targetMetric;

                              return (
                                <Pressable
                                  key={`${item.key}-${relatedItem.key}`}
                                  disabled={isCurrentTerm}
                                  accessibilityState={{
                                    disabled: isCurrentTerm,
                                    selected: isCurrentTerm,
                                  }}
                                  style={({ pressed }) => [
                                    styles.relatedTermChip,
                                    isCurrentTerm && styles.relatedTermChipCurrent,
                                    pressed && styles.relatedTermChipPressed,
                                  ]}
                                  onPress={() => {
                                    if (isCurrentTerm) {
                                      return;
                                    }

                                    router.replace(
                                      buildDefinitionsRoute({
                                        metric: relatedItem.key,
                                        category: group.key,
                                        sourceLabel,
                                      }),
                                    );
                                  }}
                                >
                                  <Text
                                    style={[
                                      styles.relatedTermChipText,
                                      isCurrentTerm && styles.relatedTermChipTextCurrent,
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
                    </View>
                  );
                })}
              </View>
            </SectionCard>
          </View>
        ))}
      </ScrollView>
    </PageShell>
  );
}

function CategoryTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.categoryTab}>
      <Text
        style={[styles.categoryTabText, active && styles.categoryTabTextActive]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.categoryTabUnderline,
          active && styles.categoryTabUnderlineActive,
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollFill: {
    flex: 1,
  },
  content: {
    gap: 14,
  },
  commandButton: {
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.34)",
    backgroundColor: "rgba(37,99,235,0.16)",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  commandButtonText: {
    color: "#E8F1FF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  searchInput: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    color: "#F8FBFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: "700",
  },
  categoryTabRail: {
    paddingTop: 2,
    paddingRight: 8,
    gap: 18,
    alignItems: "flex-end",
  },
  sourceContextRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  sourceContextLabel: {
    color: "#9FB6D8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  sourceContextChip: {
    ...buttonSystem.rectBase,
    minHeight: 34,
    borderRadius: 10,
    borderColor: "rgba(96,165,250,0.34)",
    backgroundColor: "rgba(37,99,235,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sourceContextChipText: {
    color: "#E8F1FF",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  categoryTab: {
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 6,
  },
  categoryTabText: {
    color: "#AFC3E8",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.25,
    textAlign: "center",
  },
  categoryTabTextActive: {
    color: "#F8FBFF",
  },
  categoryTabUnderline: {
    width: "100%",
    minWidth: 44,
    height: 2,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  categoryTabUnderlineActive: {
    backgroundColor: "#67E8F9",
  },
  definitionList: {
    gap: 10,
  },
  definitionCard: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 4,
  },
  definitionCardHighlight: {
    backgroundColor: "rgba(96,165,250,0.12)",
    borderColor: "rgba(96,165,250,0.30)",
  },
  definitionTitle: {
    color: "#F8FBFF",
    fontSize: 15,
    fontWeight: "900",
  },
  definitionBody: {
    color: "#C7D6F3",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  relatedTermsWrap: {
    gap: 6,
    marginTop: 2,
  },
  relatedTermsLabel: {
    color: "#9FB6D8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  relatedTermsRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.14)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 8,
  },
  relatedTermChip: {
    ...buttonSystem.rectBase,
    minHeight: 38,
    flexBasis: "48%",
    flexGrow: 1,
    minWidth: 118,
    borderRadius: 10,
    borderColor: "rgba(103,232,249,0.22)",
    backgroundColor: "rgba(12, 30, 44, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  relatedTermChipCurrent: {
    borderColor: "rgba(125,211,252,0.5)",
    backgroundColor: "rgba(37,99,235,0.24)",
  },
  relatedTermChipPressed: {
    opacity: 0.78,
  },
  relatedTermChipText: {
    color: "#DFF7FF",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  relatedTermChipTextCurrent: {
    color: "#F8FBFF",
  },
});
