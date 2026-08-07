import React, { useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ScreenContainer";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { useAppTheme } from "@/theme/ThemeContext";
import { useAuth } from "@/auth/AuthContext";
import { requestOtp, verifyOtp } from "@/api/resident";
import { ApiClientError } from "@/api/client";

export default function VerifyScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { login } = useAuth();
  const { phone, devOtp } = useLocalSearchParams<{ phone: string; devOtp?: string }>();

  const [otp, setOtp] = useState(devOtp ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (otp.trim().length !== 6) {
      setError("Enter the 6-digit code we sent you.");
      return;
    }
    setLoading(true);
    try {
      const result = await verifyOtp(phone, otp.trim());
      await login(result.token, result.resident);
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setResending(true);
    setError(null);
    try {
      await requestOtp(phone);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Couldn't resend the code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <ScreenContainer scroll={false} style={{ justifyContent: "center", gap: 20 }}>
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: "700", color: colors.text }}>Enter Code</Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
          We sent a 6-digit code to {phone}.
          {devOtp ? " (Dev mode: code pre-filled below since no SMS provider is wired up yet.)" : ""}
        </Text>
      </View>

      <TextField
        label="Verification Code"
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
      />
      {error && <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text>}

      <Button label="Verify & Continue" onPress={onSubmit} loading={loading} />
      <Button label="Resend Code" onPress={onResend} variant="ghost" loading={resending} />
    </ScreenContainer>
  );
}
