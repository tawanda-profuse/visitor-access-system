import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useAppTheme } from "@/theme/ThemeContext";

type Props = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
};

function formatDateTime(date: Date) {
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DateTimeField({ label, value, onChange, minimumDate }: Props) {
  const { colors, resolvedScheme } = useAppTheme();

  // Android's DateTimePicker has no true inline widget for display="default" — mounting
  // it as a regular component imperatively pops a dialog as a side effect, and it does
  // so again on every remount (switching tabs/type, or a theme change re-rendering a
  // backgrounded tab screen). The library's own recommended fix is to drive it entirely
  // through the imperative DateTimePickerAndroid API, opening a date dialog and then
  // chaining into a time dialog, only in response to a tap.
  if (Platform.OS === "android") {
    const openPicker = () => {
      DateTimePickerAndroid.open({
        value,
        mode: "date",
        minimumDate,
        onChange: (_event, selectedDate) => {
          if (!selectedDate) return;
          DateTimePickerAndroid.open({
            value: selectedDate,
            mode: "time",
            onChange: (_timeEvent, selectedTime) => {
              if (selectedTime) onChange(selectedTime);
            },
          });
        },
      });
    };

    return (
      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "500" }}>{label}</Text>
        <Pressable
          onPress={openPicker}
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 10,
            paddingVertical: 12,
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ color: colors.text }}>{formatDateTime(value)}</Text>
        </Pressable>
      </View>
    );
  }

  // iOS's "compact" display is a small always-visible pill that opens a popover on tap —
  // safe to mount inline, unlike Android's "default" display.
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
          display="compact"
          themeVariant={resolvedScheme}
          minimumDate={minimumDate}
          onChange={(_event, selected) => selected && onChange(selected)}
        />
      </View>
    </View>
  );
}
