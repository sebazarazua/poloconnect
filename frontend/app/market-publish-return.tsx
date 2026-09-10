import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { AppColors, useThemeColors } from "@/constants/theme";
import { useLocale } from "@/contexts/LocaleContext";
import { useMarket } from "@/contexts/MarketContext";
import { syncProductPayment } from "@/services/api/market";

const PAYMENT_SYNC_WINDOW_MS = 12_000;
const PAYMENT_POLL_INTERVAL_MS = 1_500;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type ReturnPhase = "checking" | "pending" | "error";

export default function MarketPublishReturnScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { t } = useLocale();
  const { refreshMarket } = useMarket();
  const params = useLocalSearchParams<{
    productId?: string | string[];
    paymentId?: string | string[];
    payment_id?: string | string[];
    collection_id?: string | string[];
  }>();
  const productId = firstParam(params.productId);
  const paymentId = firstParam(params.paymentId) ?? firstParam(params.payment_id) ?? firstParam(params.collection_id);
  const [phase, setPhase] = useState<ReturnPhase>("checking");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const waitForNextPoll = () => new Promise<void>((resolve) => {
      timer = setTimeout(resolve, PAYMENT_POLL_INTERVAL_MS);
    });

    const verifyPayment = async () => {
      if (!productId && !paymentId) {
        setPhase("error");
        return;
      }

      setPhase("checking");
      const deadline = Date.now() + PAYMENT_SYNC_WINDOW_MS;
      let confirmedPending = false;
      let lastRequestFailed = false;

      do {
        try {
          const result = await syncProductPayment(productId, paymentId);
          if (cancelled) return;
          lastRequestFailed = false;

          if (result.payment.status === "approved" && result.product.publicationStatus === "active") {
            await refreshMarket().catch(() => undefined);
            if (cancelled) return;
            router.replace("/market-my-posts");
            Alert.alert(t("marketPublish.paymentConfirmed"));
            return;
          }

          if (["rejected", "cancelled", "refunded"].includes(result.payment.status ?? "")) {
            await refreshMarket().catch(() => undefined);
            if (cancelled) return;
            router.replace("/market-my-posts");
            Alert.alert(t("marketPublish.paymentNotApproved"));
            return;
          }

          confirmedPending = result.payment.status === "pending";
        } catch {
          lastRequestFailed = true;
        }

        if (Date.now() >= deadline) break;
        await waitForNextPoll();
      } while (!cancelled);

      if (!cancelled) setPhase(confirmedPending && !lastRequestFailed ? "pending" : "error");
    };

    void verifyPayment();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [paymentId, productId, refreshMarket, retryKey, router, t]);

  const isChecking = phase === "checking";
  const isError = phase === "error";

  return (
    <Screen
      eyebrow={t("market.eyebrow")}
      title={isChecking ? t("marketPublish.confirmingTitle") : isError ? t("marketPublish.confirmationErrorTitle") : t("marketPublish.returnTitle")}
    >
      <View style={styles.container}>
        {isChecking ? (
          <ActivityIndicator size="large" color={colors.primaryDark} />
        ) : (
          <Ionicons name={isError ? "alert-circle-outline" : "time-outline"} size={48} color={colors.primaryDark} />
        )}
        <Text style={styles.text}>
          {isChecking
            ? t("marketPublish.confirmingText")
            : isError
              ? t("marketPublish.confirmationErrorText")
              : t("marketPublish.returnText")}
        </Text>
        {isError ? (
          <Pressable style={styles.button} onPress={() => setRetryKey((value) => value + 1)}>
            <Text style={styles.buttonText}>{t("common.retry")}</Text>
          </Pressable>
        ) : !isChecking ? (
          <Pressable style={styles.button} onPress={() => router.replace("/market-my-posts")}>
            <Text style={styles.buttonText}>{t("marketPublish.returnCta")}</Text>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 24
  },
  text: {
    fontSize: 15,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 22
  },
  button: {
    backgroundColor: colors.primaryDark,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 15
  }
});
