import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/theme/ThemeContext";

type Tone = "success" | "warning" | "danger" | "neutral";

export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  const { colors } = useAppTheme();

  const color = {
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    neutral: colors.textSecondary,
  }[tone];

  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: `${color}22` }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  text: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
});
