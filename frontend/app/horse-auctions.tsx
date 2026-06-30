import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { AppColors, useThemeColors } from "@/constants/theme";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";
import { HorseAuctionEvent, listHorseAuctions, resolveAuctionImageUrl } from "@/services/api/horse-auctions";

function formatMoney(cents?: number | null) {
  if (!cents || cents <= 0) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(cents / 100);
}

export default function HorseAuctionsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t, locale } = useLocale();
  const router = useRouter();
  const { user } = useAuth();
  const [events, setEvents] = useState<HorseAuctionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      setError(null);
      const data = await listHorseAuctions();
      setEvents(data);
    } catch {
      setError(t("auctions.loadError"));
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <Screen
      eyebrow={t("auctions.eyebrow")}
      title={t("auctions.title")}
      subtitle={t("auctions.subtitle")}
      showBackButton
      onBackPress={() => router.back()}
    >
      {user?.roles?.some((role) => role === "admin" || role === "superadmin") ? (
        <Pressable style={styles.manageButton} onPress={() => router.push("/horse-auctions-admin" as never)}>
          <Ionicons name="create-outline" size={14} color={colors.primaryDark} />
          <Text style={styles.manageButtonText}>{t("auctions.manage")}</Text>
        </Pressable>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? <Text style={styles.infoText}>{t("common.loading")}</Text> : null}

        {!loading && events.length === 0 ? (
          <Card>
            <Text style={styles.emptyTitle}>{t("auctions.emptyTitle")}</Text>
            <Text style={styles.emptyText}>{t("auctions.emptyText")}</Text>
          </Card>
        ) : null}

        {events.map((event) => {
          const startingPrice = formatMoney(event.startingPriceCents);
          const eventDate = new Date(event.eventDate).toLocaleDateString(locale, {
            day: "2-digit",
            month: "long",
            year: "numeric"
          });

          return (
            <Pressable
              key={event.id}
              style={({ pressed }) => [styles.eventCard, pressed ? styles.eventCardPressed : null]}
              onPress={() =>
                router.push({
                  pathname: "/horse-auction-detail",
                  params: { id: event.id }
                })
              }
            >
              {event.imageUrl ? (
                <Image source={{ uri: resolveAuctionImageUrl(event.imageUrl) }} style={styles.eventImage} resizeMode="cover" />
              ) : (
                <View style={styles.eventImagePlaceholder}>
                  <Ionicons name="image-outline" size={20} color={colors.muted} />
                  <Text style={styles.eventImagePlaceholderText}>{t("auctions.noEventImage")}</Text>
                </View>
              )}

              <View style={styles.eventTop}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{t("auctions.event")}</Text>
                </View>
                <Text style={styles.eventDate}>{eventDate}</Text>
              </View>

              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventMeta}>{event.organizer}</Text>
              <Text style={styles.eventMeta}>{`${event.venue} - ${event.city}`}</Text>

              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>{t("auctions.horsesCount", { count: event.horseCount })}</Text>
                {startingPrice ? <Text style={styles.statsValue}>{t("auctions.fromPrice", { price: startingPrice })}</Text> : null}
              </View>

              <View style={styles.footerRow}>
                <Ionicons name="call-outline" size={16} color={colors.primary} />
                <Text style={styles.contactText}>{event.contactPhone ?? event.contactEmail ?? t("auctions.contactTbd")}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    manageButton: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 12
    },
    manageButtonText: {
      color: colors.primaryDark,
      fontWeight: "800",
      fontSize: 12
    },
    infoText: {
      color: colors.muted,
      fontSize: 14,
      marginBottom: 12
    },
    errorText: {
      color: colors.danger,
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 12
    },
    eventCard: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 20,
      overflow: "hidden",
      marginBottom: 12
    },
    eventCardPressed: {
      backgroundColor: colors.surfaceStrong,
      opacity: 0.9
    },
    eventImage: {
      width: "100%",
      height: 170
    },
    eventImagePlaceholder: {
      height: 120,
      backgroundColor: colors.surfaceStrong,
      alignItems: "center",
      justifyContent: "center",
      gap: 6
    },
    eventImagePlaceholderText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700"
    },
    eventTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
      paddingHorizontal: 14,
      paddingTop: 14
    },
    tag: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colors.primarySoft
    },
    tagText: {
      color: colors.primaryDark,
      fontWeight: "800",
      fontSize: 11
    },
    eventDate: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700"
    },
    eventTitle: {
      color: colors.text,
      fontSize: 19,
      fontWeight: "900",
      marginBottom: 6,
      paddingHorizontal: 14
    },
    eventMeta: {
      color: colors.muted,
      fontSize: 13,
      marginBottom: 2,
      paddingHorizontal: 14
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 10,
      marginBottom: 10,
      paddingHorizontal: 14
    },
    statsLabel: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 13
    },
    statsValue: {
      color: colors.success,
      fontWeight: "800",
      fontSize: 13
    },
    footerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingBottom: 14
    },
    contactText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: "700"
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 8
    },
    emptyText: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20
    }
  });
