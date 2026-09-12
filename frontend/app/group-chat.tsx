import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Keyboard,
  KeyboardAvoidingView,
  KeyboardEvent,
  Platform,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColors, useThemeColors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { useCommunity } from "@/contexts/CommunityContext";
import {
  ensureCommunitySocketConnected,
  listMessages,
  listMessagesAfter,
  sendMessage,
  setChatRoomVisibility,
  subscribeToRoomMessages
} from "@/services/api/community";
import { resolveUploadedUrl } from "@/services/api/users";
import { ReportModal, type ReportTarget } from "@/components/ReportModal";
import { blockUser } from "@/services/api/moderation";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  userId: string;
  avatarUrl?: string;
  userName: string;
  text: string;
  time: string;
  createdAt?: string;
  messageNumber?: string;
  clientMessageId?: string;
  isMe: boolean;
}

type IncomingMessage = Omit<Message, "isMe"> & { isMe?: boolean };

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

function mergeMessages(current: Message[], incoming: Message[]) {
  const byId = new Map(current.map((message) => [message.id, message]));

  for (const message of incoming) {
    if (message.clientMessageId && message.clientMessageId !== message.id) {
      byId.delete(message.clientMessageId);
    }
    byId.set(message.id, message);
  }

  return [...byId.values()].sort((left, right) => {
    const leftNumber = Number(left.messageNumber);
    const rightNumber = Number(right.messageNumber);
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) {
      return leftNumber - rightNumber;
    }

    const leftTime = left.createdAt ? Date.parse(left.createdAt) : Number.MAX_SAFE_INTEGER;
    const rightTime = right.createdAt ? Date.parse(right.createdAt) : Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  });
}

