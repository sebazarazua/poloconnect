import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { AppColors, useThemeColors } from "@/constants/theme";
import { useLocale } from "@/contexts/LocaleContext";
import { useMarket } from "@/contexts/MarketContext";
import { resolveUploadedUrl } from "@/services/api/users";

const publicationStatusKeys = {
  pending_payment: "myPosts.status.pending_payment",
  pending_review: "myPosts.status.pending_review",
  active: "myPosts.status.active",
  rejected: "myPosts.status.rejected",
  paused: "myPosts.status.paused",
  sold: "myPosts.status.sold"
} as const;

export default function MarketMyPostsScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { t } = useLocale();
  const { myProducts, deleteProduct, refreshMarket } = useMarket();
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const hasPendingPayment = myProducts.some((product) => product.publicationStatus === "pending_payment" || product.refundStatus === "pending" || product.refundStatus === "failed");

  useFocusEffect(
    useCallback(() => {
      let focused = true;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const refresh = async () => {
        try {
          await refreshMarket();
        } catch {
          // Keep the last loaded listings when the connection is unavailable.
        } finally {
          if (focused && hasPendingPayment) timer = setTimeout(() => void refresh(), 5000);
        }
      };
      void refresh();
      return () => {
        focused = false;
        clearTimeout(timer);
      };
    }, [hasPendingPayment, refreshMarket])
  );

  return (
    <Screen
      eyebrow={t("market.eyebrow")}
      title={t("myPosts.title")}
      subtitle={t("myPosts.subtitle")}
      showBackButton
      onBackPress={() => router.back()}
    >
      {myProducts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="albums-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyTitle}>{t("myPosts.emptyTitle")}</Text>
          <Text style={styles.emptyText}>{t("myPosts.emptyText")}</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {myProducts.map((product) => {
            const statusKey = product.publicationStatus && product.publicationStatus in publicationStatusKeys
              ? publicationStatusKeys[product.publicationStatus as keyof typeof publicationStatusKeys]
              : null;
            const isDeleting = deletingProductId === product.id;

            return (
              <View key={product.id} style={styles.card}>
                <Image source={{ uri: resolveUploadedUrl(product.image) ?? product.image }} style={styles.image} />

                <View style={styles.body}>
                  {statusKey ? (
                    <View style={[styles.statusBadge, product.publicationStatus === "active" ? styles.statusBadgeActive : null]}>
                      <Text style={[styles.statusBadgeText, product.publicationStatus === "active" ? styles.statusBadgeTextActive : null]}>{t(statusKey)}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.name} numberOfLines={2}>
                    {product.name.replace("\n", " ")}
                  </Text>
                  <Text style={styles.price}>{product.currency ?? "USD"} {product.price.toLocaleString()}</Text>
                  {product.refundStatus && product.refundStatus !== "none" ? (
                    <Text style={styles.actionText}>{t(`myPosts.refund.${product.refundStatus}`)}</Text>
                  ) : null}

                  <View style={styles.actions}>
                    {product.publicationStatus !== "rejected" ? <Pressable
                      style={[styles.actionButton, styles.editButton]}
                      disabled={isDeleting}
                      onPress={() => router.push(`/market-publish?id=${product.id}`)}
                    >
                      <Ionicons name="create-outline" size={16} color={colors.primaryDark} />
                      <Text style={styles.actionText}>{t("common.edit")}</Text>
                    </Pressable> : null}

                    <Pressable
                      style={[styles.actionButton, styles.deleteButton, isDeleting && styles.actionButtonDisabled]}
                      disabled={isDeleting}
                      onPress={() => {
                        Alert.alert(t("marketPublish.deleteConfirmTitle"), t("marketPublish.deleteConfirmText"), [
                          { text: t("common.cancel"), style: "cancel" },
                          {
                            text: t("marketPublish.deleteConfirmAction"),
                            style: "destructive",
                            onPress: async () => {
                              try {
                                setDeletingProductId(product.id);
                                await deleteProduct(product.id);
                              } catch (error) {
                                Alert.alert("No se pudo eliminar", error instanceof Error ? error.message : "Intentá nuevamente.");
                              } finally {
                                setDeletingProductId(null);
                              }
                            }
                          }
                        ]);
                      }}
                    >
                      {isDeleting ? (
                        <ActivityIndicator color={colors.danger} />
                      ) : (
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      )}
                      <Text style={[styles.actionText, styles.deleteText]}>{t("common.delete")}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  list: {
    gap: 12,
    paddingBottom: 8
  },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12
  },
  image: {
    width: 82,
    height: 82,
    borderRadius: 12,
    backgroundColor: colors.surfaceStrong
  },
  body: {
    flex: 1,
    gap: 8
  },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceStrong,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3
  },
  statusBadgeActive: {
    backgroundColor: colors.primary
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted
  },
  statusBadgeTextActive: {
    color: "#ffffff"
  },
  name: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800"
  },
  price: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "900"
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  actionButton: {
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6
  },
  actionButtonDisabled: {
    opacity: 0.55
  },
  editButton: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: "#cfe2f5"
  },
  deleteButton: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: "#ffd2cc"
  },
  actionText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "800"
  },
  deleteText: {
    color: colors.danger
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16
  }
});
