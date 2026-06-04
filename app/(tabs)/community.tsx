import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card, SectionTitle } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { AdCarousel } from "@/components/AdCarousel";
import { AppColors, useThemeColors } from "@/constants/theme";
import { useLocale } from "@/contexts/LocaleContext";
import { useCommunity } from "@/contexts/CommunityContext";
import type { ChatItem } from "@/contexts/CommunityContext";

const communityAds = [
  require("../../assets/ads/community/slide-1.png"),
  require("../../assets/ads/community/slide-2.png"),
  require("../../assets/ads/community/slide-3.png")
];

export default function CommunityScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { t } = useLocale();
  const router = useRouter();
  const { joinedChats, recommendedChats, joinChat } = useCommunity();

  return (
    <Screen
      eyebrow={t("community.eyebrow")}
      title={t("community.title")}
      subtitle={t("community.subtitle")}
    >
      <AdCarousel images={communityAds} height={92} />

      <SectionTitle title={t("community.joined")} />
      {joinedChats.map((chat: ChatItem) => (
        <Pressable
          key={chat.id}
          style={({ pressed }) => [
            styles.chatCard,
            pressed && styles.chatCardPressed
          ]}
          onPress={() =>
            router.push({ pathname: "/group-chat", params: { chatId: chat.id } })
          }
        >
          <View style={styles.chatRow}>
            <View style={[styles.chatIcon, { backgroundColor: chat.tone }]}>
              <Ionicons name={chat.icon} size={25} color={colors.primaryDark} />
            </View>

            <View style={styles.chatInfo}>
              <View style={styles.chatTitleRow}>
                <Text style={styles.chatTitle}>{chat.title}</Text>
                {chat.unread > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{chat.unread}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.chatDescription} numberOfLines={2}>
                {chat.description}
              </Text>
              <Text style={styles.chatMeta}>{chat.members}</Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </View>
        </Pressable>
      ))}

      {joinedChats.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Todavía no te uniste a ningún chat. ¡Explorá los recomendados!
          </Text>
        </View>
      )}

      <SectionTitle title={t("community.recommended")} />
      {recommendedChats.map((chat: ChatItem) => (
        <Card key={chat.id} style={styles.recommendationCard}>
          <View style={styles.chatRow}>
            <View style={[styles.chatIcon, { backgroundColor: chat.tone }]}>
              <Ionicons name={chat.icon} size={25} color={colors.primaryDark} />
            </View>

            <View style={styles.chatInfo}>
              <Text style={styles.chatTitle}>{chat.title}</Text>
              <Text style={styles.chatDescription} numberOfLines={2}>
                {chat.description}
              </Text>
              <Text style={styles.chatMeta}>{chat.recommendedLabel}</Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.joinButton,
                pressed && { opacity: 0.75 }
              ]}
              onPress={() => joinChat(chat.id)}
            >
              <Text style={styles.joinButtonText}>{t("community.join")}</Text>
            </Pressable>
          </View>
        </Card>
      ))}

      {recommendedChats.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Ya estás en todos los grupos recomendados 🎉
          </Text>
        </View>
      )}
    </Screen>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  chatCard: {
    backgroundColor: colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 10
  },
  chatCardPressed: {
    backgroundColor: colors.surface,
    opacity: 0.8
  },
  recommendationCard: {
    backgroundColor: colors.surface
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13
  },
  chatIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  chatInfo: {
    flex: 1
  },
  chatTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  chatTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
  },
  chatDescription: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 19,
    marginTop: 4
  },
  chatMeta: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 7
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7
  },
  unreadText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900"
  },
  joinButton: {
    borderRadius: 999,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  joinButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900"
  },
  emptyState: {
    paddingVertical: 20,
    paddingHorizontal: 8,
    alignItems: "center"
  },
  emptyStateText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20
  }
});
