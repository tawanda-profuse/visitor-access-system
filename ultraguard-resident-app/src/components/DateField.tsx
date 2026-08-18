import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useAppTheme } from "@/theme/ThemeContext";

type Props = {
  label: string;
  value: Date | null;
  placeholder?: string;
  onChange: (date: Date | null) => void;
  minimumDate?: Date;
  maximumDate?: Date;
};

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Date-only counterpart to DateTimeField, for filters where a time-of-day component
// would be visual noise (e.g. "from this day" / "to this day" range boundaries).
export function DateField({ label, value, placeholder = "Any", onChange, minimumDate, maximumDate }: Props) {
  const { colors, resolvedScheme } = useAppTheme();

  const openAndroidPicker = () => {
    DateTimePickerAndroid.open({
      value: value ?? new Date(),
      mode: "date",
      minimumDate,
      maximumDate,
      onChange: (_event, selectedDate) => {
        if (selectedDate) onChange(selectedDate);
      },
    });
  };

  return (
    <View style={{ gap: 6, flex: 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "500" }}>{label}</Text>
        {value ? (
          <Pressable onPress={() => onChange(null)}>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      {Platform.OS === "android" ? (
        <Pressable
          onPress={openAndroidPicker}
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 10,
            paddingVertical: 12,
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ color: value ? colors.text : colors.textSecondary }}>
            {value ? formatDate(value) : placeholder}
          </Text>
        </Pressable>
      ) : (
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
            value={value ?? new Date()}
            mode="date"
            display="compact"
            themeVariant={resolvedScheme}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(_event, selected) => selected && onChange(selected)}
          />
        </View>
      )}
    </View>
  );
}
