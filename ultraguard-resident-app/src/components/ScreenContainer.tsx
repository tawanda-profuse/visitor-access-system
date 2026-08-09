import React from "react";
import { RefreshControlProps, ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/theme/ThemeContext";

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  refreshControl?: React.ReactElement<RefreshControlProps>;
};

export function ScreenContainer({ children, scroll = true, style, refreshControl }: Props) {
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.body, style]} refreshControl={refreshControl}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.body, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  body: { flexGrow: 1, padding: 20, gap: 16 },
});
