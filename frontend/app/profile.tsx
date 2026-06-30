import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Screen } from "@/components/Screen";
import { AppColors, useThemeColors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { changeMyPassword, requestPasswordReset } from "@/services/api/auth";
import { resolveUploadedUrl, updateMyProfile, uploadMyAvatar } from "@/services/api/users";

export default function ProfileScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { user, updateUser, signOut } = useAuth();
  const { t } = useLocale();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  useEffect(() => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
  }, [user?.id, user?.firstName, user?.lastName]);

  const uploadSelectedAvatar = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.uri) return;

    setSavingPhoto(true);

    try {
      const extension = asset.uri.split(".").pop()?.split("?")[0] || "jpg";
      const nextUser = await uploadMyAvatar({
        uri: asset.uri,
        fileName: asset.fileName || `avatar.${extension}`,
        mimeType: asset.mimeType || `image/${extension === "jpg" ? "jpeg" : extension}`
      });
      updateUser(nextUser);
      Alert.alert(t("profile.photoUpdatedTitle"), t("profile.photoUpdatedText"));
    } catch (error) {
      Alert.alert(t("profile.errorTitle"), error instanceof Error ? error.message : t("profile.photoError"));
    } finally {
      setSavingPhoto(false);
    }
  };

  const pickAvatarFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("profile.photoPermissionTitle"), t("profile.cameraPermissionText"), [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("profile.openSettings"), onPress: () => void Linking.openSettings() }
      ]);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85
    });

    if (!result.canceled) {
      await uploadSelectedAvatar(result.assets[0]);
    }
  };

  const pickAvatarFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("profile.photoPermissionTitle"), t("profile.galleryPermissionText"), [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("profile.openSettings"), onPress: () => void Linking.openSettings() }
      ]);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85
    });

    if (!result.canceled) {
      await uploadSelectedAvatar(result.assets[0]);
    }
  };

  const handleChangePhoto = () => {
    if (savingPhoto) return;

    Alert.alert(t("profile.photoTitle"), t("profile.changePhoto"), [
      { text: t("profile.takePhoto"), onPress: () => void pickAvatarFromCamera() },
      { text: t("profile.chooseGallery"), onPress: () => void pickAvatarFromGallery() },
      { text: t("common.cancel"), style: "cancel" }
    ]);
  };

  const handleSaveProfile = async () => {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (trimmedFirstName.length < 2 || trimmedLastName.length < 2) {
      Alert.alert(t("profile.errorTitle"), t("profile.nameRequired"));
      return;
    }

    setSavingProfile(true);

    try {
      const nextUser = await updateMyProfile({
        firstName: trimmedFirstName,
        lastName: trimmedLastName
      });
      updateUser(nextUser);
      Alert.alert(t("profile.profileUpdatedTitle"), t("profile.profileUpdatedText"));
    } catch (error) {
      Alert.alert(t("profile.errorTitle"), error instanceof Error ? error.message : t("profile.profileError"));
    } finally {
      setSavingProfile(false);
    }
  };

      const handleResetByEmailCode = async () => {
        if (!user?.email) {
          Alert.alert(t("profile.errorTitle"), t("profile.profileError"));
          return;
        }

        setSendingCode(true);

        try {
          await requestPasswordReset(user.email);
          router.push({ pathname: "/forgot-password", params: { mode: "in-app", email: user.email, stage: "confirm" } });
        } catch (error) {
          Alert.alert(t("profile.errorTitle"), error instanceof Error ? error.message : t("auth.reset.error"));
        } finally {
          setSendingCode(false);
        }
      };
  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert(t("profile.incompleteTitle"), t("profile.incompleteText"));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t("profile.errorTitle"), t("profile.passwordMismatch"));
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(t("profile.errorTitle"), t("profile.passwordTooShort"));
      return;
    }

    setSaving(true);

    try {
      await changeMyPassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert(t("profile.passwordUpdatedTitle"), t("profile.passwordUpdatedText"));
      signOut();
      router.replace("/login");
    } catch (error) {
      Alert.alert(t("profile.errorTitle"), error instanceof Error ? error.message : t("profile.profileError"));
    } finally {
      setSaving(false);
    }
  };

  const fullName = user ? `${firstName || user.firstName} ${lastName || user.lastName}` : "—";
  const email = user?.email ?? "—";
  const username = user?.username ?? "—";
  const avatarSource = resolveUploadedUrl(user?.avatarUrl);
  const profileHasChanges = firstName.trim() !== (user?.firstName ?? "") || lastName.trim() !== (user?.lastName ?? "");

  return (
    <Screen
      eyebrow={t("common.account")}
      title={t("profile.title")}
      subtitle={t("profile.subtitle")}
      showBackButton
      onBackPress={() => router.back()}
    >
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarWrap}>
          <Pressable style={styles.avatar} onPress={handleChangePhoto} accessibilityLabel={t("profile.changePhoto")}>
            {avatarSource ? (
              <Image source={{ uri: avatarSource }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={44} color="#ffffff" />
            )}
          </Pressable>
          <Pressable style={styles.avatarEditBtn} onPress={handleChangePhoto} accessibilityLabel={t("profile.changePhoto")} disabled={savingPhoto}>
            <Ionicons name={savingPhoto ? "cloud-upload-outline" : "camera"} size={15} color="#ffffff" />
          </Pressable>
        </View>
        <Text style={styles.avatarName}>{fullName}</Text>
        <Text style={styles.avatarHandle}>@{username}</Text>
      </View>

      {/* Datos personales */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("profile.personalData")}</Text>

        <View style={styles.editableGrid}>
          <View style={styles.editableField}>
            <Text style={styles.inputLabel}>{t("profile.firstName")}</Text>
            <TextInput
              style={styles.profileInput}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t("profile.firstName")}
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.editableField}>
            <Text style={styles.inputLabel}>{t("profile.lastName")}</Text>
            <TextInput
              style={styles.profileInput}
              value={lastName}
              onChangeText={setLastName}
              placeholder={t("profile.lastName")}
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
            />
          </View>
        </View>

        <Pressable
          style={[styles.saveBtn, (!profileHasChanges || savingProfile) && styles.saveBtnDisabled]}
          onPress={handleSaveProfile}
          disabled={!profileHasChanges || savingProfile}
        >
          <Ionicons name="checkmark-circle-outline" size={17} color="#ffffff" />
          <Text style={styles.saveBtnText}>{savingProfile ? t("common.saving") : t("profile.saveProfile")}</Text>
        </Pressable>

        <View style={styles.divider} />

        <View style={styles.fieldRow}>
          <View style={styles.fieldIcon}>
            <Ionicons name="mail-outline" size={16} color={colors.muted} />
          </View>
          <View style={styles.fieldBody}>
            <Text style={styles.fieldLabel}>{t("common.email")}</Text>
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
            <Text style={styles.fieldLabel}>{t("common.username")}</Text>
            <Text style={styles.fieldValue}>@{username}</Text>
          </View>
          <View style={styles.lockedBadge}>
            <Ionicons name="lock-closed-outline" size={12} color={colors.muted} />
          </View>
        </View>
      </View>

      {/* Cambiar contraseña */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("profile.changePassword")}</Text>

        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder={t("profile.currentPassword")}
            placeholderTextColor={colors.muted}
            secureTextEntry={!showCurrent}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            autoCapitalize="none"
          />
          <Pressable
            style={styles.eyeBtn}
            onPress={() => setShowCurrent((v) => !v)}
            accessibilityLabel={showCurrent ? t("profile.hideCurrent") : t("profile.showCurrent")}
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
            placeholder={t("profile.newPassword")}
            placeholderTextColor={colors.muted}
            secureTextEntry={!showNew}
            value={newPassword}
            onChangeText={setNewPassword}
            autoCapitalize="none"
          />
          <Pressable
            style={styles.eyeBtn}
            onPress={() => setShowNew((v) => !v)}
            accessibilityLabel={showNew ? t("profile.hideNew") : t("profile.showNew")}
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
            placeholder={t("profile.confirmPassword")}
            placeholderTextColor={colors.muted}
            secureTextEntry={!showConfirm}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoCapitalize="none"
          />
          <Pressable
            style={styles.eyeBtn}
            onPress={() => setShowConfirm((v) => !v)}
            accessibilityLabel={showConfirm ? t("profile.hideConfirm") : t("profile.showConfirm")}
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
          <Text style={styles.saveBtnText}>{saving ? t("common.saving") : t("profile.savePassword")}</Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryBtn, sendingCode && styles.saveBtnDisabled]}
          onPress={handleResetByEmailCode}
          disabled={sendingCode}
        >
          <Ionicons name="mail-outline" size={17} color={colors.primaryDark} />
          <Text style={styles.secondaryBtnText}>{sendingCode ? t("common.saving") : t("profile.resetByCode")}</Text>
        </Pressable>
      </View>

      {/* Accesos rápidos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("profile.quickAccess")}</Text>

        <Pressable style={styles.linkRow} onPress={() => router.push("/favorites")}>
          <View style={[styles.linkIcon, { backgroundColor: colors.dangerSoft }]}>
            <Ionicons name="heart" size={17} color={colors.danger} />
          </View>
          <Text style={styles.linkText}>{t("profile.favoriteProducts")}</Text>
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
    justifyContent: "center",
    overflow: "hidden"
  },
  avatarImage: {
    width: "100%",
    height: "100%"
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
  editableGrid: {
    gap: 10
  },
  editableField: {
    gap: 6
  },
  inputLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  profileInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingVertical: 12
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
  secondaryBtn: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 2
  },
  secondaryBtnText: {
    color: colors.primaryDark,
    fontWeight: "800",
    fontSize: 14
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
