import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAppTheme, ThemePreference } from "@/theme/ThemeContext";
import { useAuth } from "@/auth/AuthContext";

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "light", label: "Light", icon: "sunny" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "System Default", icon: "phone-portrait" },
];

export default function SettingsScreen() {
  const { colors, preference, setPreference } = useAppTheme();
  const { resident, logout } = useAuth();
  const router = useRouter();

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <ScreenContainer>
      <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text }}>Settings</Text>

      <Card>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Signed in as</Text>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16 }}>{resident?.name}</Text>
        <Text style={{ color: colors.textSecondary }}>{resident?.phone}</Text>
      </Card>

      <View>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16, marginBottom: 8 }}>
          Appearance
        </Text>
        <Card style={{ padding: 0 }}>
          {THEME_OPTIONS.map((opt, index) => (
            <Pressable
              key={opt.value}
              onPress={() => setPreference(opt.value)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 14,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              <Ionicons name={opt.icon} size={20} color={colors.text} />
              <Text style={{ color: colors.text, fontSize: 15, flex: 1 }}>{opt.label}</Text>
              {preference === opt.value && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </Pressable>
          ))}
        </Card>
      </View>

      <Button label="Log Out" onPress={onLogout} variant="secondary" />

      <View style={{ gap: 10 }}>
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: "center" }}>
          Working the gate tonight?
        </Text>
        <Button label="Security Guard Mode" variant="secondary" onPress={() => router.push("/guard")} />
      </View>

      <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "center" }}>
        Ultra-Guard Security & Fire · Visitor Access Management System
      </Text>
    </ScreenContainer>
  );
}
