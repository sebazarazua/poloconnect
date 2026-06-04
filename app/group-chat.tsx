import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColors, useThemeColors } from "@/constants/theme";
import { useCommunity } from "@/contexts/CommunityContext";
import type { ChatIconName } from "@/contexts/CommunityContext";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  time: string;
  isMe: boolean;
}

// ─── Mock messages ───────────────────────────────────────────────────────────

const CHAT_MESSAGES: Record<string, Message[]> = {
  palermo: [
    { id: "1", userId: "martin", userName: "Martín", text: "¿Alguien sabe cuándo hay práctica de polo arena en Roldán?", time: "20:58", isMe: false },
    { id: "2", userId: "me", userName: "Vos", text: "El martes a las 21 hs. Confirmaron la cancha techada.", time: "21:00", isMe: true },
    { id: "3", userId: "lucas", userName: "Lucas", text: "¿La convocatoria es para nivel inicial o intermedio?", time: "21:03", isMe: false },
    { id: "4", userId: "me", userName: "Vos", text: "Intermedio. Están organizando una práctica con rotación por chukkers.", time: "21:05", isMe: true },
    { id: "5", userId: "sofia", userName: "Sofía", text: "Puedo sumarme si necesitan completar una posición.", time: "21:08", isMe: false },
    { id: "6", userId: "martin", userName: "Martín", text: "Perfecto, lo consulto con la organización y aviso por acá.", time: "21:10", isMe: false }
  ],
  dolfina: [
    { id: "1", userId: "jose", userName: "José", text: "Voy a Córdoba y tengo lugar para 2 caballos.", time: "08:12", isMe: false },
    { id: "2", userId: "pedro", userName: "Pedro", text: "Tengo que llevar 2 yeguas a Córdoba capital.", time: "08:15", isMe: false },
    { id: "3", userId: "jose", userName: "José", text: "Llámame al 234556677.", time: "08:17", isMe: false },
    { id: "4", userId: "mariana", userName: "Mariana", text: "¿Salís desde Pilar o desde zona norte?", time: "08:19", isMe: false },
    { id: "5", userId: "jose", userName: "José", text: "Salgo desde Pilar el viernes a la tarde.", time: "08:21", isMe: false },
    { id: "6", userId: "pedro", userName: "Pedro", text: "Perfecto, te llamo y coordinamos documentación, horario y punto de carga.", time: "08:25", isMe: false }
  ],
  mercado: [
    { id: "1", userId: "fernando", userName: "Fernando", text: "¿Dónde se juega el próximo torneo de roda?", time: "12:02", isMe: false },
    { id: "2", userId: "julian", userName: "Julián", text: "Necesito comprar una rueda para entrenamiento. ¿Alguna recomendación?", time: "12:06", isMe: false },
    { id: "3", userId: "pedro", userName: "Pedro", text: "Hoy hay práctica en Ellerstina a las 17 hs, con cupos limitados.", time: "12:12", isMe: false },
    { id: "4", userId: "fernando", userName: "Fernando", text: "Me interesa participar. ¿Puedo confirmar asistencia?", time: "12:16", isMe: false },
    { id: "5", userId: "pedro", userName: "Pedro", text: "Sí, hay un cupo disponible. Lleva casco y equipo completo.", time: "12:18", isMe: false },
    { id: "6", userId: "julian", userName: "Julián", text: "Después pasen contacto del proveedor de ruedas, por favor.", time: "12:21", isMe: false }
  ],
  hurlingham: [
    { id: "1", userId: "nico", userName: "Nico", text: "¿Dónde hay una práctica en Luján esta tarde?", time: "14:47", isMe: false },
    { id: "2", userId: "me", userName: "Vos", text: "En La Ensenada hay cupo para tres jugadores a las 15 hs.", time: "14:50", isMe: true },
    { id: "3", userId: "cata", userName: "Cata", text: "¿De cuántos goles es la práctica?", time: "14:52", isMe: false },
    { id: "4", userId: "me", userName: "Vos", text: "Bajo handicap, ideal para 0 a 4 goles.", time: "14:54", isMe: true },
    { id: "5", userId: "nico", userName: "Nico", text: "Me sirve. Confirmo mi asistencia si todavía hay disponibilidad.", time: "14:56", isMe: false },
    { id: "6", userId: "cata", userName: "Cata", text: "Avísenme si queda un cupo, estoy cerca de Luján.", time: "14:59", isMe: false }
  ],
  noticias: [
    { id: "1", userId: "gonza", userName: "Gonzalo Reyes", text: "Nueva clasificación de handicap publicada por la AAP 📋", time: "08:30", isMe: false },
    { id: "2", userId: "cami", userName: "Camila Méndez", text: "Varios jugadores subieron este mes, el nivel sigue creciendo", time: "08:33", isMe: false },
    { id: "3", userId: "me", userName: "Vos", text: "¿Alguien sabe si habrá cambios en el formato del Abierto?", time: "08:35", isMe: true },
    { id: "4", userId: "gonza", userName: "Gonzalo Reyes", text: "Se rumorea que van a agregar una fase de grupos antes de cuartos", time: "08:37", isMe: false },
    { id: "5", userId: "cami", userName: "Camila Méndez", text: "Eso haría el torneo más largo pero mucho más emocionante", time: "08:39", isMe: false },
    { id: "6", userId: "me", userName: "Vos", text: "Totalmente de acuerdo, más partidos siempre es mejor 🏆", time: "08:40", isMe: true },
    { id: "7", userId: "gonza", userName: "Gonzalo Reyes", text: "Lo confirmarían en la reunión de la AAP del próximo mes", time: "08:43", isMe: false }
  ],
  tortugas: [
    { id: "1", userId: "rami", userName: "Ramiro Vidal", text: "El campo de Tortugas está impecable para el torneo 🌿", time: "13:00", isMe: false },
    { id: "2", userId: "sofi", userName: "Sofía López", text: "Las canchas las acondicionaron toda la semana pasada", time: "13:02", isMe: false },
    { id: "3", userId: "me", userName: "Vos", text: "¿A qué hora abre el predio para el público?", time: "13:05", isMe: true },
    { id: "4", userId: "emilio", userName: "Emilio Roca", text: "A partir de las 10:00 en todos los días de partido", time: "13:06", isMe: false },
    { id: "5", userId: "rami", userName: "Ramiro Vidal", text: "Hay servicio de catering y zona VIP nueva este año", time: "13:08", isMe: false },
    { id: "6", userId: "sofi", userName: "Sofía López", text: "El torneo tiene equipos de hasta 20 de handicap", time: "13:10", isMe: false },
    { id: "7", userId: "me", userName: "Vos", text: "Va a ser tremendo el nivel!", time: "13:12", isMe: true },
    { id: "8", userId: "emilio", userName: "Emilio Roca", text: "Primer partido el viernes 6 de junio a las 14:00", time: "13:14", isMe: false },
    { id: "9", userId: "rami", userName: "Ramiro Vidal", text: "Los esperamos a todos! 🐎", time: "13:15", isMe: false }
  ]
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const USER_COLORS = [
  "#064f99",
  "#147d6f",
  "#b7791f",
  "#7c3aed",
  "#be185d",
  "#0f766e"
];

const USER_COLOR_BY_ID: Record<string, string> = {
  martin: "#064f99",
  lucas: "#147d6f",
  sofia: "#b7791f",
  jose: "#7c3aed",
  pedro: "#be185d",
  mariana: "#0f766e",
  fernando: "#1d4ed8",
  julian: "#047857",
  nico: "#9333ea",
  cata: "#c2410c"
};

function getUserColor(userId: string): string {
  if (USER_COLOR_BY_ID[userId]) {
    return USER_COLOR_BY_ID[userId];
  }

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  showName
}: {
  msg: Message;
  showName: boolean;
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  if (msg.isMe) {
    return (
      <View style={styles.rowMe}>
        <View style={styles.bubbleMe}>
          <Text style={styles.bubbleMeText}>{msg.text}</Text>
          <Text style={styles.bubbleTime}>{msg.time}</Text>
        </View>
      </View>
    );
  }

  const nameColor = getUserColor(msg.userId);

  return (
    <View style={styles.rowOther}>
      {showName ? (
        <View style={[styles.avatarSmall, { backgroundColor: nameColor }]}>
          <Text style={styles.avatarSmallText}>{getInitials(msg.userName)}</Text>
        </View>
      ) : (
        <View style={styles.avatarPlaceholder} />
      )}
      <View style={styles.bubbleOtherWrapper}>
        {showName && (
          <Text style={[styles.senderName, { color: nameColor }]}>
            {msg.userName}
          </Text>
        )}
        <View style={styles.bubbleOther}>
          <Text style={styles.bubbleOtherText}>{msg.text}</Text>
          <Text style={styles.bubbleTimeOther}>{msg.time}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function GroupChatScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { joinedChats, leaveChat } = useCommunity();
  const scrollRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>(
    () => CHAT_MESSAGES[chatId ?? ""] ?? []
  );

  const chat = joinedChats.find(c => c.id === chatId);

  // Scroll to bottom on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  function handleSend() {
    const text = inputText.trim();
    if (!text) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setMessages(prev => [
      ...prev,
      { id: String(Date.now()), userId: "me", userName: "Vos", text, time, isMe: true }
    ]);
    setInputText("");
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  }

  function handleAvatarPress() {
    Alert.alert(
      chat?.title ?? "Grupo",
      "¿Querés abandonar este chat?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Abandonar grupo",
          style: "destructive",
          onPress: () => {
            leaveChat(chatId ?? "");
            router.back();
          }
        }
      ]
    );
  }

  // Determine which messages should show sender name
  // (show name only when the previous message was from a different user)
  function shouldShowName(index: number): boolean {
    if (messages[index].isMe) return false;
    if (index === 0) return true;
    return messages[index - 1].userId !== messages[index].userId;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.primaryDark} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {chat?.title ?? "Chat"}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {chat?.members ?? ""}
          </Text>
        </View>

        <Pressable
          onPress={handleAvatarPress}
          style={[styles.headerAvatar, { backgroundColor: chat?.tone ?? colors.primarySoft }]}
        >
          <Ionicons
            name={(chat?.icon ?? "chatbubbles-outline") as ChatIconName}
            size={22}
            color={colors.primaryDark}
          />
        </Pressable>
      </View>

      {/* Messages + Input */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg, idx) => (
            <MessageBubble key={msg.id} msg={msg} showName={shouldShowName(idx)} />
          ))}
        </ScrollView>

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Escribí un mensaje…"
            placeholderTextColor={colors.muted}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            style={({ pressed }) => [
              styles.sendBtn,
              { opacity: inputText.trim() ? (pressed ? 0.7 : 1) : 0.35 }
            ]}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const createStyles = (colors: AppColors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },
  flex: {
    flex: 1
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
    gap: 10
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center"
  },
  headerCenter: {
    flex: 1,
    alignItems: "center"
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: colors.text,
    textAlign: "center"
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
    textAlign: "center"
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border
  },

  // Messages list
  messagesList: {
    flex: 1,
    backgroundColor: colors.surfaceStrong
  },
  messagesContent: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 3
  },

  // Other user row
  rowOther: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 4,
    gap: 6
  },
  avatarSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2
  },
  avatarSmallText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800"
  },
  avatarPlaceholder: {
    width: 30
  },
  bubbleOtherWrapper: {
    maxWidth: "75%"
  },
  senderName: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 3,
    marginLeft: 12
  },
  bubbleOther: {
    backgroundColor: colors.background,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 13,
    paddingTop: 9,
    paddingBottom: 7,
    borderWidth: 1,
    borderColor: colors.border
  },
  bubbleOtherText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20
  },
  bubbleTimeOther: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end"
  },

  // My row
  rowMe: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4
  },
  bubbleMe: {
    maxWidth: "75%",
    backgroundColor: colors.primaryDark,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 13,
    paddingTop: 9,
    paddingBottom: 7
  },
  bubbleMeText: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 20
  },
  bubbleTime: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end"
  },

  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: colors.text,
    maxHeight: 120,
    minHeight: 42
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center"
  }
});
