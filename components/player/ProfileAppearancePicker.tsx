import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import Text from "@/components/ui/Text";
import PlayerCardIcon from "@/components/player/PlayerCardIcon";
import { getAllArtIndicesForColor, type CardColor } from "@/utils/cardAssignment";
import {
  PROFILE_COLOR_OPTIONS,
  resolveAssignedCardArtIndexForProfile,
} from "@/utils/profileAppearance";
import { getPlayerAccentColor } from "@/utils/turnTheme";

type Props = {
  assignedCardArtIndex?: number | null;
  favoriteColor?: CardColor | null;
  onSelectAssignedCardArtIndex?: (artIndex: number) => void;
  onSelectFavoriteColor: (color: CardColor) => void;
  allowCardSelection?: boolean;
  autoAssignHint?: string;
  subtitle?: string;
  title?: string;
};

function getColorLabel(color: CardColor) {
  return color.charAt(0).toUpperCase() + color.slice(1);
}

export default function ProfileAppearancePicker({
  assignedCardArtIndex = null,
  favoriteColor = null,
  onSelectAssignedCardArtIndex,
  onSelectFavoriteColor,
  allowCardSelection = false,
  autoAssignHint = "A matching default card will be assigned from your selected color.",
  subtitle,
  title,
}: Props) {
  const resolvedAssignedCardArtIndex = useMemo(
    () =>
      resolveAssignedCardArtIndexForProfile({
        favoriteColor,
        assignedCardArtIndex,
      }),
    [assignedCardArtIndex, favoriteColor],
  );

  const cardOptions = useMemo(
    () => (favoriteColor ? getAllArtIndicesForColor(favoriteColor) : []),
    [favoriteColor],
  );

  const accent = getPlayerAccentColor(favoriteColor ?? "blue");

  return (
    <View style={styles.root}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <View style={styles.colorRow}>
        {PROFILE_COLOR_OPTIONS.map((color) => {
          const selected = favoriteColor === color;
          const colorAccent = getPlayerAccentColor(color);

          return (
            <Pressable
              key={color}
              onPress={() => onSelectFavoriteColor(color)}
              style={({ pressed }) => [
                styles.colorChip,
                {
                  borderColor: selected ? `${colorAccent}AA` : `${colorAccent}40`,
                  backgroundColor: selected ? `${colorAccent}18` : `${colorAccent}10`,
                },
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.colorDot,
                  {
                    backgroundColor: colorAccent,
                    shadowColor: colorAccent,
                  },
                ]}
              />
              <Text style={[styles.colorChipText, selected && { color: colorAccent }]}>
                {getColorLabel(color)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {favoriteColor ? (
        <View
          style={[
            styles.previewCard,
            {
              borderColor: `${accent}55`,
              backgroundColor: `${accent}10`,
            },
          ]}
        >
          <View style={styles.previewArtWrap}>
            <PlayerCardIcon
              player={{
                name: "Commander",
                color: favoriteColor,
                assignedCardArtIndex: resolvedAssignedCardArtIndex,
              }}
              size={84}
              borderRadius={18}
              showInitial={false}
            />
          </View>

          <View style={styles.previewCopy}>
            <Text style={styles.previewTitle}>Current Card</Text>
            <Text style={styles.previewValue}>{getColorLabel(favoriteColor)}</Text>
            <Text style={styles.previewHint}>
              {allowCardSelection
                ? "Pick a different card from this color below."
                : autoAssignHint}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Choose a preferred color to continue.</Text>
        </View>
      )}

      {allowCardSelection && favoriteColor ? (
        <View style={styles.cardGrid}>
          {cardOptions.map((artIndex) => {
            const selected = artIndex === resolvedAssignedCardArtIndex;
            return (
              <Pressable
                key={artIndex}
                onPress={() => onSelectAssignedCardArtIndex?.(artIndex)}
                style={({ pressed }) => [
                  styles.cardOption,
                  {
                    borderColor: selected ? `${accent}AA` : `${accent}44`,
                    backgroundColor: selected ? `${accent}18` : "rgba(10,16,32,0.9)",
                  },
                  pressed && styles.pressed,
                ]}
              >
                <PlayerCardIcon
                  player={{
                    name: "Commander",
                    color: favoriteColor,
                    assignedCardArtIndex: artIndex,
                  }}
                  size={62}
                  borderRadius={14}
                  showInitial={false}
                />
                <Text style={[styles.cardOptionText, selected && { color: accent }]}>
                  {selected ? "Selected" : "Use"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
  title: {
    color: "#F8FBFF",
    fontSize: 16,
    fontWeight: "900",
  },
  subtitle: {
    color: "#9FB3D1",
    fontSize: 13,
    lineHeight: 19,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  colorChip: {
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    shadowOpacity: 0.38,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  colorChipText: {
    color: "#EAF2FF",
    fontSize: 12,
    fontWeight: "800",
  },
  previewCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  previewArtWrap: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  previewCopy: {
    flex: 1,
    gap: 4,
  },
  previewTitle: {
    color: "#67E8F9",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  previewValue: {
    color: "#F8FBFF",
    fontSize: 18,
    fontWeight: "900",
  },
  previewHint: {
    color: "#A8B6D8",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  emptyState: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  emptyText: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "700",
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  cardOption: {
    width: "31%",
    minWidth: 92,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cardOptionText: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "800",
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
});
