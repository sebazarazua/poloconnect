import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { AppColors, useThemeColors } from "@/constants/theme";
import { useLocale } from "@/contexts/LocaleContext";

// Landing screen for Mercado Pago's return deep link (polo-connect://market-publish-return).
// This is UX only: it never assumes the payment was approved just because the user came back —
// the real confirmation always comes from the backend webhook, reflected later in "Mis publicaciones".
export default function MarketPublishReturnScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { t } = useLocale();

  return (
    <Screen eyebrow={t("market.eyebrow")} title={t("marketPublish.returnTitle")}>
      <View style={styles.container}>
        <Ionicons name="time-outline" size={48} color={colors.primaryDark} />
        <Text style={styles.text}>{t("marketPublish.returnText")}</Text>
        <Pressable style={styles.button} onPress={() => router.replace("/market-my-posts")}>
          <Text style={styles.buttonText}>{t("marketPublish.returnCta")}</Text>
        </Pressable>
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
