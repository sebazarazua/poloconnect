import Constants from "expo-constants";
import { Platform } from "react-native";

export async function getAndroidGoogleAccessToken(): Promise<string | null> {
  const isExpoGo = Constants.executionEnvironment === "storeClient" || Constants.appOwnership === "expo";
  if (Platform.OS !== "android" || isExpoGo) {
    throw new Error("Google Sign-In Android requiere una development build o APK propia.");
  }

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    throw new Error("Falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.");
  }

  // Never evaluate the Android native module on iOS, web or Expo Go.
  const { GoogleSignin, isSuccessResponse } = await import("@react-native-google-signin/google-signin");
  GoogleSignin.configure({ webClientId, scopes: ["openid", "profile", "email"] });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  // Preserve the existing account-picker behavior when logging in again.
  await GoogleSignin.signOut();
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return null;

  const { accessToken } = await GoogleSignin.getTokens();
  if (!accessToken) throw new Error("Google no devolvió un access token.");
  return accessToken;
}
