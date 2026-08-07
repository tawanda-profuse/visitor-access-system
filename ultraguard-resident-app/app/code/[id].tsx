import React, { useCallback, useState } from "react";
import { Alert, Share, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { useAppTheme } from "@/theme/ThemeContext";
import { useAuth } from "@/auth/AuthContext";
import { fetchAccessCode, revokeAccessCode } from "@/api/resident";
import type { AccessCode } from "@/api/types";

const STATUS_TONE: Record<AccessCode["status"], "success" | "warning" | "danger" | "neutral"> = {
  ACTIVE: "success",
  USED: "neutral",
  EXPIRED: "warning",
  REVOKED: "danger",
};

export default function AccessCodeDetailScreen() {
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [accessCode, setAccessCode] = useState<AccessCode | null>(null);
  const [revoking, setRevoking] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!token || !id) return;
      fetchAccessCode(token, id).then((r) => setAccessCode(r.accessCode)).catch(() => {});
    }, [token, id]),
  );

  if (!accessCode) {
    return (
      <ScreenContainer>
        <Text style={{ color: colors.textSecondary }}>Loading pass…</Text>
      </ScreenContainer>
    );
  }

  const onShare = async () => {
    await Share.share({
      message:
        `Ultra-Guard Gate Access\n\n` +
        `Hi ${accessCode.visitorName}, here's your access code for your visit:\n\n` +
        `PIN: ${accessCode.code}\n` +
        `Valid until: ${new Date(accessCode.validUntil).toLocaleString()}\n\n` +
        `Enter this PIN at the gate keypad, or show the QR code, to be let in.`,
    });
  };

  const onRevoke = () => {
    Alert.alert("Revoke this pass?", "The visitor will no longer be able to use this code.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Revoke",
        style: "destructive",
        onPress: async () => {
          if (!token) return;
          setRevoking(true);
          try {
            const result = await revokeAccessCode(token, accessCode.id);
            setAccessCode(result.accessCode);
          } catch {
            Alert.alert("Couldn't revoke", "Please try again.");
          } finally {
            setRevoking(false);
          }
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <Card style={{ alignItems: "center", gap: 16, paddingVertical: 24 }}>
        <StatusBadge label={accessCode.status} tone={STATUS_TONE[accessCode.status]} />
        <View style={{ backgroundColor: "#fff", padding: 16, borderRadius: 16 }}>
          <QRCode value={accessCode.qrToken} size={180} />
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Gate PIN</Text>
          <Text style={{ color: colors.text, fontSize: 36, fontWeight: "800", letterSpacing: 4 }}>
            {accessCode.code}
          </Text>
        </View>
      </Card>

      <Card>
        <Row label="Visitor" value={accessCode.visitorName} colors={colors} />
        <Row label="Type" value={accessCode.type.replace("_", " ")} colors={colors} />
        <Row label="Valid From" value={new Date(accessCode.validFrom).toLocaleString()} colors={colors} />
        <Row label="Valid Until" value={new Date(accessCode.validUntil).toLocaleString()} colors={colors} />
        <Row label="Uses" value={`${accessCode.useCount} / ${accessCode.maxUses}`} colors={colors} />
      </Card>

      <Button label="Share with Visitor" onPress={onShare} />
      {accessCode.status === "ACTIVE" && (
        <Button label="Revoke Pass" onPress={onRevoke} variant="danger" loading={revoking} />
      )}
      <Button label="Back to Home" variant="ghost" onPress={() => router.replace("/(tabs)")} />
    </ScreenContainer>
  );
}

function Row({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useAppTheme>["colors"] }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
      <Text style={{ color: colors.textSecondary }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}
