import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { AppColors, useThemeColors } from "@/constants/theme";
import { useLocale } from "@/contexts/LocaleContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import { getNotifications, type NotificationItem, type NotificationKind } from "@/services/api/notifications";

const kindMeta: Record<NotificationKind, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; labelKey: `notifications.kind.${NotificationKind}` }> = {
  match: { icon: "radio-sharp", color: "#0a66c2", bg: "#d8ecff", labelKey: "notifications.kind.match" },
  market: { icon: "pricetag-sharp", color: "#147d6f", bg: "#d5f0eb", labelKey: "notifications.kind.market" },
  tournament: { icon: "trophy-sharp", color: "#b7791f", bg: "#fef3dc", labelKey: "notifications.kind.tournament" },
  message: { icon: "chatbubble-sharp", color: "#7c3aed", bg: "#ede9fe", labelKey: "notifications.kind.message" },
  system: { icon: "notifications-sharp", color: "#6f8499", bg: "#edf6ff", labelKey: "notifications.kind.system" },
  community: { icon: "people-sharp", color: "#5b7693", bg: "#edf6ff", labelKey: "notifications.kind.community" }
};

export default function NotificationsScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { t } = useLocale();
  const { markAllAsRead, setServerUnreadCount } = useNotifications();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const response = await getNotifications({ limit: 50 });
      const readAt = new Date().toISOString();
      setServerUnreadCount(response.unreadCount);
      if (response.unreadCount > 0) {
        void markAllAsRead();
      }
      setItems(response.data.map((item) => ({ ...item, read: true, readAt: item.readAt ?? readAt })));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [markAllAsRead, setServerUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications])
  );

  const handleItemPress = async (item: NotificationItem) => {
    const roomId = typeof item.data.roomId === "string" ? item.data.roomId : null;

    if (item.kind === "message" && roomId) {
      router.push({ pathname: "/group-chat", params: { chatId: roomId } });
      return;
    }

    if (item.kind === "match" && typeof item.data.matchId === "string") {
      router.push({ pathname: "/match-detail", params: { id: item.data.matchId } });
      return;
    }

    if (item.kind === "tournament") {
      router.push("/(tabs)/tournaments");
      return;
    }

    if (item.kind === "market") {
      router.push("/(tabs)/market");
    }
  };

  return (
    <Screen
      eyebrow={t("notifications.eyebrow")}
      title={t("notifications.title")}
      subtitle={t("notifications.allCaughtUp")}
      showBackButton
      onBackPress={() => router.back()}
    >
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>{t("notifications.loading")}</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={46} color={colors.muted} />
          <Text style={styles.emptyTitle}>{t("notifications.emptyTitle")}</Text>
          <Text style={styles.emptyText}>{t("notifications.emptyText")}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((item) => {
            const meta = kindMeta[item.kind];

            return (
              <Pressable key={item.id} style={({ pressed }) => [styles.card, !item.read && styles.cardUnread, pressed && styles.cardPressed]} onPress={() => void handleItemPress(item)}>
                <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon} size={18} color={meta.color} />
                </View>

                <View style={styles.body}>
                  <View style={styles.topRow}>
                    <View style={styles.labelRow}>
                      <Text style={styles.kindLabel}>{t(meta.labelKey)}</Text>
                      {!item.read ? <View style={styles.unreadDot} /> : null}
                    </View>
                    <Text style={styles.time}>{item.timeLabel}</Text>
                  </View>

                  <Text style={[styles.title, !item.read && styles.titleUnread]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.text} numberOfLines={2}>
                    {item.body}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  list: {
    gap: 10,
    paddingBottom: 8
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
    gap: 12
  },
  loadingText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600"
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14
  },
  cardUnread: {
    backgroundColor: colors.surfaceStrong,
    borderColor: "#bfd8f0"
  },
  cardPressed: {
    opacity: 0.88
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  body: {
    flex: 1,
    gap: 6
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700"
  },
  titleUnread: {
    fontWeight: "900"
  },
  time: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
    flexShrink: 0
  },
  kindLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary
  },
  text: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800"
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center"
  }
});
