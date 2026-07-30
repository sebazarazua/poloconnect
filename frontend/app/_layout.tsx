import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { MarketProvider } from "@/contexts/MarketContext";
import { CommunityProvider } from "@/contexts/CommunityContext";
import { ThemeProvider, useTheme } from "@/constants/theme";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <LocaleProvider>
            <MarketProvider>
              <CommunityProvider>
                <ThemedStatusBar />
                <PushTokenRegistrar />
                <RootNavigator />
              </CommunityProvider>
            </MarketProvider>
          </LocaleProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

function ThemedStatusBar() {
  const { colors, mode } = useTheme();

  return (
    <StatusBar
      style={mode === "dark" ? "light" : "dark"}
      backgroundColor={colors.background}
    />
  );
}

function PushTokenRegistrar() {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const isExpoGo = Constants.executionEnvironment === "storeClient" || Constants.appOwnership === "expo";

    // On Android Expo Go, remote push token APIs are not supported.
    if (Platform.OS === "android" && isExpoGo) {
      return;
    }

    if (!isAuthenticated || !user) {
      return;
    }

    void import("@/services/push-notifications").then((module) => module.registerDevicePushToken());
  }, [isAuthenticated, user?.id]);

  return null;
}

function RootNavigator() {
  const { isAuthenticated } = useAuth();
  const initialRouteName = isAuthenticated ? "(tabs)" : "login";

  return (
    <Stack initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="admin-login" />
      </Stack.Protected>

      <Stack.Screen name="admin-panel" />
      <Stack.Screen name="horse-auctions-admin" />

      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="broadcast" />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="market-my-posts" />
        <Stack.Screen name="market-publish" />
        <Stack.Screen name="match-detail" />
        <Stack.Screen name="horse-auctions" />
        <Stack.Screen name="horse-auction-detail" />
        <Stack.Screen name="product-detail" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="help-center" />
        <Stack.Screen name="team-register" />
        <Stack.Screen name="group-chat" />
      </Stack.Protected>

      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