function getLatestMessageNumber(messages: Message[]) {
  return messages.reduce<string | null>((latest, message) => {
    if (!message.messageNumber) return latest;
    if (!latest || BigInt(message.messageNumber) > BigInt(latest)) return message.messageNumber;
    return latest;
  }, null);
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  showName,
  onModerate
}: {
  msg: Message;
  showName: boolean;
  onModerate?: (message: Message) => void;
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
  const avatarSource = resolveUploadedUrl(msg.avatarUrl);

  return (
    <Pressable style={styles.rowOther} onLongPress={() => onModerate?.(msg)} delayLongPress={350}>
      {showName ? (
        avatarSource ? (
          <View style={styles.avatarSmall}>
            <Image source={{ uri: avatarSource }} style={styles.avatarSmallImage} />
          </View>
        ) : (
          <View style={[styles.avatarSmall, { backgroundColor: nameColor }]}> 
            <Text style={styles.avatarSmallText}>{getInitials(msg.userName)}</Text>
          </View>
        )
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
    </Pressable>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function GroupChatScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const { user } = useAuth();
  const { joinedChats, leaveChat, roomsLoaded, setChatNotificationsMuted } = useCommunity();
  const scrollRef = useRef<ScrollView>(null);
  const keyboardTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const messagesRef = useRef<Message[]>([]);
  const activeRoomIdRef = useRef<string | undefined>(undefined);
  const mountedRef = useRef(true);
  const isFocusedRef = useRef(false);
  const isAppActiveRef = useRef(AppState.currentState === "active");
  const accessAlertShownRef = useRef(false);
  const [inputText, setInputText] = useState("");
  const [composerHeight, setComposerHeight] = useState(42);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  const chat = joinedChats.find(c => c.id === chatId);

  const normalizeMessage = useCallback((message: IncomingMessage): Message => {
    const isMe = user?.id ? message.userId === user.id : Boolean(message.isMe);
    return {
      ...message,
      isMe,
      userName: isMe ? t("chat.me") : message.userName
    };
  }, [t, user?.id]);

  const updateMessages = useCallback((updater: (current: Message[]) => Message[]) => {
    setMessages((current) => {
      const next = updater(current);
      messagesRef.current = next;
      return next;
    });
  }, []);

  const synchronizeMessages = useCallback(async () => {
    if (!chatId) return;

    const latestMessageNumber = getLatestMessageNumber(messagesRef.current);
    const fetchedMessages = latestMessageNumber
      ? await listMessagesAfter(chatId, latestMessageNumber)
      : await listMessages(chatId);

    if (mountedRef.current) {
      updateMessages((current) => mergeMessages(current, fetchedMessages.map(normalizeMessage)));
    }
  }, [chatId, normalizeMessage, updateMessages]);

  useFocusEffect(useCallback(() => {
    isFocusedRef.current = true;
    if (isAppActiveRef.current && chatId) {
      setChatRoomVisibility(chatId, true);
    }

    return () => {
      isFocusedRef.current = false;
      if (chatId) {
        setChatRoomVisibility(chatId, false);
      }
    };
  }, [chatId]));

  const scrollToBottom = (animated: boolean) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated });
    });
  };

  const clearKeyboardTimers = () => {
    keyboardTimersRef.current.forEach(clearTimeout);
    keyboardTimersRef.current = [];
  };

  const settleAfterKeyboardResize = () => {
    clearKeyboardTimers();
    scrollToBottom(false);
    keyboardTimersRef.current = [
      setTimeout(() => scrollToBottom(false), 24),
      setTimeout(() => scrollToBottom(false), 90)
    ];
  };

  useEffect(() => {
    if (!chatId) return;

    if (activeRoomIdRef.current !== chatId) {
      activeRoomIdRef.current = chatId;
      messagesRef.current = [];
      setMessages([]);
      setInputText("");
      accessAlertShownRef.current = false;
    }

    mountedRef.current = true;
    void synchronizeMessages().catch(() => undefined);

    const unsubscribe = subscribeToRoomMessages(chatId, (incomingMessage) => {
      const normalizedIncoming = normalizeMessage(incomingMessage);
      updateMessages((current) => mergeMessages(current, [normalizedIncoming]));
    }, () => {
      if (isFocusedRef.current && isAppActiveRef.current) {
        setChatRoomVisibility(chatId, true);
      }
      void synchronizeMessages().catch(() => undefined);
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [chatId, normalizeMessage, synchronizeMessages, updateMessages]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      isAppActiveRef.current = nextState === "active";
      if (nextState !== "active") {
        if (chatId) {
          setChatRoomVisibility(chatId, false);
        }
        keyboardTimersRef.current.forEach(clearTimeout);
        keyboardTimersRef.current = [];
        setIsKeyboardVisible(false);
        Keyboard.dismiss();
        return;
      }

      const wasSocketConnected = ensureCommunitySocketConnected();
      if (isFocusedRef.current && chatId) {
        setChatRoomVisibility(chatId, true);
      }
      if (wasSocketConnected) {
        void synchronizeMessages().catch(() => undefined);
      }
      requestAnimationFrame(() => scrollToBottom(false));
    });

    return () => subscription.remove();
  }, [chatId, synchronizeMessages]);

  useEffect(() => {
    if (!chatId || !roomsLoaded || chat || accessAlertShownRef.current) {
      return;
    }

    accessAlertShownRef.current = true;
    setInputText("");
    Alert.alert(t("chat.accessLostTitle"), t("chat.accessLostText"));
    router.replace("/(tabs)/community");
  }, [chat, chatId, roomsLoaded, router, t]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom(false);
    }, 120);
    return () => clearTimeout(timer);
  }, [messages.length]);

  useEffect(() => {
    if (Platform.OS === "android") {
      const didShowSub = Keyboard.addListener("keyboardDidShow", () => {
        setIsKeyboardVisible(true);
        scrollToBottom(false);
      });
      const didHideSub = Keyboard.addListener("keyboardDidHide", () => {
        setIsKeyboardVisible(false);
        scrollToBottom(false);
      });

      return () => {
        didShowSub.remove();
        didHideSub.remove();
      };
    }

    if (Platform.OS !== "ios") {
      return () => undefined;
    }

    const handleKeyboardShow = (_event: KeyboardEvent) => {
      setIsKeyboardVisible(true);
      settleAfterKeyboardResize();
    };

    const handleKeyboardShown = () => {
      scrollToBottom(false);
    };

    const handleKeyboardHide = () => {
      clearKeyboardTimers();
      setIsKeyboardVisible(false);
      setTimeout(() => scrollToBottom(false), 40);
    };

    const willShowSub = Keyboard.addListener("keyboardWillShow", handleKeyboardShow);
    const didShowSub = Keyboard.addListener("keyboardDidShow", handleKeyboardShown);
    const willHideSub = Keyboard.addListener("keyboardWillHide", handleKeyboardHide);

    return () => {
      clearKeyboardTimers();
      willShowSub.remove();
      didShowSub.remove();
      willHideSub.remove();
    };
  }, []);

  function handleSend() {
    const text = inputText.trim();
    if (!text || !chatId) return;
    if (!chat) {
      Alert.alert(t("chat.accessLostTitle"), t("chat.accessLostText"));
      return;
    }
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const clientMessageId = `local-${Date.now()}`;
    const optimisticMessage = {
      id: clientMessageId,
      userId: user?.id ?? "me",
      userName: t("chat.me"),
      text,
      time,
      createdAt: now.toISOString(),
      clientMessageId,
      isMe: true
    };
    updateMessages((current) => mergeMessages(current, [optimisticMessage]));
    setInputText("");
    void sendMessage(chatId, text, optimisticMessage.id)
      .then((createdMessage) => {
        const normalizedCreated = normalizeMessage(createdMessage);

        updateMessages((current) => mergeMessages(current, [normalizedCreated]));
      })
      .catch((error) => {
        updateMessages((current) => current.filter((message) => message.id !== optimisticMessage.id));
        Alert.alert(t("profile.errorTitle"), error instanceof Error ? error.message : t("chat.sendError"));
      });
    setTimeout(() => scrollToBottom(true), 60);
  }

  function confirmLeaveChat() {
    Alert.alert(
      chat?.title ?? t("chat.leaveTitle"),
      t("chat.leaveQuestion"),
      [
        { text: t("chat.leaveCancel"), style: "cancel" },
        {
          text: t("chat.leaveConfirm"),
          style: "destructive",
          onPress: () => {
            leaveChat(chatId ?? "");
            router.back();
          }
        }
      ]
    );
  }

  function handleAvatarPress() {
    if (!chat) return;

    Alert.alert(chat.title, chat.notificationsMuted ? t("chat.notificationsMuted") : chat.members, [
      { text: t("chat.leaveCancel"), style: "cancel" },
      {
        text: chat.notificationsMuted ? t("chat.unmute") : t("chat.mute"),
        onPress: () => {
          void setChatNotificationsMuted(chat.id, !chat.notificationsMuted)
            .catch((error) => Alert.alert(
              t("profile.errorTitle"),
              error instanceof Error ? error.message : t("chat.muteError")
            ));
        }
      },
      { text: t("chat.leaveConfirm"), style: "destructive", onPress: confirmLeaveChat }
    ]);
  }

  function handleMessageModeration(message: Message) {
    if (message.isMe) return;
    Alert.alert(message.userName, "¿Qué querés hacer?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Reportar mensaje", onPress: () => setReportTarget({ contentType: "chat_message", contentId: message.id, reportedUserId: message.userId, context: { roomId: chatId } }) },
      {
        text: "Más opciones",
        onPress: () => Alert.alert(message.userName, "Acciones sobre este usuario", [
          { text: "Cancelar", style: "cancel" },
          { text: "Reportar usuario", onPress: () => setReportTarget({ contentType: "user", reportedUserId: message.userId, context: { roomId: chatId } }) },
          {
            text: "Bloquear usuario",
            style: "destructive",
            onPress: () => {
              void blockUser(message.userId)
                .then(() => setMessages((current) => current.filter((entry) => entry.userId !== message.userId)))
                .catch((error) => Alert.alert("No se pudo bloquear", error instanceof Error ? error.message : "Intentá nuevamente."));
            }
          }
        ])
      }
    ]);
  }

  // Determine which messages should show sender name
  // (show name only when the previous message was from a different user)
  function shouldShowName(index: number): boolean {
    if (messages[index].isMe) return false;
    if (index === 0) return true;
    return messages[index - 1].userId !== messages[index].userId;
  }

  const inputBottomPadding = Platform.OS === "android"
    ? (isKeyboardVisible ? 8 : Math.max(insets.bottom, 8))
    : (Platform.OS === "ios" && !isKeyboardVisible ? Math.max(insets.bottom, 8) : 8);

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
            name={chat?.notificationsMuted ? "notifications-off-outline" : chat?.icon ?? "chatbubbles-outline"}
            size={22}
            color={colors.primaryDark}
          />
        </Pressable>
      </View>

      {/* Messages + Input */}
      <KeyboardAvoidingView
        style={styles.flex}
        // Android's adjustResize owns the available height. A second height
        // adjustment here freezes the initial frame and competes with resizing.
        behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? undefined : "height"}
        enabled={Platform.OS !== "android"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollToBottom(false)}
          onLayout={Platform.OS === "android" ? () => scrollToBottom(false) : undefined}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          onScrollBeginDrag={Keyboard.dismiss}
        >
          {messages.map((msg, idx) => (
            <MessageBubble key={msg.id} msg={msg} showName={shouldShowName(idx)} onModerate={handleMessageModeration} />
          ))}
        </ScrollView>

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            {
              paddingBottom: inputBottomPadding
            }
          ]}
        >
          <TextInput
            style={[styles.textInput, { height: composerHeight }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t("chat.placeholder")}
            placeholderTextColor={colors.muted}
            multiline
            maxLength={500}
            blurOnSubmit={false}
            onFocus={() => {
              if (Platform.OS === "ios") {
                scrollToBottom(false);
                return;
              }

              setTimeout(() => scrollToBottom(true), 60);
            }}
            onContentSizeChange={(event) => {
              const nextHeight = Math.min(Math.max(42, event.nativeEvent.contentSize.height + 2), 120);
              setComposerHeight(nextHeight);
            }}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            editable={Boolean(chat)}
          />
          <Pressable
            onPress={handleSend}
            disabled={!chat}
            style={({ pressed }) => [
              styles.sendBtn,
              { opacity: chat && inputText.trim() ? (pressed ? 0.7 : 1) : 0.35 }
            ]}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      <ReportModal visible={Boolean(reportTarget)} target={reportTarget} onClose={() => setReportTarget(null)} />
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
    overflow: "hidden",
    marginBottom: 2
  },
  avatarSmallImage: {
    width: "100%",
    height: "100%",
    borderRadius: 15
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
