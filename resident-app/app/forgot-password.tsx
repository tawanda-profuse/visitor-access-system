import React, { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ScreenContainer";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useAppTheme } from "@/theme/ThemeContext";
import { forgotPassword } from "@/api/resident";
import { ApiClientError, describeError } from "@/api/client";

const GENERIC_MESSAGE =
  "If an account exists for that phone or email, we've sent a link to reset your password.";

export default function ForgotPasswordScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!identifier.trim()) {
      setError("Enter your phone number or email.");
      return;
    }
    setLoading(true);
    try {
      const result = await forgotPassword(identifier.trim());
      setMessage(result.message ?? GENERIC_MESSAGE);
    } catch (e) {
      // Anti-enumeration: the backend always returns success for this endpoint, so
      // the only errors we can genuinely hit here are real network/server failures —
      // a validation error (e.g. empty body) counts too, but is unlikely given the
      // check above. Show a real error only in that case, never leak match/no-match.
      if (e instanceof ApiClientError) {
        setMessage(GENERIC_MESSAGE);
      } else {
        setError(describeError(e, "Couldn't reach the server. Check your connection and try again."));
      }
    } finally {
      setLoading(false);
    }
  };

  if (message) {
    return (
      <ScreenContainer scroll={false} style={{ justifyContent: "center", gap: 20 }}>
        <Card style={{ gap: 10 }}>
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16 }}>Check Your Email</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{message}</Text>
        </Card>
        <Button label="Back to Sign In" onPress={() => router.replace("/login")} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false} style={{ justifyContent: "center", gap: 20 }}>
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text }}>Forgot Password</Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
          Enter your phone or email and we'll send you a link to reset your password.
        </Text>
      </View>

      <TextField
        label="Phone or Email"
        placeholder="+263 772 000 000 or you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={identifier}
        onChangeText={setIdentifier}
      />
      {error && <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text>}

      <Button label="Send Reset Link" onPress={onSubmit} loading={loading} />
      <Button label="Back to Sign In" variant="ghost" onPress={() => router.replace("/login")} />
    </ScreenContainer>
  );
}
