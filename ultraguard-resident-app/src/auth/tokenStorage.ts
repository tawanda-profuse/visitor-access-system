import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * expo-secure-store has no web implementation at all (unsupported on web per Expo's
 * own docs — calling it throws "setValueWithKeyAsync is not a function"). Falling back
 * to AsyncStorage on web is strictly a convenience for the `expo start --web` preview
 * (web isn't a shipping target per the SRS — iOS/Android only); real native builds
 * always take the encrypted SecureStore path below.
 */
export async function getToken(key: string): Promise<string | null> {
  return Platform.OS === "web" ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
}

export async function setToken(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

export async function deleteToken(key: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}
