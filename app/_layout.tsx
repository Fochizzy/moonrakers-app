import 'react-native-gesture-handler';

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider, useTheme } from '@/theme';

function AppBackground() {
  return (
    <>
      <View style={styles.baseBg} pointerEvents="none" />
      <View style={styles.topGlow} pointerEvents="none" />
      <View style={styles.sideGlow} pointerEvents="none" />
      <View style={styles.gridFade} pointerEvents="none" />
    </>
  );
}

function AppNavigator() {
  const t = useTheme();

  return (
    <View
      style={[
        styles.appShell,
        { backgroundColor: t.colors.background.primary },
      ]}
    >
      <AppBackground />

      <StatusBar style="light" translucent backgroundColor="transparent" />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: {
            backgroundColor: 'transparent',
          },
        }}
      />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#060816',
  },
  appShell: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  baseBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#060816',
  },
  topGlow: {
    position: 'absolute',
    top: -120,
    left: -40,
    right: -40,
    height: 280,
    borderRadius: 999,
    backgroundColor: 'rgba(99,230,255,0.08)',
    transform: [{ scaleX: 1.2 }],
  },
  sideGlow: {
    position: 'absolute',
    right: -100,
    top: '28%',
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(181,124,255,0.08)',
  },
  gridFade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
});
