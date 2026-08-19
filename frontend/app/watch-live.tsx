import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { YouTubeLivePlayer } from "@/components/YouTubeLivePlayer";
import { AppColors, useThemeColors } from "@/constants/theme";
import { useLocale } from "@/contexts/LocaleContext";

export default function WatchLiveScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { t } = useLocale();
  const { url, title } = useLocalSearchParams<{ url?: string; title?: string }>();

  return (
    <Screen
      title={title || t("watchLive.title")}
      showBackButton
      onBackPress={() => router.back()}
    >
      <View style={styles.playerWrap}>
        <YouTubeLivePlayer videoUrl={url} />
      </View>
      {!url ? <Text style={styles.emptyText}>{t("watchLive.unavailable")}</Text> : null}
    </Screen>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  playerWrap: {
    marginTop: 4
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 16,
    textAlign: "center"
  }
});
