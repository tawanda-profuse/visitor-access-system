import React from "react";
import { Text, View } from "react-native";
import { useAppTheme } from "@/theme/ThemeContext";

type Props = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
};

// @react-native-community/datetimepicker has no web implementation — its fallback
// renders null, leaving an empty bordered box. Use a real HTML date/time input instead.
function toInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function DateTimeField({ label, value, onChange, minimumDate }: Props) {
  const { colors } = useAppTheme();

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "500" }}>{label}</Text>
      <input
        type="datetime-local"
        value={toInputValue(value)}
        min={minimumDate ? toInputValue(minimumDate) : undefined}
        onChange={(event) => {
          const next = new Date(event.target.value);
          if (!Number.isNaN(next.getTime())) onChange(next);
        }}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 10,
          padding: 10,
          color: colors.text,
          fontSize: 14,
          fontFamily: "inherit",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
    </View>
  );
}
