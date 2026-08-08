import React, { useState } from "react";
import { Image, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ScreenContainer";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useAppTheme } from "@/theme/ThemeContext";
import { requestOtp } from "@/api/resident";
import { ApiClientError } from "@/api/client";

export default function LoginScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // No SMS gateway is wired up yet (see ultraguard-admin-backend/src/lib/otp.ts) — the
  // API echoes the OTP back in dev mode so we can surface it here instead of a text
  // message. Once a real provider is connected, OTP_DEV_MODE=false makes devOtp
  // undefined and this whole branch is skipped automatically.
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (phone.trim().length < 7) {
      setError("Enter a valid phone number, including country code.");
      return;
    }
    setLoading(true);
    try {
      const result = await requestOtp(phone.trim());
      if (result.devOtp) {
        setDevOtp(result.devOtp);
      } else {
        router.push({ pathname: "/verify", params: { phone: phone.trim() } });
      }
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const onContinue = () => {
    router.push({ pathname: "/verify", params: { phone: phone.trim(), devOtp: devOtp ?? "" } });
  };

  const onUseDifferentNumber = () => {
    setDevOtp(null);
    setError(null);
  };

  return (
    <ScreenContainer scroll={false} style={{ justifyContent: "center", gap: 24 }}>
      <View style={{ alignItems: "center", gap: 12 }}>
        <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 12 }}>
          <Image
            source={require("../assets/ultraguard-logo.png")}
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
          label="Mobile Number"
          placeholder="+27 82 000 0000"
          keyboardType="phone-pad"
          autoComplete="tel"
          value={phone}
          onChangeText={setPhone}
          editable={!devOtp}
        />
        {error && <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text>}

        {devOtp ? (
          <>
            <Card style={{ borderColor: colors.warning, gap: 6 }}>
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>
                No SMS Gateway Connected Yet
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                This code would normally be texted to {phone}. Shown here for testing until a
                real SMS provider is integrated.
              </Text>
              <Text
                style={{
                  color: colors.primary,
                  fontSize: 34,
                  fontWeight: "800",
                  letterSpacing: 6,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                {devOtp}
              </Text>
            </Card>
            <Button label="Continue" onPress={onContinue} />
            <Button label="Use a Different Number" variant="ghost" onPress={onUseDifferentNumber} />
          </>
        ) : (
          <Button label="Send Login Code" onPress={onSubmit} loading={loading} />
        )}
      </View>

      {!devOtp && (
        <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: "center" }}>
          We'll text a one-time code to verify it's you.
        </Text>
      )}
    </ScreenContainer>
  );
}
