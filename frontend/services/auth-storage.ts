import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const WEB_PREFIX = "polo_connect:";

function webKey(key: string) {
  return `${WEB_PREFIX}${key}`;
}

function readWebItem(key: string) {
  if (typeof window === "undefined") return null;

  try {
    const nextValue = window.localStorage.getItem(webKey(key));
    if (nextValue !== null) return nextValue;

    const legacyValue = window.sessionStorage.getItem(key);
    if (legacyValue !== null) {
      window.localStorage.setItem(webKey(key), legacyValue);
      window.sessionStorage.removeItem(key);
    }

    return legacyValue;
  } catch {
    return null;
  }
}

function writeWebItem(key: string, value: string | null) {
  if (typeof window === "undefined") return;

  try {
    if (value === null) {
      window.localStorage.removeItem(webKey(key));
      window.sessionStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(webKey(key), value);
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore storage errors. The in-memory auth state remains usable.
  }
}

export async function getAuthStorageItem(key: string) {
  if (Platform.OS === "web") {
    return readWebItem(key);
  }

  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setAuthStorageItem(key: string, value: string | null) {
  if (Platform.OS === "web") {
    writeWebItem(key, value);
    return;
  }

  try {
    if (value === null) {
      await SecureStore.deleteItemAsync(key);
      return;
    }

    await SecureStore.setItemAsync(key, value);
  } catch {
    // Ignore secure storage errors. The in-memory auth state remains usable.
  }
}
