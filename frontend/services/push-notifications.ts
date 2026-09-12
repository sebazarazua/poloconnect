import Constants from "expo-constants";
import * as Device from "expo-device";
import type { DevicePushToken, NotificationResponse } from "expo-notifications";
import { AppState, Platform } from "react-native";
import { getAuthStorageItem, setAuthStorageItem } from "@/services/auth-storage";
import { savePushToken, unregisterPushToken } from "@/services/api/notifications";

const PUSH_TOKEN_STORAGE_KEY = "pc_expo_push_token";
let lastHandledNotificationId: string | null = null;
let stopAndroidRegistration: (() => void) | undefined;
let androidRegistrationPending: Promise<unknown> | undefined;

const isExpoGo = Constants.executionEnvironment === "storeClient" || Constants.appOwnership === "expo";
const supportsNotifications = Platform.OS !== "web" && !(Platform.OS === "android" && isExpoGo);
// Guard evaluation of the module itself, including logout and response listeners.
// A registration-only guard is too late: Expo Go warns during module import.
const Notifications: typeof import("expo-notifications") | null = supportsNotifications
  ? require("expo-notifications")
  : null;

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

export async function registerDevicePushToken(isCurrent: () => boolean = () => true, devicePushToken?: DevicePushToken) {
  if (!Notifications || !Device.isDevice || !isCurrent()) {
    return null;
  }

  let stage = "permissions";
  try {
    // Android 13+ needs a channel before requesting notification permission.
    if (Platform.OS === "android") {
      stage = "android-channel";
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#1f3b73"
      });
    }

    stage = "permissions";
    const existingPermissions = (await Notifications.getPermissionsAsync()) as { status?: string; granted?: boolean };
    let finalGranted = existingPermissions.granted ?? existingPermissions.status === "granted";

    if (!finalGranted) {
      const requestedPermissions = (await Notifications.requestPermissionsAsync()) as { status?: string; granted?: boolean };
      finalGranted = requestedPermissions.granted ?? requestedPermissions.status === "granted";
    }

    if (!finalGranted) {
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      throw new Error("Missing EAS projectId");
    }

    stage = "expo-token";
    const token = await Notifications.getExpoPushTokenAsync({ projectId, ...(devicePushToken ? { devicePushToken } : {}) });
    if (!isCurrent()) return null;
    stage = "backend-token";
    await savePushToken({ platform: Platform.OS, token: token.data });
    await setAuthStorageItem(PUSH_TOKEN_STORAGE_KEY, token.data);
    return token.data;
  } catch (error) {
    // Keep startup independent from push, but make FCM/permission/API failures
    // diagnosable without logging push tokens or session credentials.
    const code = error && typeof error === "object" && "code" in error ? error.code : "unknown";
    console.warn(`push/${Platform.OS}/${stage} failed (${String(code)})`);
    return null;
  }
}

export function startAndroidPushTokenRegistration() {
  if (Platform.OS !== "android" || !Notifications || !Device.isDevice) return () => undefined;

  let active = true;
  let pending = false;
  let rerun = false;
  let rotatedToken: DevicePushToken | undefined;
  const register = async () => {
    if (!active) return;
    if (pending) {
      rerun = true;
      return;
    }
    pending = true;
    try {
      const token = rotatedToken;
      rotatedToken = undefined;
      androidRegistrationPending = registerDevicePushToken(() => active, token);
      await androidRegistrationPending;
    } finally {
      pending = false;
      if (active && rerun) {
        rerun = false;
        void register();
      }
    }
  };

  // Retry after returning from settings/offline, and convert rotated native FCM
  // tokens back to Expo tokens before saving them in the existing backend.
  const appState = AppState.addEventListener("change", (state) => {
    if (state === "active") void register();
  });
  const pushToken = Notifications.addPushTokenListener((token) => {
    // Passing this token avoids recursively asking FCM for a token in its own listener.
    rotatedToken = token;
    void register();
  });
  void register();
  const cleanup = () => {
    active = false;
    appState.remove();
    pushToken.remove();
  };
  stopAndroidRegistration = cleanup;
  return cleanup;
}

export async function unregisterCurrentDevicePushToken() {
  if (Platform.OS === "web") {
    return;
  }

  if (Platform.OS === "android") {
    stopAndroidRegistration?.();
    // If a backend save was already sent, finish it before disabling the token.
    // Logout must not race with registration and leave a token enabled.
    await androidRegistrationPending;
  }

  const token = await getAuthStorageItem(PUSH_TOKEN_STORAGE_KEY);
  if (!token) {
    return;
  }

  try {
    await unregisterPushToken(token);
  } finally {
    await setAuthStorageItem(PUSH_TOKEN_STORAGE_KEY, null);
  }
}

function getNotificationNavigationTarget(data: Record<string, unknown>) {
  const roomId = typeof data.roomId === "string" ? data.roomId : null;
  if ((data.kind === "message" || data.kind === "community") && roomId) {
    return { pathname: "/group-chat", params: { chatId: roomId } };
  }

  const matchId = typeof data.matchId === "string" ? data.matchId : null;
  if (data.kind === "match" && matchId) {
    return { pathname: "/match-detail", params: { id: matchId } };
  }

  if (data.kind === "tournament" || typeof data.tournamentId === "string") {
    return "/(tabs)/tournaments";
  }

  if (data.kind === "market" || typeof data.productId === "string") {
    return "/(tabs)/market";
  }

  const route = typeof data.route === "string" ? data.route : null;
  return route ?? "/notifications";
}

export async function registerNotificationResponseHandler(navigate: (target: any) => void) {
  if (!Notifications) {
    return () => undefined;
  }

  const handleResponse = (response: NotificationResponse | null) => {
    const notificationId = response?.notification.request.identifier;
    if (notificationId && notificationId === lastHandledNotificationId) {
      return;
    }

    const data = response?.notification.request.content.data;
    if (!data || typeof data !== "object") {
      return;
    }

    lastHandledNotificationId = notificationId ?? null;
    navigate(getNotificationNavigationTarget(data as Record<string, unknown>));
  };

  const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
  const lastResponse = await Notifications.getLastNotificationResponseAsync().catch(() => null);
  handleResponse(lastResponse);

  return () => {
    subscription.remove();
  };
}
