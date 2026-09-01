import { Redirect, Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LocaleProvider, useLocale } from "@/contexts/LocaleContext";
import { MarketProvider } from "@/contexts/MarketContext";
import { CommunityProvider } from "@/contexts/CommunityContext";
import { ThemeProvider, useTheme } from "@/constants/theme";
import { getMySettings } from "@/services/api/settings";

export default function RootLayout() {
  const allowWebDev = process.env.EXPO_PUBLIC_ENABLE_WEB_DEV === "true";

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <LocaleProvider>
            <MarketProvider>
              <CommunityProvider>
                <ThemedStatusBar />
                <UserPreferencesHydrator />
                <PushTokenRegistrar />
                <RootNavigator allowWebDev={allowWebDev} />
              </CommunityProvider>
            </MarketProvider>
          </LocaleProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

function UserPreferencesHydrator() {
  const { isAuthenticated, user } = useAuth();
  const { setMode } = useTheme();
  const { setLocale } = useLocale();
  const hydratedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      hydratedUserId.current = null;
      return;
    }

    if (hydratedUserId.current === user.id) {
      return;
    }

    let cancelled = false;

    void getMySettings()
      .then((settings) => {
        if (cancelled) {
          return;
        }

        if (settings.theme === "dark" || settings.theme === "light") {
          setMode(settings.theme);
        }

        if (settings.locale === "es-AR" || settings.locale === "en-US") {
          setLocale(settings.locale);
        }

        hydratedUserId.current = user.id;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, setLocale, setMode, user?.id]);

  return null;
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

const WEB_ADMIN_PATHS = ["/admin-login", "/admin-panel", "/horse-auctions-admin"];

function RootNavigator({ allowWebDev }: { allowWebDev: boolean }) {
  const { isAuthenticated, authReady } = useAuth();
  const pathname = usePathname();

  if (!authReady) {
    return null;
  }

  // Web production builds are the admin console only: they get their own stack so
  // the app shell ("(tabs)") is never used as the anchor route and can't flash
  // behind the admin screens.
  if (Platform.OS === "web" && !allowWebDev) {
    if (!WEB_ADMIN_PATHS.includes(pathname)) {
      return <Redirect href="/admin-login" />;
    }

    return (
      <Stack initialRouteName="admin-login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="admin-login" />
        <Stack.Screen name="admin-panel" />
        <Stack.Screen name="horse-auctions-admin" />
      </Stack>
    );
  }

  return (
    <Stack initialRouteName={isAuthenticated ? "(tabs)" : "login"} screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>

      <Stack.Screen name="admin-login" />
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
