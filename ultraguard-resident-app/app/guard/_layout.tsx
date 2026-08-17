import React from "react";
import { Pressable } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/theme/ThemeContext";
import { useAuth } from "@/auth/AuthContext";

function ExitButton() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { token } = useAuth();
  return (
    <Pressable
      // A signed-in resident who entered Guard Mode from Settings returns to their tabs;
      // an unauthenticated guard (who entered from the login screen) returns there.
      onPress={() => router.replace(token ? "/(tabs)" : "/login")}
      hitSlop={12}
      style={{ paddingHorizontal: 8, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 }}
    >
      <Ionicons name="close-circle-outline" size={20} color={colors.text} />
    </Pressable>
  );
}

export default function GuardLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        headerRight: () => <ExitButton />,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Security Guard Mode" }} />
      <Stack.Screen name="verify" options={{ title: "Verify Pass" }} />
    </Stack>
  );
}
