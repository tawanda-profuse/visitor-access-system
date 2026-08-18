import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { DateField } from "@/components/DateField";
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

const STATUS_OPTIONS: Record<Tab, string[]> = {
  codes: ["ACTIVE", "USED", "EXPIRED", "REVOKED"],
  entries: ["SUCCESS", "EXPIRED", "DENIED", "INVALID"],
};

// Inclusive day-range check against a record's date field: `to` is bumped to the end of
// its calendar day so e.g. filtering "to today" still includes items from earlier today.
function withinDateRange(iso: string, from: Date | null, to: Date | null) {
  const time = new Date(iso).getTime();
  if (from && time < new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()) return false;
  if (to && time > new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).getTime()) return false;
  return true;
}

export default function HistoryScreen() {
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("codes");
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [entries, setEntries] = useState<EntryLog[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);

  // The two tabs have different status vocabularies, so a filter carried over from the
  // other tab would silently match nothing — reset it whenever the active tab changes.
  useEffect(() => {
    setStatusFilter("ALL");
  }, [tab]);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      fetchAccessCodes(token).then((r) => setCodes(r.accessCodes)).catch(() => {});
      fetchEntryLogs(token).then((r) => setEntries(r.entryLogs)).catch(() => {});
    }, [token]),
  );

  const filteredCodes = useMemo(
    () =>
      codes.filter(
        (c) =>
          (statusFilter === "ALL" || c.status === statusFilter) &&
          withinDateRange(c.createdAt, dateFrom, dateTo),
      ),
    [codes, statusFilter, dateFrom, dateTo],
  );

  const filteredEntries = useMemo(
    () =>
      entries.filter(
        (e) =>
          (statusFilter === "ALL" || e.result === statusFilter) &&
          withinDateRange(e.occurredAt, dateFrom, dateTo),
      ),
    [entries, statusFilter, dateFrom, dateTo],
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

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {["ALL", ...STATUS_OPTIONS[tab]].map((status) => (
          <Pressable
            key={status}
            onPress={() => setStatusFilter(status)}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: statusFilter === status ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: statusFilter === status ? colors.primary : colors.border,
            }}
          >
            <Text
              style={{
                color: statusFilter === status ? colors.textOnPrimary : colors.text,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <DateField label="From" value={dateFrom} onChange={setDateFrom} maximumDate={dateTo ?? undefined} />
        <DateField label="To" value={dateTo} onChange={setDateTo} minimumDate={dateFrom ?? undefined} />
      </View>

      {tab === "codes" &&
        (filteredCodes.length === 0 ? (
          <Card>
            <Text style={{ color: colors.textSecondary }}>
              {codes.length === 0 ? "No visitor passes yet." : "No visitor passes match these filters."}
            </Text>
          </Card>
        ) : (
          filteredCodes.map((code) => (
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
        (filteredEntries.length === 0 ? (
          <Card>
            <Text style={{ color: colors.textSecondary }}>
              {entries.length === 0 ? "No entries logged yet." : "No entries match these filters."}
            </Text>
          </Card>
        ) : (
          filteredEntries.map((entry) => (
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
