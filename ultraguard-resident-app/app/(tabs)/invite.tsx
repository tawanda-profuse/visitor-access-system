import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ScreenContainer";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { DateTimeField } from "@/components/DateTimeField";
import { useAppTheme } from "@/theme/ThemeContext";
import { useAuth } from "@/auth/AuthContext";
import { createAccessCode } from "@/api/resident";
import { ApiClientError } from "@/api/client";
import type { AccessCodeType } from "@/api/types";

const TYPE_OPTIONS: { value: AccessCodeType; label: string; helper: string }[] = [
  { value: "ONE_TIME", label: "One-Time", helper: "Expires immediately after a single entry." },
  { value: "TIME_BOUND", label: "Time-Bound", helper: "Valid for a custom date/time window." },
  { value: "RECURRING", label: "Recurring", helper: "For regular visitors like staff or contractors." },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function toTimeString(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export default function InviteScreen() {
  const { colors } = useAppTheme();
  const { token } = useAuth();
  const router = useRouter();

  const [type, setType] = useState<AccessCodeType>("ONE_TIME");
  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [validFrom, setValidFrom] = useState(new Date());
  const [validUntil, setValidUntil] = useState(addHours(new Date(), 24));
  const [recurringDays, setRecurringDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState(new Date(new Date().setHours(8, 0, 0, 0)));
  const [endTime, setEndTime] = useState(new Date(new Date().setHours(17, 0, 0, 0)));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleDay = (day: number) => {
    setRecurringDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const onSubmit = async () => {
    setError(null);
    if (!visitorName.trim()) {
      setError("Enter the visitor's name.");
      return;
    }
    if (type === "RECURRING" && recurringDays.length === 0) {
      setError("Select at least one day for a recurring pass.");
      return;
    }

    setLoading(true);
    try {
      const result = await createAccessCode(token!, {
        type,
        visitorName: visitorName.trim(),
        visitorPhone: visitorPhone.trim() || undefined,
        validFrom: validFrom.toISOString(),
        validUntil: validUntil.toISOString(),
        recurrenceRule:
          type === "RECURRING"
            ? {
                daysOfWeek: recurringDays,
                startTime: toTimeString(startTime),
                endTime: toTimeString(endTime),
              }
            : undefined,
      });
      router.replace(`/code/${result.accessCode.id}`);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Couldn't create the pass. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text }}>Invite a Visitor</Text>

      <View style={{ flexDirection: "row", gap: 8 }}>
        {TYPE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => setType(opt.value)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: "center",
              backgroundColor: type === opt.value ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: type === opt.value ? colors.primary : colors.border,
            }}
          >
            <Text
              style={{
                color: type === opt.value ? colors.textOnPrimary : colors.text,
                fontWeight: "600",
                fontSize: 13,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
        {TYPE_OPTIONS.find((o) => o.value === type)?.helper}
      </Text>

      <TextField label="Visitor Name" placeholder="e.g. John Visitor" value={visitorName} onChangeText={setVisitorName} />
      <TextField
        label="Visitor Phone (optional)"
        placeholder="+27 82 000 0000"
        keyboardType="phone-pad"
        value={visitorPhone}
        onChangeText={setVisitorPhone}
      />

      {type !== "RECURRING" && (
        <>
          <DateTimeField label="Valid From" value={validFrom} onChange={setValidFrom} minimumDate={new Date()} />
          <DateTimeField label="Valid Until" value={validUntil} onChange={setValidUntil} minimumDate={validFrom} />
        </>
      )}

      {type === "RECURRING" && (
        <>
          <View style={{ gap: 6 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "500" }}>
              Permitted Days
            </Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {DAYS.map((day, index) => (
                <Pressable
                  key={day}
                  onPress={() => toggleDay(index)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: "center",
                    backgroundColor: recurringDays.includes(index) ? colors.primary : colors.surface,
                    borderWidth: 1,
                    borderColor: recurringDays.includes(index) ? colors.primary : colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: recurringDays.includes(index) ? colors.textOnPrimary : colors.text,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {day}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <DateTimeField label="Daily Start Time" value={startTime} onChange={setStartTime} />
          <DateTimeField label="Daily End Time" value={endTime} onChange={setEndTime} />
          <DateTimeField
            label="Recurring Pass Expires On"
            value={validUntil}
            onChange={setValidUntil}
            minimumDate={new Date()}
          />
        </>
      )}

      {error && <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text>}

      <Button label="Generate Access Code" onPress={onSubmit} loading={loading} />
    </ScreenContainer>
  );
}
