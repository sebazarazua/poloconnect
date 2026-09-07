import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { AppColors, radius, useThemeColors } from "@/constants/theme";
import { listBlockedUsers, unblockUser, type ModerationUser } from "@/services/api/moderation";

type Block = { blockedUserId: string; createdAt: string; blocked: ModerationUser };

export default function BlockedUsersScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBlocks(await listBlockedUsers());
    } catch (error) {
      Alert.alert("No se pudieron cargar los usuarios bloqueados", error instanceof Error ? error.message : "Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const unblock = (block: Block) => {
    Alert.alert("Desbloquear usuario", `Vas a volver a ver contenido de ${block.blocked.firstName}.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Desbloquear",
        onPress: () => {
          setBusyId(block.blockedUserId);
          void unblockUser(block.blockedUserId)
            .then(() => setBlocks((current) => current.filter((entry) => entry.blockedUserId !== block.blockedUserId)))
            .catch((error) => Alert.alert("No se pudo desbloquear", error instanceof Error ? error.message : "Intentá nuevamente."))
            .finally(() => setBusyId(null));
        }
      }
    ]);
  };

  return (
    <Screen eyebrow="Privacidad" title="Usuarios bloqueados" subtitle="No verás su contenido ni podrán contactarse dentro de la app." showBackButton onBackPress={() => router.back()}>
      {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /></View> : (
        <FlatList
          data={blocks}
          keyExtractor={(item) => item.blockedUserId}
          contentContainerStyle={blocks.length ? styles.list : styles.empty}
          ListEmptyComponent={<><Ionicons name="shield-checkmark-outline" size={38} color={colors.primaryDark} /><Text style={styles.emptyTitle}>No bloqueaste a nadie</Text><Text style={styles.emptyText}>Cuando bloquees un usuario desde un chat o publicación, aparecerá acá.</Text></>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{`${item.blocked.firstName[0] ?? ""}${item.blocked.lastName[0] ?? ""}`.toUpperCase()}</Text></View>
              <View style={styles.copy}><Text style={styles.name}>{item.blocked.firstName} {item.blocked.lastName}</Text><Text style={styles.username}>@{item.blocked.username}</Text></View>
              <Pressable disabled={busyId === item.blockedUserId} onPress={() => unblock(item)} style={styles.unblock}><Text style={styles.unblockText}>{busyId === item.blockedUserId ? "..." : "Desbloquear"}</Text></Pressable>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  center: { paddingVertical: 56, alignItems: "center" },
  list: { gap: 10, paddingBottom: 20 },
  empty: { alignItems: "center", paddingHorizontal: 30, paddingVertical: 52 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginTop: 12 },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radius.card, padding: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  avatarText: { color: colors.primaryDark, fontWeight: "900" },
  copy: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontSize: 14, fontWeight: "900" },
  username: { color: colors.muted, fontSize: 12, marginTop: 2 },
  unblock: { minHeight: 36, borderRadius: 8, paddingHorizontal: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  unblockText: { color: colors.primaryDark, fontSize: 12, fontWeight: "900" }
});
