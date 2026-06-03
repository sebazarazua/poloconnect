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
import { colors } from "@/constants/theme";
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
    { id: "1", userId: "santi", userName: "Santiago Pérez", text: "¿Alguien sabe quién enfrenta a La Dolfina en cuartos?", time: "09:12", isMe: false },
    { id: "2", userId: "maria", userName: "María Fernández", text: "Creo que juegan contra Ellerstina el sábado a las 15:00", time: "09:14", isMe: false },
    { id: "3", userId: "me", userName: "Vos", text: "Vi en el fixture oficial que es el domingo a las 16:30", time: "09:15", isMe: true },
    { id: "4", userId: "carlos", userName: "Carlos Ibáñez", text: "Cambiaso viene con todo este año, hizo 4 goles ayer en la prueba 🔥", time: "09:18", isMe: false },
    { id: "5", userId: "santi", userName: "Santiago Pérez", text: "El nivel esta temporada está increíble. ¿Tienen link para ver el partido?", time: "09:20", isMe: false },
    { id: "6", userId: "maria", userName: "María Fernández", text: "Lo están transmitiendo por PoloTV y también en YouTube de la AAP", time: "09:21", isMe: false },
    { id: "7", userId: "me", userName: "Vos", text: "Gracias María! 👍", time: "09:22", isMe: true },
    { id: "8", userId: "carlos", userName: "Carlos Ibáñez", text: "¿Alguien va en persona al campo de palermo este fin de semana?", time: "09:45", isMe: false },
    { id: "9", userId: "santi", userName: "Santiago Pérez", text: "Yo voy el sábado con mi familia. Las entradas en la AAP", time: "09:47", isMe: false },
    { id: "10", userId: "me", userName: "Vos", text: "Yo también voy el sábado, nos cruzamos ahí!", time: "09:50", isMe: true },
    { id: "11", userId: "maria", userName: "María Fernández", text: "Qué envidia, yo lo miro desde casa jaja 😂", time: "09:51", isMe: false },
    { id: "12", userId: "carlos", userName: "Carlos Ibáñez", text: "El ambiente en Palermo es único, van a disfrutar 🏆", time: "09:53", isMe: false }
  ],
  dolfina: [
    { id: "1", userId: "rodri", userName: "Rodrigo Salas", text: "Ese gol de Pieres en el tercer chukker fue de otro nivel 🔥", time: "15:02", isMe: false },
    { id: "2", userId: "ana", userName: "Ana Gutiérrez", text: "La Dolfina está dominando pero Ellerstina sigue en partido", time: "15:04", isMe: false },
    { id: "3", userId: "me", userName: "Vos", text: "El marcador es 6-4, todavía hay partido!", time: "15:05", isMe: true },
    { id: "4", userId: "pedro", userName: "Pedro Montes", text: "Falta un chukker y medio, puede cambiar todo", time: "15:07", isMe: false },
    { id: "5", userId: "rodri", userName: "Rodrigo Salas", text: "Cambiaso está jugando de memoria hoy, impresionante", time: "15:10", isMe: false },
    { id: "6", userId: "ana", userName: "Ana Gutiérrez", text: "El ambiente está increíble según los que están en vivo", time: "15:12", isMe: false },
    { id: "7", userId: "me", userName: "Vos", text: "Alguien tiene el stream? El canal no me está andando", time: "15:14", isMe: true },
    { id: "8", userId: "pedro", userName: "Pedro Montes", text: "Probá con el canal oficial de AAP en YouTube", time: "15:15", isMe: false },
    { id: "9", userId: "rodri", userName: "Rodrigo Salas", text: "GOL! La Dolfina 7 - Ellerstina 4 👏", time: "15:22", isMe: false },
    { id: "10", userId: "ana", userName: "Ana Gutiérrez", text: "Ya está, se cerró el partido. ¡Vamos La Dolfina!", time: "15:30", isMe: false }
  ],
  mercado: [
    { id: "1", userId: "lucia", userName: "Lucía Torres", text: "Confirman que Facundo Pieres no renueva con Ellerstina", time: "11:00", isMe: false },
    { id: "2", userId: "hernan", userName: "Hernán Díaz", text: "¿A qué equipo se va? ¿Tienen info?", time: "11:02", isMe: false },
    { id: "3", userId: "me", userName: "Vos", text: "Escuché que hay interés fuerte de La Natividad", time: "11:04", isMe: true },
    { id: "4", userId: "vale", userName: "Valentina Ruiz", text: "El agente de Pieres no confirmó nada todavía", time: "11:06", isMe: false },
    { id: "5", userId: "lucia", userName: "Lucía Torres", text: "También dicen que Pablo Mac Donough busca equipo para la próxima", time: "11:09", isMe: false },
    { id: "6", userId: "hernan", userName: "Hernán Díaz", text: "Son los dos mejores en el mercado ahora mismo", time: "11:11", isMe: false },
    { id: "7", userId: "me", userName: "Vos", text: "Con Mac Donough libre cualquier equipo top va a quererlo", time: "11:13", isMe: true },
    { id: "8", userId: "vale", userName: "Valentina Ruiz", text: "Palermo sin esos dos va a ser muy diferente este año", time: "11:15", isMe: false },
    { id: "9", userId: "lucia", userName: "Lucía Torres", text: "Esperen el anuncio oficial de la AAP para la semana que viene 🎯", time: "11:20", isMe: false }
  ],
  hurlingham: [
    { id: "1", userId: "diego", userName: "Diego Alvarado", text: "¡Bienvenidos al chat oficial del Hurlingham Open! 🏇", time: "10:00", isMe: false },
    { id: "2", userId: "flor", userName: "Florencia Paz", text: "El fixture ya está disponible en la web del club", time: "10:02", isMe: false },
    { id: "3", userId: "me", userName: "Vos", text: "¿Cuándo arranca el torneo?", time: "10:05", isMe: true },
    { id: "4", userId: "matias", userName: "Matías Castro", text: "El 15 de junio es el partido inaugural!", time: "10:06", isMe: false },
    { id: "5", userId: "diego", userName: "Diego Alvarado", text: "Los equipos confirmados son La Dolfina, Ellerstina, La Natividad y otros 5 más", time: "10:08", isMe: false },
    { id: "6", userId: "flor", userName: "Florencia Paz", text: "El nivel este año promete ser histórico 💪", time: "10:10", isMe: false },
    { id: "7", userId: "me", userName: "Vos", text: "Va a estar increíble! Me anoto", time: "10:12", isMe: true },
    { id: "8", userId: "matias", userName: "Matías Castro", text: "Las entradas salen el próximo lunes en Ticketek", time: "10:15", isMe: false }
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

function getUserColor(userId: string): string {
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#ffffff"
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
    backgroundColor: "#ffffff",
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
    backgroundColor: "#dce8f5"
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
    backgroundColor: "#ffffff",
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
    backgroundColor: "#ffffff",
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
