import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getAuthStorageItem, setAuthStorageItem } from "@/services/auth-storage";
import { savePushToken, unregisterPushToken } from "@/services/api/notifications";

const PUSH_TOKEN_STORAGE_KEY = "pc_expo_push_token";
let lastHandledNotificationId: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

export async function registerDevicePushToken() {
  if (Platform.OS === "web" || !Device.isDevice) {
    return null;
  }

  // Expo Go on Android does not support remote push token registration.
  const isExpoGo = Constants.executionEnvironment === "storeClient" || Constants.appOwnership === "expo";
  if (Platform.OS === "android" && isExpoGo) {
    return null;
  }

  const existingPermissions = (await Notifications.getPermissionsAsync()) as { status?: string; granted?: boolean };
  let finalGranted = existingPermissions.granted ?? existingPermissions.status === "granted";

  if (!finalGranted) {
    const requestedPermissions = (await Notifications.requestPermissionsAsync()) as { status?: string; granted?: boolean };
    finalGranted = requestedPermissions.granted ?? requestedPermissions.status === "granted";
  }

  if (!finalGranted) {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1f3b73"
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    await savePushToken({ platform: Platform.OS, token: token.data });
    await setAuthStorageItem(PUSH_TOKEN_STORAGE_KEY, token.data);
    return token.data;
  } catch {
    return null;
  }
}

export async function unregisterCurrentDevicePushToken() {
  if (Platform.OS === "web") {
    return;
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
  if (Platform.OS === "web") {
    return () => undefined;
  }

  const handleResponse = (response: Notifications.NotificationResponse | null) => {
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
