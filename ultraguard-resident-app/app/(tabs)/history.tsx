import React, { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { useAppTheme } from "@/theme/ThemeContext";
import { useAuth } from "@/auth/AuthContext";
import { fetchAccessCodes, fetchEntryLogs } from "@/api/resident";
import type { AccessCode, EntryLog } from "@/api/types";

type Tab = "codes" | "entries";

const CODE_TONE: Record<AccessCode["status"], "success" | "warning" | "danger" | "neutral"> = {
  ACTIVE: "success",
  USED: "neutral",
  EXPIRED: "warning",
  REVOKED: "danger",
};

const ENTRY_TONE: Record<EntryLog["result"], "success" | "warning" | "danger" | "neutral"> = {
  SUCCESS: "success",
  EXPIRED: "warning",
  DENIED: "danger",
  INVALID: "danger",
};

export default function HistoryScreen() {
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("codes");
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [entries, setEntries] = useState<EntryLog[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      fetchAccessCodes(token).then((r) => setCodes(r.accessCodes)).catch(() => {});
      fetchEntryLogs(token).then((r) => setEntries(r.entryLogs)).catch(() => {});
    }, [token]),
  );

  return (
    <ScreenContainer>
      <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text }}>History</Text>

      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["codes", "entries"] as Tab[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: "center",
              backgroundColor: tab === t ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: tab === t ? colors.primary : colors.border,
            }}
          >
            <Text style={{ color: tab === t ? colors.textOnPrimary : colors.text, fontWeight: "600" }}>
              {t === "codes" ? "Visitor Passes" : "Entry Logs"}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "codes" &&
        (codes.length === 0 ? (
          <Card>
            <Text style={{ color: colors.textSecondary }}>No visitor passes yet.</Text>
          </Card>
        ) : (
          codes.map((code) => (
            <Pressable key={code.id} onPress={() => router.push(`/code/${code.id}`)}>
              <Card style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: colors.text, fontWeight: "600" }}>{code.visitorName}</Text>
                  <StatusBadge label={code.status} tone={CODE_TONE[code.status]} />
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {code.type.replace("_", " ")} · Code {code.code}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Valid until {new Date(code.validUntil).toLocaleString()}
                </Text>
              </Card>
            </Pressable>
          ))
        ))}

      {tab === "entries" &&
        (entries.length === 0 ? (
          <Card>
            <Text style={{ color: colors.textSecondary }}>No entries logged yet.</Text>
          </Card>
        ) : (
          entries.map((entry) => (
            <Card key={entry.id} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>
                  {entry.visitorName ?? "Unknown visitor"}
                </Text>
                <StatusBadge label={entry.result} tone={ENTRY_TONE[entry.result]} />
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {entry.method} · {new Date(entry.occurredAt).toLocaleString()}
              </Text>
              {entry.reason && (
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{entry.reason}</Text>
              )}
            </Card>
          ))
        ))}
    </ScreenContainer>
  );
}
