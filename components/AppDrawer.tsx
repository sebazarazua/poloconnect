import { Ionicons } from "@expo/vector-icons";
import { PropsWithChildren, createContext, useContext, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Href, useRouter } from "expo-router";
import { AppColors, useThemeColors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";

type AppDrawerContextValue = {
  openDrawer: () => void;
  setDrawerGestureBlocked: (blocked: boolean) => void;
};

const AppDrawerContext = createContext<AppDrawerContextValue | null>(null);

type DrawerItem = { label: string; icon: keyof typeof Ionicons.glyphMap; route?: Href };

const drawerItems: Array<DrawerItem> = [
  { label: "Mi perfil", icon: "person-outline", route: "/profile" },
  { label: "Favoritos", icon: "heart-outline", route: "/favorites" },
  { label: "Partidos emitidos", icon: "play-circle-outline", route: "/broadcast" },
  { label: "Anota a tu equipo", icon: "checkmark-circle-outline", route: "/team-register" },
  { label: "Comunidad", icon: "people-outline", route: "/(tabs)/community" },
  { label: "Mercado", icon: "pricetag-outline", route: "/(tabs)/market" },
  { label: "Calendario", icon: "calendar-outline", route: "/(tabs)/tournaments" }
];

const drawerFooterItems: Array<DrawerItem> = [
  { label: "Configuración", icon: "settings-outline", route: "/settings" },
  { label: "Centro de ayuda", icon: "help-circle-outline" }
];

export function useAppDrawer() {
  const context = useContext(AppDrawerContext);

  if (!context) {
    return {
      openDrawer: () => undefined,
      setDrawerGestureBlocked: () => undefined
    };
  }

  return context;
}

export function AppDrawerProvider({ children }: PropsWithChildren) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { locale, setLocale } = useLocale();
  const drawerProgress = useRef(new Animated.Value(0)).current;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerWidth = Math.min(width * 0.78, 340);
  const isDrawerOpenRef = useRef(false);
  const drawerWidthRef = useRef(drawerWidth);
  const gestureStartProgress = useRef(0);
  const isDrawerGestureBlockedRef = useRef(false);

  isDrawerOpenRef.current = isDrawerOpen;
  drawerWidthRef.current = drawerWidth;

  const drawerTranslateX = drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0]
  });

  const drawerBackdropOpacity = drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.48]
  });

  const nextLocale = locale === "es-AR" ? "en-US" : "es-AR";
  const currentFlagId = locale === "es-AR" ? "ES" : "GB";

  const openDrawer = () => {
    setIsDrawerOpen(true);

    Animated.timing(drawerProgress, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerProgress, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        setIsDrawerOpen(false);
      }
    });
  };

  const setDrawerGestureBlocked = (blocked: boolean) => {
    isDrawerGestureBlockedRef.current = blocked;
  };

  const shouldHandleDrawerPan = (distanceX: number, distanceY: number) => {
    if (!isDrawerOpenRef.current && isDrawerGestureBlockedRef.current) {
      return false;
    }

    const isHorizontal = Math.abs(distanceX) > Math.abs(distanceY) * 1.15;
    const isOpeningSwipe = !isDrawerOpenRef.current && distanceX > 6;
    const isClosingSwipe = isDrawerOpenRef.current && Math.abs(distanceX) > 6;

    return isHorizontal && (isOpeningSwipe || isClosingSwipe);
  };

  const finishDrawerGesture = (distance: number, velocity: number) => {
    if (
      gestureStartProgress.current === 1 &&
      Math.abs(distance) > drawerWidthRef.current * 0.18
    ) {
      closeDrawer();
      return;
    }

    if (
      gestureStartProgress.current === 0 &&
      (distance > drawerWidthRef.current * 0.32 || velocity > 0.55)
    ) {
      openDrawer();
      return;
    }

    if (gestureStartProgress.current === 1) {
      openDrawer();
    } else {
      closeDrawer();
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        return shouldHandleDrawerPan(gesture.dx, gesture.dy);
      },
      onMoveShouldSetPanResponderCapture: (_, gesture) => {
        return shouldHandleDrawerPan(gesture.dx, gesture.dy);
      },
      onPanResponderGrant: () => {
        gestureStartProgress.current = isDrawerOpenRef.current ? 1 : 0;
        setIsDrawerOpen(true);
      },
      onPanResponderMove: (_, gesture) => {
        const nextProgress =
          gestureStartProgress.current === 1
            ? 1 - Math.min(Math.abs(gesture.dx) / drawerWidthRef.current, 1)
            : Math.max(0, Math.min(gesture.dx / drawerWidthRef.current, 1));
        drawerProgress.setValue(nextProgress);
      },
      onPanResponderRelease: (_, gesture) => {
        finishDrawerGesture(gesture.dx, gesture.vx);
      },
      onPanResponderTerminate: (_, gesture) => {
        finishDrawerGesture(gesture.dx, gesture.vx);
      }
    })
  ).current;

  return (
    <AppDrawerContext.Provider value={{ openDrawer, setDrawerGestureBlocked }}>
      <View collapsable={false} style={styles.host} {...panResponder.panHandlers}>
        <View style={styles.pageLayer}>
          {children}
        </View>

        {isDrawerOpen ? (
          <View style={styles.drawerHost} pointerEvents="box-none">
            <Pressable style={styles.drawerDismissArea} onPress={closeDrawer}>
              <Animated.View
                style={[styles.drawerBackdrop, { opacity: drawerBackdropOpacity }]}
              />
            </Pressable>

            <Animated.View
              style={[
                styles.drawer,
                {
                  width: drawerWidth,
                  paddingTop: insets.top + 22,
                  transform: [{ translateX: drawerTranslateX }]
                }
              ]}
            >
              <View style={styles.drawerFixedHeader}>
                <View style={styles.drawerHeader}>
                  <View style={styles.drawerAvatar}>
                    <Ionicons name="person" size={28} color="#ffffff" />
                  </View>
                  <Pressable
                    style={styles.drawerLanguageButton}
                    onPress={() => setLocale(nextLocale)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      locale === "es-AR" ? "Cambiar a inglés" : "Cambiar a español"
                    }
                  >
                    {currentFlagId === "ES" ? (
                      <View style={styles.flagEspana}>
                        <View style={styles.flagSpainTop} />
                        <View style={styles.flagSpainMiddle} />
                        <View style={styles.flagSpainBottom} />
                      </View>
                    ) : (
                      <View style={styles.flagEngland}>
                        <View style={styles.flagEnglandVertical} />
                        <View style={styles.flagEnglandHorizontal} />
                      </View>
                    )}
                  </Pressable>
                </View>

                <Text style={styles.drawerName}>{user?.firstName ?? "Adrian"}</Text>
                <Text style={styles.drawerHandle}>@{user?.username ?? "polo.connect"}</Text>

                <View style={styles.drawerStats}>
                  <Text style={styles.drawerStatStrong}>12</Text>
                  <Text style={styles.drawerStatText}> clubes</Text>
                  <Text style={styles.drawerStatStrong}> 4</Text>
                  <Text style={styles.drawerStatText}> torneos activos</Text>
                </View>
              </View>

              <ScrollView
                style={styles.drawerScroll}
                contentContainerStyle={styles.drawerScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.drawerContent}>
                  <View>
                    <View style={styles.drawerMenu}>
                      {drawerItems.map((item) => (
                        <Pressable
                          key={item.label}
                          style={styles.drawerItem}
                          onPress={() => {
                            if (item.route) {
                              closeDrawer();
                              router.push(item.route);
                            }
                          }}
                        >
                          <Ionicons name={item.icon} size={25} color="#f7fbff" />
                          <Text style={styles.drawerItemText}>{item.label}</Text>
                        </Pressable>
                      ))}
                    </View>

                    <View style={styles.drawerDivider} />

                    {drawerFooterItems.map((item) => (
                      <Pressable
                        key={item.label}
                        style={styles.drawerFooterItem}
                        onPress={() => {
                          if (item.route) {
                            closeDrawer();
                            router.push(item.route);
                          }
                        }}
                      >
                        <Ionicons name={item.icon} size={21} color="#dbe9f7" />
                        <Text style={styles.drawerFooterText}>{item.label}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={styles.drawerBottom}>
                    <View style={styles.drawerAppInfo}>
                      <Text style={styles.drawerAppTitle}>Polo Connect</Text>
                      <Text style={styles.drawerAppText}>Partidos, clubes y comunidad en un solo lugar.</Text>
                    </View>

                    <Pressable
                      style={styles.drawerSignOutButton}
                      onPress={() => {
                        closeDrawer();
                        signOut();
                      }}
                    >
                      <Ionicons name="log-out-outline" size={21} color="#ff7b7b" />
                      <Text style={styles.drawerSignOutText}>Cerrar sesión</Text>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </Animated.View>
          </View>
        ) : null}
      </View>
    </AppDrawerContext.Provider>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  host: {
    flex: 1,
    backgroundColor: colors.background
  },
  pageLayer: {
    flex: 1,
    backgroundColor: colors.background
  },
  drawerHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40
  },
  drawerDismissArea: {
    ...StyleSheet.absoluteFillObject
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000"
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#06111f",
    paddingHorizontal: 28,
    shadowColor: "#000000",
    shadowOffset: { width: 10, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 18
  },
  drawerFixedHeader: {
    backgroundColor: "#06111f"
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14
  },
  drawerAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: "#17395d",
    alignItems: "center",
    justifyContent: "center"
  },
  drawerLanguageButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#244360",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#ffffff"
  },
  flagEspana: {
    width: 42,
    height: 42,
    overflow: "hidden"
  },
  flagSpainTop: {
    height: 11,
    backgroundColor: "#c60b1e"
  },
  flagSpainMiddle: {
    height: 20,
    backgroundColor: "#ffc400"
  },
  flagSpainBottom: {
    height: 11,
    backgroundColor: "#c60b1e"
  },
  flagEngland: {
    width: 42,
    height: 42,
    backgroundColor: "#ffffff",
    overflow: "hidden"
  },
  flagEnglandVertical: {
    position: "absolute",
    left: 16,
    top: 0,
    width: 10,
    height: 42,
    backgroundColor: "#cf142b"
  },
  flagEnglandHorizontal: {
    position: "absolute",
    top: 16,
    left: 0,
    width: 42,
    height: 10,
    backgroundColor: "#cf142b"
  },
  drawerName: {
    color: "#ffffff",
    fontSize: 25,
    fontWeight: "900"
  },
  drawerHandle: {
    color: "#8ea2b5",
    fontSize: 16,
    marginTop: 3
  },
  drawerStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 22
  },
  drawerStatStrong: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900"
  },
  drawerStatText: {
    color: "#9cafc1",
    fontSize: 15,
    fontWeight: "600"
  },
  drawerMenu: {
    gap: 6
  },
  drawerScroll: {
    flex: 1
  },
  drawerScrollContent: {
    flexGrow: 1,
    paddingBottom: 26
  },
  drawerContent: {
    flexGrow: 1,
    justifyContent: "space-between"
  },
  drawerItem: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 24
  },
  drawerItemText: {
    color: "#f7fbff",
    fontSize: 22,
    fontWeight: "900"
  },
  drawerDivider: {
    height: 1,
    backgroundColor: "#1d344d",
    marginVertical: 22
  },
  drawerFooterItem: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 20
  },
  drawerFooterText: {
    color: "#dbe9f7",
    fontSize: 16,
    fontWeight: "700"
  },
  drawerAppInfo: {
    paddingTop: 18,
    paddingBottom: 8
  },
  drawerBottom: {
    paddingTop: 18
  },
  drawerAppTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900"
  },
  drawerAppText: {
    color: "#8ea2b5",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5
  },
  drawerSignOutButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#2e1820"
  },
  drawerSignOutText: {
    color: "#ff7b7b",
    fontSize: 17,
    fontWeight: "800"
  }
});
