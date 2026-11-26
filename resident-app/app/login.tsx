import React, { useState } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ScreenContainer";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { useAppTheme } from "@/theme/ThemeContext";
import { useAuth } from "@/auth/AuthContext";
import { loginResident } from "@/api/resident";
import { describeError } from "@/api/client";

export default function LoginScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { token, isLoading, login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // An already-signed-in resident should never land back on the login form (e.g. via
  // deep link, back navigation, or a stale bookmark) — send them straight to the app.
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  if (token) {
    return <Redirect href="/(tabs)" />;
  }

  const onSubmit = async () => {
    setError(null);
    if (!identifier.trim()) {
      setError("Enter your phone number or email.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setLoading(true);
    try {
      const result = await loginResident(identifier.trim(), password);
      await login(result.token, result.resident);
      router.replace("/(tabs)");
    } catch (e) {
      setError(describeError(e, "Something went wrong. Try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scroll style={{ justifyContent: "center", gap: 24 }}>
      <View style={{ alignItems: "center", gap: 12 }}>
        <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 12 }}>
          <Image
            source={require("../assets/logo.png")}
            style={{ width: 220, height: 60 }}
            resizeMode="contain"
          />
        </View>
        <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: "center" }}>
          Resident sign-in for gate access management
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        <TextField
          label="Phone or Email"
          placeholder="+263 772 000 000 or you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="username"
          value={identifier}
          onChangeText={setIdentifier}
        />
        <TextField
          label="Password"
          placeholder="Your password"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
        />
        {error && <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text>}

        <Button label="Sign In" onPress={onSubmit} loading={loading} />
        <Button label="Forgot Password?" variant="ghost" onPress={() => router.push("/forgot-password")} />
      </View>

      <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: "center" }}>
        New resident? Check your email for a link to set your password.
      </Text>

      <View style={{ gap: 10 }}>
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: "center" }}>
          Working the gate tonight?
        </Text>
        <Button label="Security Guard Mode" variant="secondary" onPress={() => router.push("/guard")} />
      </View>
    </ScreenContainer>
  );
}
