import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppDrawerProvider } from "@/components/AppDrawer";
import { useTheme } from "@/constants/theme";
import { useLocale } from "@/contexts/LocaleContext";

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
  const { t } = useLocale();
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
          // Custom label: forces a single line and shrinks to fit so long/translated
          // words never wrap and get clipped by the fixed tab bar height (e.g. Samsung
          // devices with larger default system font size).
          tabBarLabel: ({ children, color }) => (
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              allowFontScaling={false}
              maxFontSizeMultiplier={1}
              style={{ fontSize: 11, fontWeight: "600", marginTop: 2, color, textAlign: "center" }}
            >
              {children}
            </Text>
          ),
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
        <Tabs.Screen name="index" options={{ title: t("tabs.home") }} />
        <Tabs.Screen name="tournaments" options={{ title: t("tabs.tournaments") }} />
        <Tabs.Screen name="live" options={{ title: t("tabs.live") }} />
        <Tabs.Screen name="market" options={{ title: t("tabs.market") }} />
        <Tabs.Screen name="community" options={{ title: t("tabs.community") }} />
      </Tabs>
    </AppDrawerProvider>
  );
}
