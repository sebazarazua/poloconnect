import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { MarketProvider } from "@/contexts/MarketContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LocaleProvider>
          <MarketProvider>
            <StatusBar style="dark" backgroundColor="#ffffff" />
            <RootNavigator />
          </MarketProvider>
        </LocaleProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="broadcast" />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="market-publish" />
        <Stack.Screen name="match-detail" />
        <Stack.Screen name="product-detail" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="team-register" />
      </Stack.Protected>
    </Stack>
  );
}
