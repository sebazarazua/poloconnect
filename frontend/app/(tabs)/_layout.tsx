import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppDrawerProvider } from "@/components/AppDrawer";
import { useTheme } from "@/constants/theme";

type IconName = keyof typeof Ionicons.glyphMap;

const icons: Record<string, { focused: IconName; default: IconName }> = {
  index: { focused: "home-sharp", default: "home-outline" },
  live: { focused: "radio-sharp", default: "radio-outline" },
  tournaments: { focused: "trophy-sharp", default: "trophy-outline" },
  market: { focused: "pricetag-sharp", default: "pricetag-outline" },
  community: { focused: "people-sharp", default: "people-outline" }
};

export default function TabLayout() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarBottomPadding = Platform.OS === "ios" ? 22 : Math.max(insets.bottom, 28);
  const tabBarHeight = Platform.OS === "ios" ? 86 : 62 + tabBarBottomPadding;

  return (
    <AppDrawerProvider>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            marginTop: 2
          },
          tabBarStyle: {
            height: tabBarHeight,
            paddingTop: 8,
            paddingBottom: tabBarBottomPadding,
            backgroundColor: mode === "dark" ? "rgba(7, 18, 33, 0.96)" : "rgba(255, 255, 255, 0.96)",
            borderTopColor: colors.border,
            shadowColor: mode === "dark" ? "#000000" : "#0b477f",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: mode === "dark" ? 0.22 : 0.08,
            shadowRadius: 16,
            elevation: 10
          },
          tabBarIcon: ({ color, focused, size }) => {
            const icon = icons[route.name] ?? icons.index;
            return (
              <Ionicons
                name={focused ? icon.focused : icon.default}
                color={color}
                size={size + 1}
              />
            );
          }
        })}
      >
        <Tabs.Screen name="index" options={{ title: "Inicio" }} />
        <Tabs.Screen name="tournaments" options={{ title: "Torneos" }} />
        <Tabs.Screen name="live" options={{ title: "En vivo" }} />
        <Tabs.Screen name="market" options={{ title: "Mercado" }} />
        <Tabs.Screen name="community" options={{ title: "Comunidad" }} />
      </Tabs>
    </AppDrawerProvider>
  );
}
