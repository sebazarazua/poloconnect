import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { AppColors, useThemeColors } from "@/constants/theme";
import { useLocale } from "@/contexts/LocaleContext";
import { HorseAuctionDetail, getHorseAuction, resolveAuctionImageUrl } from "@/services/api/horse-auctions";

function formatMoney(currency: string, cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(cents / 100);
}

export default function HorseAuctionDetailScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t, locale } = useLocale();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const [event, setEvent] = useState<HorseAuctionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = params.id;
    if (!id) {
      setLoading(false);
      setError(t("auctions.loadError"));
      return;
    }

    setLoading(true);
    setError(null);

    void getHorseAuction(id)
      .then((data) => setEvent(data))
      .catch(() => setError(t("auctions.loadError")))
      .finally(() => setLoading(false));
  }, [params.id, t]);

  const eventDateLabel = event
    ? new Date(event.eventDate).toLocaleDateString(locale, {
        day: "2-digit",
        month: "long",
        year: "numeric"
      })
    : "";

  return (
    <Screen
      eyebrow={t("auctions.eyebrow")}
      title={event?.title ?? t("auctions.detailTitle")}
      subtitle={event ? `${eventDateLabel} - ${event.venue}` : undefined}
      showBackButton
      onBackPress={() => router.back()}
    >
      {loading ? <Text style={styles.infoText}>{t("common.loading")}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {event ? (
        <>
          {event.imageUrl ? (
            <Image source={{ uri: resolveAuctionImageUrl(event.imageUrl) }} style={styles.heroImage} resizeMode="cover" />
          ) : null}

          <Card>
            <Text style={styles.sectionTitle}>{t("auctions.contactSection")}</Text>
            <Text style={styles.meta}>{`${event.organizer} - ${event.city}, ${event.country}`}</Text>
            <Text style={styles.meta}>{`${event.contactName}`}</Text>

            <View style={styles.linkRow}>
              {event.contactPhone ? (
                <Pressable style={styles.linkButton} onPress={() => Linking.openURL(`tel:${event.contactPhone}`)}>
                  <Ionicons name="call-outline" size={15} color={colors.primary} />
                  <Text style={styles.linkText}>{event.contactPhone}</Text>
                </Pressable>
              ) : null}

              {event.contactEmail ? (
                <Pressable style={styles.linkButton} onPress={() => Linking.openURL(`mailto:${event.contactEmail}`)}>
                  <Ionicons name="mail-outline" size={15} color={colors.primary} />
                  <Text style={styles.linkText}>{event.contactEmail}</Text>
                </Pressable>
              ) : null}
            </View>

            {event.websiteUrl ? (
              <Pressable style={styles.webButton} onPress={() => Linking.openURL(event.websiteUrl!)}>
                <Text style={styles.webText}>{t("auctions.viewWebsite")}</Text>
              </Pressable>
            ) : null}

            {event.notes ? <Text style={styles.notes}>{event.notes}</Text> : null}
          </Card>

          <Text style={styles.sectionTitle}>{t("auctions.horsesInEvent")}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {event.horses.map((horse) => (
              <View key={horse.id} style={styles.horseCard}>
                {horse.imageUrl ? <Image source={{ uri: resolveAuctionImageUrl(horse.imageUrl) }} style={styles.horseImage} resizeMode="cover" /> : null}

                <View style={styles.horseTop}>
                  <Text style={styles.horseTitle}>
                    {horse.lotNumber ? `#${horse.lotNumber} - ` : ""}
                    {horse.horseName}
                  </Text>
                  <Text style={styles.price}>{formatMoney(horse.currency, horse.reservePriceCents)}</Text>
                </View>

                <Text style={styles.horseMeta}>{t("auctions.owner")}: {horse.ownerName}</Text>
                <Text style={styles.horseMeta}>{t("auctions.breed")}: {horse.breed ?? t("auctions.notSpecified")}</Text>
                <Text style={styles.horseMeta}>
                  {t("auctions.age")}: {horse.ageYears ? `${horse.ageYears}` : t("auctions.notSpecified")}
                </Text>

                <View style={styles.contactRow}>
                  {horse.contactPhone ? (
                    <Pressable style={styles.inlinePill} onPress={() => Linking.openURL(`tel:${horse.contactPhone}`)}>
                      <Ionicons name="call-outline" size={14} color={colors.primaryDark} />
                      <Text style={styles.inlinePillText}>{horse.contactPhone}</Text>
                    </Pressable>
                  ) : null}
                  {horse.contactEmail ? (
                    <Pressable style={styles.inlinePill} onPress={() => Linking.openURL(`mailto:${horse.contactEmail}`)}>
                      <Ionicons name="mail-outline" size={14} color={colors.primaryDark} />
                      <Text style={styles.inlinePillText}>{horse.contactEmail}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}
    </Screen>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    heroImage: {
      width: "100%",
      height: 220,
      borderRadius: 18,
      marginBottom: 12
    },
    infoText: {
      color: colors.muted,
      fontSize: 14,
      marginBottom: 10
    },
    errorText: {
      color: colors.danger,
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 10
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 10
    },
    meta: {
      color: colors.muted,
      fontSize: 14,
      marginBottom: 6
    },
    linkRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 8
    },
    linkButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceStrong
    },
    linkText: {
      color: colors.primary,
      fontWeight: "700",
      fontSize: 12
    },
    webButton: {
      marginTop: 10,
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.primarySoft
    },
    webText: {
      color: colors.primaryDark,
      fontWeight: "800",
      fontSize: 12
    },
    notes: {
      marginTop: 10,
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19
    },
    horseCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.surface,
      padding: 12,
      marginBottom: 10
    },
    horseImage: {
      width: "100%",
      height: 170,
      borderRadius: 12,
      marginBottom: 10
    },
    horseTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
      gap: 8
    },
    horseTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "900",
      flex: 1
    },
    price: {
      color: colors.success,
      fontSize: 15,
      fontWeight: "900"
    },
    horseMeta: {
      color: colors.muted,
      fontSize: 13,
      marginBottom: 3
    },
    contactRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 8
    },
    inlinePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 10,
      paddingVertical: 6
    },
    inlinePillText: {
      color: colors.primaryDark,
      fontSize: 12,
      fontWeight: "700"
    }
  });
