import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useAppTheme } from "@/theme/ThemeContext";
import { AuthProvider } from "@/auth/AuthContext";
import { AppLockProvider } from "@/auth/AppLockContext";
import { LockScreen } from "@/components/LockScreen";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppLockProvider>
          <RootNavigator />
        </AppLockProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { colors } = useAppTheme();

  return (
    <>
      <StatusBar style={colors.statusBar} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="guard" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="code/[id]" options={{ title: "Visitor Pass" }} />
      </Stack>
      <LockScreen />
    </>
  );
}
