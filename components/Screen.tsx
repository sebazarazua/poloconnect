import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { PropsWithChildren, ReactNode, useRef } from "react";
import {
  Animated,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppDrawer } from "@/components/AppDrawer";
import { AppColors, useTheme, useThemeColors } from "@/constants/theme";

const topBarHeight = 68;
const topBarGap = 4;

type ScreenProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  style?: ViewStyle;
  showBackButton?: boolean;
  onBackPress?: () => void;
  headerRight?: ReactNode;
}>;

export function Screen({ children, eyebrow, title, subtitle, style, showBackButton, onBackPress, headerRight }: ScreenProps) {
  const colors = useThemeColors();
  const { mode } = useTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { openDrawer } = useAppDrawer();
  const isOnNotifications = pathname === "/notifications";
  const topBarTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const isTopBarVisible = useRef(true);

  const setTopBarVisible = (visible: boolean) => {
    if (isTopBarVisible.current === visible) {
      return;
    }

    isTopBarVisible.current = visible;

    Animated.timing(topBarTranslateY, {
      toValue: visible ? 0 : -(topBarHeight + insets.top + topBarGap),
      duration: 180,
      useNativeDriver: true
    }).start();
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollDelta = currentScrollY - lastScrollY.current;

    if (currentScrollY <= 8) {
      setTopBarVisible(true);
    } else if (scrollDelta > 8) {
      setTopBarVisible(false);
    } else if (scrollDelta < -8) {
      setTopBarVisible(true);
    }

    lastScrollY.current = Math.max(currentScrollY, 0);
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={[styles.statusAreaCover, { height: insets.top + topBarGap }]} />

      <Animated.View
        style={[
          styles.topBar,
          {
            top: insets.top + topBarGap,
            transform: [{ translateY: topBarTranslateY }]
          }
        ]}
      >
        {showBackButton ? (
          <Pressable
            style={styles.profileButton}
            accessibilityLabel="Volver"
            onPress={onBackPress}
          >
            <Ionicons name="chevron-back" size={28} color={colors.primaryDark} />
          </Pressable>
        ) : (
          <Pressable
            style={styles.profileButton}
            accessibilityLabel="Abrir menu de usuario"
            onPress={() => {
              setTopBarVisible(true);
              openDrawer();
            }}
          >
            <Ionicons name="person" size={22} color={colors.primaryDark} />
          </Pressable>
        )}

        <View style={styles.appLogo}>
          <Image
            source={mode === "dark" ? require("@/assets/logo-login.png") : require("@/assets/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Pressable
          style={styles.notificationButton}
          accessibilityLabel="Notificaciones"
          onPress={() => !isOnNotifications && router.push("/notifications")}
          disabled={isOnNotifications}
        >
          <Ionicons
            name="notifications-outline"
            size={23}
            color={isOnNotifications ? colors.muted : colors.primaryDark}
          />
          <View style={styles.notificationDot} />
        </Pressable>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + topBarGap + topBarHeight + 12 },
          style
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.header}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },
  statusAreaCover: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: colors.background
  },
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    height: topBarHeight,
    paddingHorizontal: 20,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  appLogo: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  logoImage: {
    width: 165,
    height: 54
  },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  notificationDot: {
    position: "absolute",
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
    borderWidth: 1,
    borderColor: colors.background
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 108
  },
  header: {
    marginBottom: 18,
    position: "relative"
  },
  headerRight: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 1
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6
  },
  title: {
    color: colors.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8
  }
});
