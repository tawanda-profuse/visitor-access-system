import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { registerPushToken } from "@/api/resident";

// Remote push notifications were removed from Expo Go on Android as of SDK 53 — calling
// the notification APIs there throws instead of just no-opping, so the whole flow must
// be skipped in Expo Go and only run in a development build / standalone app.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Registers this device for push notifications and sends the Expo push token to the
 * backend (POST /api/notifications/register-device). The backend send-side is a
 * placeholder (see ultraguard-admin-backend/src/lib/push.ts) — no push provider send
 * flow has been wired up end-to-end yet, but the registration plumbing is complete.
 *
 * Real remote push (as opposed to local notifications) requires a development build,
 * not Expo Go, as of Expo SDK 53+.
 */
export function usePushRegistration(token: string | null) {
  useEffect(() => {
    if (!token || isExpoGo) return;

    (async () => {
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
          });
        }

        if (!Device.isDevice) return; // push tokens aren't meaningful on simulators

        const { status } = await Notifications.getPermissionsAsync();
        let finalStatus = status;
        if (status !== "granted") {
          const requested = await Notifications.requestPermissionsAsync();
          finalStatus = requested.status;
        }
        if (finalStatus !== "granted") return;

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const pushToken = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );

        await registerPushToken(token, pushToken.data);
      } catch (error) {
        console.warn("[push] registration skipped:", error);
      }
    })();
  }, [token]);
}
