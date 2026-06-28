import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { savePushToken } from "@/services/api/notifications";

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

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    await savePushToken({ platform: Platform.OS, token: token.data });
    return token.data;
  } catch {
    return null;
  }
}