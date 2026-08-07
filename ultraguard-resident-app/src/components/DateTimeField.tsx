import React from "react";
import { Platform, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAppTheme } from "@/theme/ThemeContext";

type Props = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
};

export function DateTimeField({ label, value, onChange, minimumDate }: Props) {
  const { colors, resolvedScheme } = useAppTheme();

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "500" }}>{label}</Text>
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 10,
          padding: 8,
          alignItems: "flex-start",
        }}
      >
        <DateTimePicker
          value={value}
          mode="datetime"
          display={Platform.OS === "ios" ? "compact" : "default"}
          themeVariant={resolvedScheme}
          minimumDate={minimumDate}
          onChange={(_event, selected) => selected && onChange(selected)}
        />
      </View>
    </View>
  );
}
