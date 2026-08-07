/**
 * Placeholder push notification dispatcher.
 *
 * The mobile app registers an Expo push token via POST /api/notifications/register-device
 * and this module is where a real send-to-Expo-push-service (or FCM/APNs direct) call
 * would go. For the MVP this just logs so the rest of the system (entry logs, panic
 * alerts) can call it without blocking on a push provider decision.
 */
export async function sendPushNotification(params: {
  pushToken: string | null | undefined;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  if (!params.pushToken) {
    console.log(`[PUSH:PLACEHOLDER] No push token on file — skipping "${params.title}"`);
    return;
  }
  console.log(
    `[PUSH:PLACEHOLDER] -> ${params.pushToken}: ${params.title} - ${params.body}`,
    params.data ?? {},
  );
}
