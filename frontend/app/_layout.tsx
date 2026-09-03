import { Redirect, Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import Constants from "expo-constants";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LocaleProvider, useLocale } from "@/contexts/LocaleContext";
import { MarketProvider } from "@/contexts/MarketContext";
import { CommunityProvider } from "@/contexts/CommunityContext";
import { ThemeProvider, useTheme } from "@/constants/theme";
import { getMySettings } from "@/services/api/settings";
import { isApiUrlConfigured } from "@/services/api/client";
import { ErrorBoundary } from "@/components/ErrorBoundary";

console.info("startup/app");

// Keep the native splash visible until auth hydration resolves, instead of letting
// expo-router auto-hide it as soon as the root view mounts (which can reveal a blank frame).
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const allowWebDev = process.env.EXPO_PUBLIC_ENABLE_WEB_DEV === "true";

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SafeAreaProvider>
          <AuthProvider>
            <LocaleProvider>
              <MarketProvider>
                <CommunityProvider>
                  <ThemedStatusBar />
                  <UserPreferencesHydrator />
                  <PushTokenRegistrar />
                  <PushNotificationNavigator />
                  <RootNavigator allowWebDev={allowWebDev} />
                </CommunityProvider>
              </MarketProvider>
            </LocaleProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </ErrorBoundary>
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

    void import("@/services/push-notifications")
      .then((module) => module.registerDevicePushToken())
      .then((token) => {
        console.info(`startup/push registration success: ${Boolean(token)}`);
      })
      .catch(() => {
        console.info("startup/push registration failure");
      });
  }, [isAuthenticated, user?.id]);

  return null;
}

function PushNotificationNavigator() {
  const { authReady, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authReady || !isAuthenticated) {
      return;
    }

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void import("@/services/push-notifications")
      .then((module) => module.registerNotificationResponseHandler((target) => {
        if (!cancelled) {
          router.push(target);
        }
      }))
      .then((dispose) => {
        if (cancelled) {
          dispose();
          return;
        }

        cleanup = dispose;
      })
      .catch(() => {
        console.info("startup/push response handler failure");
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [authReady, isAuthenticated, router]);

  return null;
}

const WEB_ADMIN_PATHS = ["/admin-login", "/admin-panel", "/horse-auctions-admin"];

function RootNavigator({ allowWebDev }: { allowWebDev: boolean }) {
  const { isAuthenticated, authReady, signOut } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (authReady) {
      console.info("startup/router-ready");
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [authReady]);

  if (!authReady) {
    return null;
  }

  if (!isApiUrlConfigured) {
    return <StartupConfigurationError onSignOut={() => void signOut()} />;
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
        <Stack.Screen name="watch-live" />
      </Stack.Protected>

      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
      </Stack.Protected>

      <Stack.Screen name="admin-login" />
      <Stack.Screen name="admin-panel" />
      <Stack.Screen name="horse-auctions-admin" />
    </Stack>
  );
}

function StartupConfigurationError({ onSignOut }: { onSignOut: () => void }) {
  return (
    <View style={styles.startupErrorContainer}>
      <Text style={styles.startupErrorTitle}>ConfiguraciÃ³n incompleta</Text>
      <Text style={styles.startupErrorMessage}>
        Falta configurar la URL de API para esta versiÃ³n de la app.
      </Text>
      <Pressable style={styles.startupErrorButton} onPress={onSignOut}>
        <Text style={styles.startupErrorButtonText}>Cerrar sesiÃ³n local</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  startupErrorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    padding: 24,
    gap: 12
  },
  startupErrorTitle: {
    color: "#1f3b73",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center"
  },
  startupErrorMessage: {
    color: "#4b5563",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center"
  },
  startupErrorButton: {
    borderRadius: 8,
    backgroundColor: "#1f3b73",
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  startupErrorButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700"
  }
});
