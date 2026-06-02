import { Ionicons } from "@expo/vector-icons";
import { PropsWithChildren, useRef } from "react";
import {
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

const topBarHeight = 68;

type ScreenProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}>;

export function Screen({ children, eyebrow, title, subtitle, style }: ScreenProps) {
  const topBarTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const isTopBarVisible = useRef(true);

  const setTopBarVisible = (visible: boolean) => {
    if (isTopBarVisible.current === visible) {
      return;
    }

    isTopBarVisible.current = visible;

    Animated.timing(topBarTranslateY, {
      toValue: visible ? 0 : -topBarHeight,
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
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Animated.View
        style={[styles.topBar, { transform: [{ translateY: topBarTranslateY }] }]}
      >
        <Pressable style={styles.profileButton} accessibilityLabel="Perfil del usuario">
          <Ionicons name="person" size={22} color={colors.primaryDark} />
        </Pressable>

        <View style={styles.appLogo}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>PC</Text>
          </View>
          <Text style={styles.logoText}>Polo Connect</Text>
        </View>

        <Pressable style={styles.notificationButton} accessibilityLabel="Notificaciones">
          <Ionicons name="notifications-outline" size={23} color={colors.primaryDark} />
          <View style={styles.notificationDot} />
        </Pressable>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, style]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.header}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    height: topBarHeight,
    paddingHorizontal: 20,
    backgroundColor: "rgba(255, 255, 255, 0.97)",
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
    justifyContent: "center",
    flexDirection: "row",
    gap: 8
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  logoMarkText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900"
  },
  logoText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
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
    borderColor: "#ffffff"
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: topBarHeight + 12,
    paddingBottom: 108
  },
  header: {
    marginBottom: 18
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 8
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
