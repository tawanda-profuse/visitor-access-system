import React, { useEffect, useState } from "react";
import { Modal, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Button } from "./Button";
import { useAppTheme } from "@/theme/ThemeContext";
import { useAppLock } from "@/auth/AppLockContext";
import { useAuth } from "@/auth/AuthContext";

export function LockScreen() {
  const { colors } = useAppTheme();
  const { isLocked, unlock } = useAppLock();
  const { logout } = useAuth();
  const router = useRouter();
  const [attempting, setAttempting] = useState(false);
  const [failed, setFailed] = useState(false);

  const onUnlock = async () => {
    setAttempting(true);
    try {
      const success = await unlock();
      setFailed(!success);
    } catch {
      setFailed(true);
    } finally {
      setAttempting(false);
    }
  };

  useEffect(() => {
    if (isLocked) {
      setFailed(false);
      onUnlock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked]);

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <Modal visible={isLocked} animationType="fade" onRequestClose={() => {}}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          gap: 20,
        }}
      >
        <Ionicons name="lock-closed" size={56} color={colors.primary} />
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>SecureGate Locked</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: "center" }}>
          {failed ? "Authentication failed. Try again to continue." : "Authenticate to continue."}
        </Text>
        <View style={{ width: "100%", gap: 10 }}>
          <Button label="Unlock" onPress={onUnlock} loading={attempting} />
          <Button label="Log Out" variant="ghost" onPress={onLogout} />
        </View>
      </View>
    </Modal>
  );
}
