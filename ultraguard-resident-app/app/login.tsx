import React, { useState } from "react";
import { Image, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ScreenContainer";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { useAppTheme } from "@/theme/ThemeContext";
import { requestOtp } from "@/api/resident";
import { ApiClientError } from "@/api/client";

export default function LoginScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (phone.trim().length < 7) {
      setError("Enter a valid phone number, including country code.");
      return;
    }
    setLoading(true);
    try {
      const result = await requestOtp(phone.trim());
      router.push({
        pathname: "/verify",
        params: { phone: phone.trim(), devOtp: result.devOtp ?? "" },
      });
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
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
        />
        {error && <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text>}
        <Button label="Send Login Code" onPress={onSubmit} loading={loading} />
      </View>

      <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: "center" }}>
        We'll text a one-time code to verify it's you.
      </Text>
    </ScreenContainer>
  );
}
