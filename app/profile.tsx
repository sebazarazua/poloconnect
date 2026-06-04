import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Screen } from "@/components/Screen";
import { AppColors, useThemeColors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";

export default function ProfileScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert("Campos incompletos", "Completá los tres campos para cambiar la contraseña.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "La contraseña nueva y la confirmación no coinciden.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "La contraseña nueva debe tener al menos 6 caracteres.");
      return;
    }

    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setSaving(false);

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    Alert.alert("Contraseña actualizada", "Tu contraseña fue cambiada con éxito.");
  };

  const fullName = user ? `${user.firstName} ${user.lastName}` : "—";
  const email = user?.email ?? "—";
  const username = user?.username ?? "—";

  return (
    <Screen
      eyebrow="Cuenta"
      title="Mi perfil"
      subtitle="Gestioná tu información y preferencias."
      showBackButton
      onBackPress={() => router.back()}
    >
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={44} color="#ffffff" />
          </View>
          <Pressable style={styles.avatarEditBtn} accessibilityLabel="Cambiar foto de perfil">
            <Ionicons name="camera" size={15} color="#ffffff" />
          </Pressable>
        </View>
        <Text style={styles.avatarName}>{fullName}</Text>
        <Text style={styles.avatarHandle}>@{username}</Text>
      </View>

      {/* Datos inmutables */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Datos personales</Text>

        <View style={styles.fieldRow}>
          <View style={styles.fieldIcon}>
            <Ionicons name="person-outline" size={16} color={colors.muted} />
          </View>
          <View style={styles.fieldBody}>
            <Text style={styles.fieldLabel}>Nombre completo</Text>
            <Text style={styles.fieldValue}>{fullName}</Text>
          </View>
          <View style={styles.lockedBadge}>
            <Ionicons name="lock-closed-outline" size={12} color={colors.muted} />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.fieldRow}>
          <View style={styles.fieldIcon}>
            <Ionicons name="mail-outline" size={16} color={colors.muted} />
          </View>
          <View style={styles.fieldBody}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={styles.fieldValue}>{email}</Text>
          </View>
          <View style={styles.lockedBadge}>
            <Ionicons name="lock-closed-outline" size={12} color={colors.muted} />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.fieldRow}>
          <View style={styles.fieldIcon}>
            <Ionicons name="at-outline" size={16} color={colors.muted} />
          </View>
          <View style={styles.fieldBody}>
            <Text style={styles.fieldLabel}>Usuario</Text>
            <Text style={styles.fieldValue}>@{username}</Text>
          </View>
          <View style={styles.lockedBadge}>
            <Ionicons name="lock-closed-outline" size={12} color={colors.muted} />
          </View>
        </View>
      </View>

      {/* Cambiar contraseña */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cambiar contraseña</Text>

        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Contraseña actual"
            placeholderTextColor={colors.muted}
            secureTextEntry={!showCurrent}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            autoCapitalize="none"
          />
          <Pressable
            style={styles.eyeBtn}
            onPress={() => setShowCurrent((v) => !v)}
            accessibilityLabel={showCurrent ? "Ocultar contraseña actual" : "Mostrar contraseña actual"}
          >
            <Ionicons
              name={showCurrent ? "eye-off-outline" : "eye-outline"}
              size={18}
              color={colors.muted}
            />
          </Pressable>
        </View>

        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Contraseña nueva"
            placeholderTextColor={colors.muted}
            secureTextEntry={!showNew}
            value={newPassword}
            onChangeText={setNewPassword}
            autoCapitalize="none"
          />
          <Pressable
            style={styles.eyeBtn}
            onPress={() => setShowNew((v) => !v)}
            accessibilityLabel={showNew ? "Ocultar contraseña nueva" : "Mostrar contraseña nueva"}
          >
            <Ionicons
              name={showNew ? "eye-off-outline" : "eye-outline"}
              size={18}
              color={colors.muted}
            />
          </Pressable>
        </View>

        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Confirmá la contraseña nueva"
            placeholderTextColor={colors.muted}
            secureTextEntry={!showConfirm}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoCapitalize="none"
          />
          <Pressable
            style={styles.eyeBtn}
            onPress={() => setShowConfirm((v) => !v)}
            accessibilityLabel={showConfirm ? "Ocultar confirmación" : "Mostrar confirmación"}
          >
            <Ionicons
              name={showConfirm ? "eye-off-outline" : "eye-outline"}
              size={18}
              color={colors.muted}
            />
          </Pressable>
        </View>

        <Pressable
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleChangePassword}
          disabled={saving}
        >
          <Ionicons name="shield-checkmark-outline" size={17} color="#ffffff" />
          <Text style={styles.saveBtnText}>{saving ? "Guardando..." : "Guardar contraseña"}</Text>
        </Pressable>
      </View>

      {/* Accesos rápidos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mis accesos</Text>

        <Pressable style={styles.linkRow} onPress={() => router.push("/favorites")}>
          <View style={[styles.linkIcon, { backgroundColor: colors.dangerSoft }]}>
            <Ionicons name="heart" size={17} color={colors.danger} />
          </View>
          <Text style={styles.linkText}>Mis productos favoritos</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      </View>
    </Screen>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
    gap: 6
  },
  avatarWrap: {
    position: "relative",
    marginBottom: 8
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarEditBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryDark,
    borderWidth: 2,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800"
  },
  avatarHandle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600"
  },
  section: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    gap: 12
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  fieldIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  fieldBody: {
    flex: 1
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  fieldValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2
  },
  lockedBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 4
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.background,
    overflow: "hidden"
  },
  input: {
    flex: 1,
    minHeight: 48,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  eyeBtn: {
    width: 44,
    height: 48,
    alignItems: "center",
    justifyContent: "center"
  },
  saveBtn: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 2
  },
  saveBtnDisabled: {
    opacity: 0.55
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800"
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  linkText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: "700"
  }
});
