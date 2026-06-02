import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card, SectionTitle } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/theme";

const joinedChats = [
  {
    title: "Abierto de Palermo 2026",
    description: "Fixture, resultados y conversación oficial del torneo.",
    members: "1.8k miembros",
    unread: 6,
    icon: "trophy-outline" as const,
    tone: "#d8ecff"
  },
  {
    title: "La Dolfina vs Ellerstina",
    description: "Chat activo por el partido destacado de la semana.",
    members: "842 miembros",
    unread: 2,
    icon: "radio-outline" as const,
    tone: "#e8f7f4"
  },
  {
    title: "Mercado de jugadores",
    description: "Altas, bajas y rumores confirmados por Polo Connect.",
    members: "526 miembros",
    unread: 0,
    icon: "swap-horizontal-outline" as const,
    tone: "#fff4dc"
  }
];

const recommendedChats = [
  {
    title: "Hurlingham Open",
    description: "Cobertura oficial, cruces y debate del campeonato.",
    members: "Disponible ahora",
    icon: "calendar-outline" as const,
    tone: "#eaf5ff"
  },
  {
    title: "Noticias del alto handicap",
    description: "Un chat para seguir novedades importantes del circuito.",
    members: "Nuevo",
    icon: "newspaper-outline" as const,
    tone: "#eef8e8"
  },
  {
    title: "Tortugas Country Club",
    description: "Comunidad temporal para partidos, horarios y resultados.",
    members: "Próximo torneo",
    icon: "shield-outline" as const,
    tone: "#f1edff"
  }
];

export default function CommunityScreen() {
  return (
    <Screen
      eyebrow="Chats oficiales"
      title="Comunidades"
      subtitle="Espacios creados por Polo Connect para torneos, noticias y equipos. Unite, hablá o abandoná cuando quieras."
    >
      <SectionTitle title="Tus comunidades" />
      {joinedChats.map((chat) => (
        <Pressable
          key={chat.title}
          style={({ pressed }) => [
            styles.chatCard,
            pressed && styles.chatCardPressed
          ]}
          onPress={() => {
            // Navigate to chat
            console.log("Entering chat:", chat.title);
          }}
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
          </View>
        </Pressable>
      ))}

      <SectionTitle title="Recomendaciones" />
      {recommendedChats.map((chat) => (
        <Card key={chat.title} style={styles.recommendationCard}>
          <View style={styles.chatRow}>
            <View style={[styles.chatIcon, { backgroundColor: chat.tone }]}>
              <Ionicons name={chat.icon} size={25} color={colors.primaryDark} />
            </View>

            <View style={styles.chatInfo}>
              <Text style={styles.chatTitle}>{chat.title}</Text>
              <Text style={styles.chatDescription} numberOfLines={2}>
                {chat.description}
              </Text>
              <Text style={styles.chatMeta}>{chat.members}</Text>
            </View>

            <Pressable style={styles.joinButton}>
              <Text style={styles.joinButtonText}>Unirse</Text>
            </Pressable>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chatCard: {
    backgroundColor: "#ffffff",
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
  }
});
