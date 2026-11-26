import React, { useCallback, useState } from "react";
import { Alert, RefreshControl, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { MessageModal } from "@/components/MessageModal";
import { useAppTheme } from "@/theme/ThemeContext";
import { useAuth } from "@/auth/AuthContext";
import { fetchAccessCodes, fetchEntryLogs, triggerPanicAlert } from "@/api/resident";
import type { AccessCode, EntryLog } from "@/api/types";

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const { resident, token } = useAuth();
  const router = useRouter();

  const [activeCodes, setActiveCodes] = useState<AccessCode[]>([]);
  const [recentEntries, setRecentEntries] = useState<EntryLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [panicSending, setPanicSending] = useState(false);
  const [panicModalVisible, setPanicModalVisible] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [codesRes, logsRes] = await Promise.all([fetchAccessCodes(token), fetchEntryLogs(token)]);
      setActiveCodes(codesRes.accessCodes.filter((c) => c.status === "ACTIVE").slice(0, 5));
      setRecentEntries(logsRes.entryLogs.slice(0, 5));
    } catch {
      // silent — dashboard is best-effort, detail screens surface real errors
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onPanic = () => {
    setPanicModalVisible(true);
  };

  const onConfirmPanic = async (message: string) => {
    if (!token) return;
    setPanicSending(true);
    try {
      await triggerPanicAlert(token, message.trim() || undefined);
      setPanicModalVisible(false);
      Alert.alert("Alert Sent", "Security has been notified.");
    } catch {
      setPanicModalVisible(false);
      Alert.alert("Failed to Send", "Please call the guard house directly.");
    } finally {
      setPanicSending(false);
    }
  };

  return (
    <ScreenContainer
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text }}>
          Hi, {resident?.name?.split(" ")[0] ?? "Resident"}
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
          Manage visitor access to your property.
        </Text>
      </View>

      <Button label="Invite a Visitor" onPress={() => router.push("/(tabs)/invite")} />

      <Card style={{ borderColor: colors.warning }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="shield-checkmark" size={18} color={colors.warning} />
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>Covering the Gate?</Text>
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          Verify a visitor's pass yourself — scan their QR or check their PIN in seconds.
        </Text>
        <Button label="🛡️ Guard the Gate" variant="secondary" onPress={() => router.push("/guard")} />
      </Card>

      <Card style={{ borderColor: colors.danger }}>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>
          Emergency / Panic Trigger
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          Instantly alert the security guard desk or monitoring centre.
        </Text>
        <Button label="Send Emergency Alert" onPress={onPanic} variant="danger" loading={panicSending} />
      </Card>

      <View>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16, marginBottom: 8 }}>
          Active Visitor Passes
        </Text>
        {activeCodes.length === 0 ? (
          <Card>
            <Text style={{ color: colors.textSecondary }}>No active passes right now.</Text>
          </Card>
        ) : (
          activeCodes.map((code) => (
            <Card key={code.id} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>{code.visitorName}</Text>
                <StatusBadge label={code.type.replace("_", " ")} tone="neutral" />
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Code: {code.code}</Text>
              <Button
                label="View Pass"
                variant="ghost"
                onPress={() => router.push(`/code/${code.id}`)}
              />
            </Card>
          ))
        )}
      </View>

      <View>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16, marginBottom: 8 }}>
          Recent Gate Activity
        </Text>
        {recentEntries.length === 0 ? (
          <Card>
            <Text style={{ color: colors.textSecondary }}>No entries logged yet.</Text>
          </Card>
        ) : (
          recentEntries.map((entry) => (
            <Card key={entry.id} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>
                  {entry.visitorName ?? "Unknown visitor"}
                </Text>
                <StatusBadge
                  label={entry.result}
                  tone={
                    entry.result === "SUCCESS"
                      ? "success"
                      : entry.result === "EXPIRED"
                        ? "warning"
                        : "danger"
                  }
                />
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {new Date(entry.occurredAt).toLocaleString()}
              </Text>
            </Card>
          ))
        )}
      </View>

      <MessageModal
        visible={panicModalVisible}
        title="Trigger Emergency Alert?"
        description="This will immediately notify the security guard desk / monitoring centre."
        confirmLabel="Send Alert"
        confirmVariant="danger"
        loading={panicSending}
        onCancel={() => setPanicModalVisible(false)}
        onConfirm={onConfirmPanic}
      />
    </ScreenContainer>
  );
}
