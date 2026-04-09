import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useStore } from "@/store/useStore";
import StarryNight from "@/components/ui/StarryNight";

export default function PlayerProfileIndex() {
  const router = useRouter();
  const players = useStore((s: any) => s.players || []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={StyleSheet.absoluteFill}>
        <StarryNight />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Select Player</Text>
        <Text style={styles.subtitle}>
          Choose a player to open their full profile
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {players.length === 0 ? (
          <Text style={styles.empty}>No players found</Text>
        ) : (
          players.map((player: any) => (
            <Pressable
              key={player.id}
              onPress={() =>
                router.push(`/player-profile/${player.id}` as any)
              }
              style={styles.row}
            >
              <Text style={styles.name}>{player.name || "Unknown Player"}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },

  header: {
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },

  subtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
  },

  list: {
    padding: 12,
    gap: 8,
  },

  row: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  name: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "800",
  },

  empty: {
    color: "#64748B",
    textAlign: "center",
    marginTop: 40,
  },
});


