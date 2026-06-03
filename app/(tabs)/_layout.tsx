import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { AppDrawerProvider } from "@/components/AppDrawer";

const BLUE = "#0a66c2";
const MUTED = "#8aa3bd";

type IconName = keyof typeof Ionicons.glyphMap;

const icons: Record<string, { focused: IconName; default: IconName }> = {
  index: { focused: "home-sharp", default: "home-outline" },
  live: { focused: "radio-sharp", default: "radio-outline" },
  tournaments: { focused: "trophy-sharp", default: "trophy-outline" },
  market: { focused: "pricetag-sharp", default: "pricetag-outline" },
  community: { focused: "people-sharp", default: "people-outline" }
};

export default function TabLayout() {
  return (
    <AppDrawerProvider>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: BLUE,
          tabBarInactiveTintColor: MUTED,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            marginTop: 2
          },
          tabBarStyle: {
            height: Platform.OS === "ios" ? 86 : 72,
            paddingTop: 8,
            paddingBottom: Platform.OS === "ios" ? 22 : 10,
            backgroundColor: "rgba(255, 255, 255, 0.96)",
            borderTopColor: "#dce8f3",
            shadowColor: "#0b477f",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08,
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
