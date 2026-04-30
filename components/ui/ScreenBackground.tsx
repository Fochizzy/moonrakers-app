import React from "react";
import {
  Image,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

const MOON = require("@/assets/Moon.png");
const BACKGROUND_ALT = require("@/assets/Background 2.png");
const AUTH_BACKGROUND = require("@/assets/Background.png");
const MOONRISE = require("@/assets/Moonrise.png");
const RINGS = require("@/assets/Rings.png");

export const BACKGROUND_PRESETS = {
  quiet: "quiet",
  auth: "auth",
  authHero: "authHero",
  launch: "launch",
  analytics: "analytics",
  command: "command",
  archive: "archive",
  intel: "intel",
  detail: "detail",
  database: "database",
  tactical: "tactical",
} as const;

export type ScreenBackgroundPreset = keyof typeof BACKGROUND_PRESETS;

type BackgroundPresetConfig = {
  base: string;
  overlay: string;
  glowA: string;
  glowB: string;
  artSource: ImageSourcePropType;
  artVariant: "fill" | "identity";
  artOpacity: number;
  artTop?: number;
  artRight?: number;
  artWidth?: number;
  artHeight?: number;
};

const PRESET_CONFIGS: Record<ScreenBackgroundPreset, BackgroundPresetConfig> = {
  quiet: {
    base: "#07101D",
    overlay: "rgba(7,16,29,0.74)",
    glowA: "rgba(59,130,246,0.08)",
    glowB: "rgba(168,85,247,0.1)",
    artSource: BACKGROUND_ALT,
    artVariant: "fill",
    artOpacity: 0.42,
  },
  auth: {
    base: "#0A1326",
    overlay: "rgba(10,19,38,0.68)",
    glowA: "rgba(168,85,247,0.16)",
    glowB: "rgba(59,130,246,0.12)",
    artSource: AUTH_BACKGROUND,
    artVariant: "fill",
    artOpacity: 0.58,
  },
  authHero: {
    base: "#080F22",
    overlay: "rgba(8,15,34,0.44)",
    glowA: "rgba(167,139,250,0.12)",
    glowB: "rgba(96,165,250,0.08)",
    artSource: AUTH_BACKGROUND,
    artVariant: "fill",
    artOpacity: 0.86,
  },
  launch: {
    base: "#0A1326",
    overlay: "rgba(10,19,38,0.62)",
    glowA: "rgba(250,204,21,0.1)",
    glowB: "rgba(168,85,247,0.14)",
    artSource: AUTH_BACKGROUND,
    artVariant: "fill",
    artOpacity: 0.64,
  },
  analytics: {
    base: "#06111F",
    overlay: "rgba(6,17,31,0.78)",
    glowA: "rgba(103,232,249,0.12)",
    glowB: "rgba(96,165,250,0.1)",
    artSource: RINGS,
    artVariant: "fill",
    artOpacity: 0.28,
  },
  command: {
    base: "#061321",
    overlay: "rgba(6,19,33,0.74)",
    glowA: "rgba(129,140,248,0.12)",
    glowB: "rgba(96,165,250,0.08)",
    artSource: BACKGROUND_ALT,
    artVariant: "fill",
    artOpacity: 0.46,
  },
  archive: {
    base: "#09111D",
    overlay: "rgba(9,17,29,0.8)",
    glowA: "rgba(245,158,11,0.08)",
    glowB: "rgba(96,165,250,0.08)",
    artSource: MOONRISE,
    artVariant: "fill",
    artOpacity: 0.32,
  },
  intel: {
    base: "#08111F",
    overlay: "rgba(8,17,31,0.76)",
    glowA: "rgba(6,182,212,0.16)",
    glowB: "rgba(168,85,247,0.14)",
    artSource: MOONRISE,
    artVariant: "fill",
    artOpacity: 0.34,
  },
  detail: {
    base: "#08111E",
    overlay: "rgba(8,17,30,0.8)",
    glowA: "rgba(167,139,250,0.12)",
    glowB: "rgba(96,165,250,0.08)",
    artSource: MOONRISE,
    artVariant: "fill",
    artOpacity: 0.3,
  },
  database: {
    base: "#08121D",
    overlay: "rgba(8,18,29,0.8)",
    glowA: "rgba(34,197,94,0.12)",
    glowB: "rgba(6,182,212,0.1)",
    artSource: RINGS,
    artVariant: "fill",
    artOpacity: 0.22,
  },
  tactical: {
    base: "#0A1422",
    overlay: "rgba(10,20,34,0.82)",
    glowA: "rgba(239,68,68,0.12)",
    glowB: "rgba(245,158,11,0.1)",
    artSource: BACKGROUND_ALT,
    artVariant: "fill",
    artOpacity: 0.2,
  },
};

type ScreenBackgroundProps = {
  preset?: ScreenBackgroundPreset;
  style?: StyleProp<ViewStyle>;
};

export default function ScreenBackground({
  preset = "quiet",
  style,
}: ScreenBackgroundProps) {
  const config = PRESET_CONFIGS[preset] ?? PRESET_CONFIGS.quiet;

  return (
    <View pointerEvents="none" style={[styles.root, style]}>
      <View
        style={[
          styles.fill,
          {
            backgroundColor: config.base,
          },
        ]}
      >
        {config.artVariant === "fill" ? (
          <Image
            source={config.artSource}
            resizeMode="cover"
            style={[
              styles.fillArt,
              {
                opacity: config.artOpacity,
              },
            ]}
          />
        ) : (
          <Image
            source={config.artSource}
            resizeMode="contain"
            style={[
              styles.identity,
              {
                opacity: config.artOpacity,
                top: config.artTop,
                right: config.artRight,
                width: config.artWidth,
                height: config.artHeight,
              },
            ]}
          />
        )}

        <View
          style={[
            styles.overlay,
            {
              backgroundColor: config.overlay,
            },
          ]}
        />

        <View
          style={[
            styles.topGlow,
            {
              backgroundColor: config.glowA,
            },
          ]}
        />

        <View
          style={[
            styles.sideGlow,
            {
              backgroundColor: config.glowB,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  fill: {
    flex: 1,
  },
  fillArt: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topGlow: {
    position: "absolute",
    top: -104,
    left: -56,
    right: -56,
    height: 280,
    borderRadius: 999,
  },
  sideGlow: {
    position: "absolute",
    right: -92,
    top: "24%",
    width: 248,
    height: 248,
    borderRadius: 999,
  },
  identity: {
    position: "absolute",
  },
});
