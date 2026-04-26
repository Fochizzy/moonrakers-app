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
const AUTH_BACKGROUND = require("@/assets/Background.png");
const RINGS = require("@/assets/Rings.png");

export const BACKGROUND_PRESETS = {
  quiet: "quiet",
  auth: "auth",
  analytics: "analytics",
  command: "command",
  archive: "archive",
  intel: "intel",
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
    base: "#081120",
    overlay: "rgba(8,17,32,0.88)",
    glowA: "rgba(59,130,246,0.12)",
    glowB: "rgba(168,85,247,0.12)",
    artSource: MOON,
    artVariant: "identity",
    artOpacity: 0.1,
    artTop: 28,
    artRight: -18,
    artWidth: 220,
    artHeight: 220,
  },
  auth: {
    base: "#0A1326",
    overlay: "rgba(10,19,38,0.56)",
    glowA: "rgba(168,85,247,0.16)",
    glowB: "rgba(59,130,246,0.12)",
    artSource: AUTH_BACKGROUND,
    artVariant: "fill",
    artOpacity: 0.72,
  },
  analytics: {
    base: "#06111F",
    overlay: "rgba(6,17,31,0.72)",
    glowA: "rgba(103,232,249,0.12)",
    glowB: "rgba(96,165,250,0.1)",
    artSource: RINGS,
    artVariant: "fill",
    artOpacity: 0.3,
  },
  command: {
    base: "#071722",
    overlay: "rgba(7,23,34,0.64)",
    glowA: "rgba(34,197,94,0.12)",
    glowB: "rgba(96,165,250,0.1)",
    artSource: AUTH_BACKGROUND,
    artVariant: "fill",
    artOpacity: 0.66,
  },
  archive: {
    base: "#101523",
    overlay: "rgba(16,21,35,0.88)",
    glowA: "rgba(245,158,11,0.1)",
    glowB: "rgba(59,130,246,0.08)",
    artSource: MOON,
    artVariant: "identity",
    artOpacity: 0.08,
    artTop: 34,
    artRight: -26,
    artWidth: 200,
    artHeight: 200,
  },
  intel: {
    base: "#06111F",
    overlay: "rgba(6,17,31,0.8)",
    glowA: "rgba(6,182,212,0.16)",
    glowB: "rgba(168,85,247,0.14)",
    artSource: MOON,
    artVariant: "identity",
    artOpacity: 0.16,
    artTop: 18,
    artRight: -2,
    artWidth: 244,
    artHeight: 244,
  },
  database: {
    base: "#08121D",
    overlay: "rgba(8,18,29,0.84)",
    glowA: "rgba(34,197,94,0.12)",
    glowB: "rgba(6,182,212,0.1)",
    artSource: MOON,
    artVariant: "identity",
    artOpacity: 0.12,
    artTop: 24,
    artRight: -12,
    artWidth: 224,
    artHeight: 224,
  },
  tactical: {
    base: "#0A1422",
    overlay: "rgba(10,20,34,0.82)",
    glowA: "rgba(239,68,68,0.12)",
    glowB: "rgba(245,158,11,0.1)",
    artSource: MOON,
    artVariant: "identity",
    artOpacity: 0.11,
    artTop: 30,
    artRight: -14,
    artWidth: 216,
    artHeight: 216,
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
    top: -96,
    left: -40,
    right: -40,
    height: 260,
    borderRadius: 999,
  },
  sideGlow: {
    position: "absolute",
    right: -70,
    top: "26%",
    width: 220,
    height: 220,
    borderRadius: 999,
  },
  identity: {
    position: "absolute",
  },
});
